import type { UserRegisterInput, UserLoginInput } from "./auth.schema";
import { ApiError, ErrorCode } from "../../utils";
import { findUserByEmail, createUser, findUserById } from "./auth.repository";
import { comparePassword, hashPassword } from "../../utils/password";
import { generateAccessToken } from "../../utils/jwt";

async function getUserByEmail(email: string) {
  return findUserByEmail(email);
}

export async function registerUserService(data: UserRegisterInput) {
  const existingUser = await getUserByEmail(data.email);

  if (existingUser) {
    throw new ApiError(409, "This email is already registered", [], {
      code: ErrorCode.ALREADY_EXISTS,
      fieldErrors: { email: ["This email is already registered"] },
    });
  }

  const passwordHash = await hashPassword(data.password);

  const user = await createUser({
    email: data.email,
    full_name: data.full_name,
    password_hash: passwordHash,
  });

  return user;
}

export async function loginUserService(data: UserLoginInput) {
  const user = await getUserByEmail(data.email);

  if (!user) {
    throw new ApiError(401, "Invalid email or password", [], {
      code: ErrorCode.INVALID_CREDENTIALS,
    });
  }

  const isPasswordValid = await comparePassword(
    data.password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password", [], {
      code: ErrorCode.INVALID_CREDENTIALS,
    });
  }

  const accessToken = generateAccessToken(user.id);

  return {
    accessToken: accessToken,
    user: {
      id: user.id,
      email: user.email,
      fullname: user.full_name,
    },
  };
}

export async function getUserById(userId: string) {
  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}
