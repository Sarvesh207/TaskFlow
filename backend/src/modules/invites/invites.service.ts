import { createHash, randomBytes } from "node:crypto";
import { ApiError, ErrorCode } from "../../utils";
import { requireProjectRole } from "../../utils/project-member.authorization";
import {
  acceptInvite,
  createInvite,
  deleteInvite,
  findInviteByTokenHash,
  findOpenInviteByEmail,
  findOpenInviteById,
  findUserEmail,
  isEmailOnProject,
  listOpenInvites,
  revokeInvite,
  rotateInviteToken,
} from "./invites.repository";
import type { CreateInviteInput } from "./invites.schema";
import { sendInviteEmail } from "./mailer";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MANAGERS = ["owner", "admin"] as const;

export type InviteStatus = "pending" | "expired" | "revoked" | "accepted";

/** Only the SHA-256 of a token is stored; the token itself exists only in the emailed link. */
export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInviteToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) };
}

function inviteLink(token: string) {
  const base = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
  return `${base}/invite/${token}`;
}

/** Sends the email; any failure becomes a 502 the client can show and retry. */
async function deliver(
  invite: { email: string; role: string; projects: { name: string }; inviter: { full_name: string } },
  token: string,
) {
  try {
    await sendInviteEmail({
      to: invite.email,
      projectName: invite.projects.name,
      inviterName: invite.inviter.full_name,
      role: invite.role === "admin" ? "admin" : "member",
      link: inviteLink(token),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Invite email failed", error);
    throw new ApiError(502, "The invite email could not be sent. Please try again.", [], {
      code: ErrorCode.EMAIL_FAILED,
    });
  }
}

function notFound() {
  return new ApiError(404, "Invite not found", [], { code: ErrorCode.NOT_FOUND });
}

// ---------------------------------------------------------- owners and admins

export async function createInviteService(projectId: string, userId: string, input: CreateInviteInput) {
  await requireProjectRole(projectId, userId, [...MANAGERS]);

  if (await isEmailOnProject(projectId, input.email)) {
    const message = "This person is already on the project";
    throw new ApiError(409, message, [], { code: ErrorCode.ALREADY_MEMBER, fieldErrors: { email: [message] } });
  }

  const existing = await findOpenInviteByEmail(projectId, input.email);
  if (existing && existing.expires_at > new Date()) {
    const message = "This email already has a pending invite. Resend it from the pending invites list.";
    throw new ApiError(409, message, [], { code: ErrorCode.ALREADY_EXISTS, fieldErrors: { email: [message] } });
  }
  // An expired invite would still hold the "one open invite per email" slot.
  if (existing) await revokeInvite(existing.id);

  const { token, tokenHash, expiresAt } = newToken();
  const invite = await createInvite({
    project_id: projectId,
    email: input.email,
    role: input.role,
    token_hash: tokenHash,
    invited_by: userId,
    expires_at: expiresAt,
  });

  try {
    await deliver(invite, token);
  } catch (error) {
    // Nobody received the link, so don't leave an invite that blocks a retry.
    await deleteInvite(invite.id);
    throw error;
  }

  const { projects: _project, ...publicInvite } = invite;
  return publicInvite;
}

export async function listInvitesService(projectId: string, userId: string) {
  await requireProjectRole(projectId, userId, [...MANAGERS]);
  return listOpenInvites(projectId);
}

/** Issues a fresh link (the old one stops working) and a fresh 7 days, then emails it. */
export async function resendInviteService(projectId: string, inviteId: string, userId: string) {
  await requireProjectRole(projectId, userId, [...MANAGERS]);

  const invite = await findOpenInviteById(projectId, inviteId);
  if (!invite) throw notFound();

  const { token, tokenHash, expiresAt } = newToken();
  const updated = await rotateInviteToken(invite.id, tokenHash, expiresAt);
  await deliver(invite, token);
  return updated;
}

export async function revokeInviteService(projectId: string, inviteId: string, userId: string) {
  await requireProjectRole(projectId, userId, [...MANAGERS]);

  const invite = await findOpenInviteById(projectId, inviteId);
  if (!invite) throw notFound();
  await revokeInvite(invite.id);
}

// ------------------------------------------------------------- the recipient

function statusOf(invite: { accepted_at: Date | null; revoked_at: Date | null; expires_at: Date }): InviteStatus {
  if (invite.accepted_at) return "accepted";
  if (invite.revoked_at) return "revoked";
  if (invite.expires_at <= new Date()) return "expired";
  return "pending";
}

async function findByToken(token: string) {
  const invite = await findInviteByTokenHash(hashInviteToken(token));
  if (!invite) {
    throw new ApiError(404, "This invite link is not valid", [], { code: ErrorCode.NOT_FOUND });
  }
  return invite;
}

/**
 * Public: what the invite page shows before anyone signs in. Holding the link
 * is what grants access to these few details.
 */
export async function previewInviteService(token: string) {
  const invite = await findByToken(token);
  return {
    project: { id: invite.projects.id, name: invite.projects.name },
    inviter: { full_name: invite.inviter.full_name },
    email: invite.email,
    role: invite.role,
    status: statusOf(invite),
    expires_at: invite.expires_at,
  };
}

export async function acceptInviteService(token: string, userId: string) {
  const invite = await findByToken(token);
  const status = statusOf(invite);

  // Accepting twice (a second tab, a retry) just leads to the project again.
  if (status === "accepted" && invite.accepted_by === userId) return { project_id: invite.project_id };
  if (status === "accepted" || status === "revoked") {
    throw new ApiError(410, "This invite has already been used or was cancelled", [], {
      code: ErrorCode.INVITE_INVALID,
    });
  }
  if (status === "expired") {
    throw new ApiError(410, "This invite has expired. Ask for a new one.", [], {
      code: ErrorCode.INVITE_EXPIRED,
    });
  }

  const user = await findUserEmail(userId);
  if (!user) throw new ApiError(401, "Please sign in again", [], { code: ErrorCode.INVALID_TOKEN });
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new ApiError(403, `This invite was sent to ${invite.email}. Sign in with that email to accept it.`, [], {
      code: ErrorCode.INVITE_EMAIL_MISMATCH,
    });
  }

  await acceptInvite({
    id: invite.id,
    project_id: invite.project_id,
    role: invite.role,
    ownerId: invite.projects.owner_id,
    userId,
  });
  return { project_id: invite.project_id };
}
