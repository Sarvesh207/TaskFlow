import { Router } from "express";
import { inviteRateLimiter, requireAuth, validate } from "../../middleware";
import { acceptInvite, previewInvite } from "./invites.controller";
import { inviteTokenParamSchema } from "./invites.schema";

/**
 * The recipient's side of an invite, addressed by the token from the emailed
 * link. Managing a project's invites lives under /projects/:projectId/invites.
 */
const router = Router();

// Public: the invite page shows who invited you to what before you sign in.
router.get("/:token", inviteRateLimiter, validate({ params: inviteTokenParamSchema }), previewInvite);

router.post(
  "/:token/accept",
  inviteRateLimiter,
  requireAuth,
  validate({ params: inviteTokenParamSchema }),
  acceptInvite,
);

export default router;
