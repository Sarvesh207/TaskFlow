import type { Response, Request } from "express";
import {
  getAllUsers as getAllUsersService,
  getUser as getUserService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
} from "./users.service";
import { ApiResponse } from "../../utils";
import { requireUserId, validatedBody, validatedParams } from "../../middleware";
import type { UpdateUserInput, UserIdParam } from "./users.schema";

// Params and bodies are validated by `validate()` in users.routes.ts.

export async function getAllUsers(req: Request, res: Response) {
  const users = await getAllUsersService();

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
}

export async function getUserById(req: Request, res: Response) {
  const { id } = validatedParams<UserIdParam>(req);

  const user = await getUserService(id);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
}

export async function updateUser(req: Request, res: Response) {
  const reqUserId = requireUserId(req);
  const { id } = validatedParams<UserIdParam>(req);
  const body = validatedBody<UpdateUserInput>(req);

  const user = await updateUserService(reqUserId, id, body);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User updated successfully."));
}

export async function deleteUser(req: Request, res: Response) {
  const reqUserId = requireUserId(req);
  const { id } = validatedParams<UserIdParam>(req);

  await deleteUserService(reqUserId, id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "User deleted successfully"));
}
