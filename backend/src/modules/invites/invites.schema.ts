import z from "zod";
import { uuidParam } from "../../types/global.types";

const INVITE_ROLES = ["admin", "member"] as const;

// ---------------------------------------------------------------- body schemas

const createInviteSchema = z
  .object({
    email: z
      .string("Email is required")
      .trim()
      .toLowerCase()
      .email("Enter a valid email address")
      .max(254, "Email must be at most 254 characters"),
    role: z
      .enum(INVITE_ROLES, `Role must be one of: ${INVITE_ROLES.join(", ")}`)
      .default("member"),
  })
  .strict();

// -------------------------------------------------------------- param schemas
// Keys must match the route parameter names in projects.routes.ts / invites.routes.ts.

const inviteParamsSchema = z.object({
  projectId: uuidParam("projectId"),
  inviteId: uuidParam("inviteId"),
});

/** 32 random bytes, base64url-encoded: always 43 characters. */
const inviteTokenParamSchema = z.object({
  token: z
    .string("Invite link is invalid")
    .regex(/^[A-Za-z0-9_-]{43}$/, "Invite link is invalid"),
});

type CreateInviteInput = z.infer<typeof createInviteSchema>;
type InviteParams = z.infer<typeof inviteParamsSchema>;
type InviteTokenParam = z.infer<typeof inviteTokenParamSchema>;

export { createInviteSchema, inviteParamsSchema, inviteTokenParamSchema };
export type { CreateInviteInput, InviteParams, InviteTokenParam };
