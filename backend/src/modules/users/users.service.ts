import {
  findAllUsers,
  findUser,
  updateUser as updateUserRepository,
  deleteUser as deleteUserRepository,
} from "./users.repository";
import { ApiError } from "../../utils";
import { z } from "zod";
import type { UpdateUserInput } from "./users.schema";

const userIdSchema = z.uuid();

export async function getAllUsers() {
  const users = await findAllUsers();

  if (!users) {
    throw new ApiError(404, "Users not found.");
  }

  return users;
}

export async function getUser(id: string) {
  const result = userIdSchema.safeParse(id);

  if (!result.success) {
    throw new ApiError(400, "Invalid user ID.");
  }
  const user = await findUser(id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return user;
}

/** Accounts are self-service: a user may only change or delete their own. */
function requireSelf(reqUserId: string, id: string) {
  if (reqUserId !== id) {
    throw ApiError.forbidden("You can only change your own account");
  }
}

export async function updateUser(reqUserId: string, id: string, data: UpdateUserInput) {
  requireSelf(reqUserId, id);

  const existingUser = await findUser(id);

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  return updateUserRepository(id, data);
}

export async function deleteUser(reqUserId: string, id: string) {
  requireSelf(reqUserId, id);

  const existingUser = await getUser(id);

  if (!existingUser) {
    throw new ApiError(404, "User is not found");
  }

  return deleteUserRepository(id);
}
