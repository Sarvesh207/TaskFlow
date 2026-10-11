import prisma from "../../db/prisma";
import type { member_role } from "../../generated/prisma/enums";

/** What the project's owners and admins see about an invite. Never the token hash. */
const inviteSelect = {
  id: true,
  project_id: true,
  email: true,
  role: true,
  expires_at: true,
  created_at: true,
  inviter: { select: { id: true, full_name: true } },
} as const;

/** "Open" = neither accepted nor revoked. It may still have expired. */
const open = { accepted_at: null, revoked_at: null } as const;

export async function createInvite(data: {
  project_id: string;
  email: string;
  role: member_role;
  token_hash: string;
  invited_by: string;
  expires_at: Date;
}) {
  return prisma.project_invites.create({
    data,
    select: { ...inviteSelect, projects: { select: { name: true } } },
  });
}

export async function findOpenInviteByEmail(projectId: string, email: string) {
  return prisma.project_invites.findFirst({
    where: { project_id: projectId, email, ...open },
    select: { id: true, expires_at: true },
  });
}

export async function findOpenInviteById(projectId: string, inviteId: string) {
  return prisma.project_invites.findFirst({
    where: { id: inviteId, project_id: projectId, ...open },
    select: { ...inviteSelect, projects: { select: { name: true } } },
  });
}

/** Open invites that have not expired yet, newest first. */
export async function listOpenInvites(projectId: string) {
  return prisma.project_invites.findMany({
    where: { project_id: projectId, ...open, expires_at: { gt: new Date() } },
    select: inviteSelect,
    orderBy: { created_at: "desc" },
  });
}

export async function findInviteByTokenHash(tokenHash: string) {
  return prisma.project_invites.findUnique({
    where: { token_hash: tokenHash },
    select: {
      id: true,
      project_id: true,
      email: true,
      role: true,
      expires_at: true,
      accepted_at: true,
      accepted_by: true,
      revoked_at: true,
      projects: { select: { id: true, name: true, owner_id: true } },
      inviter: { select: { full_name: true } },
    },
  });
}

export async function rotateInviteToken(inviteId: string, tokenHash: string, expiresAt: Date) {
  return prisma.project_invites.update({
    where: { id: inviteId },
    data: { token_hash: tokenHash, expires_at: expiresAt },
    select: inviteSelect,
  });
}

export async function revokeInvite(inviteId: string) {
  await prisma.project_invites.update({
    where: { id: inviteId },
    data: { revoked_at: new Date() },
  });
}

/** Removes an invite whose email could not be sent, so it does not block a retry. */
export async function deleteInvite(inviteId: string) {
  await prisma.project_invites.delete({ where: { id: inviteId } });
}

/** True when this email belongs to the project's owner or one of its members. */
export async function isEmailOnProject(projectId: string, email: string) {
  const count = await prisma.users.count({
    where: {
      email: { equals: email, mode: "insensitive" },
      OR: [
        { projects: { some: { id: projectId } } },
        { project_members: { some: { project_id: projectId } } },
      ],
    },
  });
  return count > 0;
}

export async function findUserEmail(userId: string) {
  return prisma.users.findUnique({ where: { id: userId }, select: { email: true } });
}

/**
 * Marks the invite accepted and adds the membership in one transaction. The
 * conditional update makes a double accept (two tabs, a retry) a no-op instead
 * of an error.
 */
export async function acceptInvite(invite: {
  id: string;
  project_id: string;
  role: member_role;
  ownerId: string;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const marked = await tx.project_invites.updateMany({
      where: { id: invite.id, ...open },
      data: { accepted_at: new Date(), accepted_by: invite.userId },
    });
    if (marked.count === 0) return;

    if (invite.userId === invite.ownerId) return;
    await tx.project_members.upsert({
      where: { project_id_user_id: { project_id: invite.project_id, user_id: invite.userId } },
      // Already a member: keep their current role rather than changing it.
      update: {},
      create: { project_id: invite.project_id, user_id: invite.userId, role: invite.role },
    });
  });
}
