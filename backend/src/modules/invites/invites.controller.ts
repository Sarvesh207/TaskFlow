import type { Request, Response } from "express";
import { requireUserId, validatedBody, validatedParams } from "../../middleware";
import { ApiResponse } from "../../utils";
import type { ProjectScopedParam } from "../projects/project.schema";
import type { CreateInviteInput, InviteParams, InviteTokenParam } from "./invites.schema";
import {
  acceptInviteService,
  createInviteService,
  listInvitesService,
  previewInviteService,
  resendInviteService,
  revokeInviteService,
} from "./invites.service";

// Params and bodies are validated by `validate()` on the routes.

export async function createInvite(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId } = validatedParams<ProjectScopedParam>(req);
  const body = validatedBody<CreateInviteInput>(req);

  const invite = await createInviteService(projectId, userId, body);
  return res.status(201).json(new ApiResponse(201, invite, "Invite sent"));
}

export async function listInvites(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId } = validatedParams<ProjectScopedParam>(req);

  const invites = await listInvitesService(projectId, userId);
  return res.status(200).json(new ApiResponse(200, invites, "Invites fetched successfully"));
}

export async function resendInvite(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId, inviteId } = validatedParams<InviteParams>(req);

  const invite = await resendInviteService(projectId, inviteId, userId);
  return res.status(200).json(new ApiResponse(200, invite, "Invite resent"));
}

export async function revokeInvite(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId, inviteId } = validatedParams<InviteParams>(req);

  await revokeInviteService(projectId, inviteId, userId);
  return res.status(200).json(new ApiResponse(200, null, "Invite cancelled"));
}

export async function previewInvite(req: Request, res: Response) {
  const { token } = validatedParams<InviteTokenParam>(req);

  const invite = await previewInviteService(token);
  return res.status(200).json(new ApiResponse(200, invite, "Invite fetched successfully"));
}

export async function acceptInvite(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { token } = validatedParams<InviteTokenParam>(req);

  const result = await acceptInviteService(token, userId);
  return res.status(200).json(new ApiResponse(200, result, "Invite accepted"));
}
