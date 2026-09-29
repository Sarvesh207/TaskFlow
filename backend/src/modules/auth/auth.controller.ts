import type { Response, Request } from "express";
import { ApiResponse } from "../../utils";
import { requireUserId, validatedBody } from "../../middleware";
import type { UserRegisterInput, UserLoginInput } from "./auth.schema";

import {
  loginUserService,
  registerUserService,
  getUserById,
} from "./auth.service";

// Bodies are validated by `validate()` in auth.routes.ts.

export async function registerUser(req: Request, res: Response) {
  const body = validatedBody<UserRegisterInput>(req);

  const user = await registerUserService(body);

  return res
    .status(201)
    .json(new ApiResponse(201, user, "User registred successfully"));
}

export async function loginUser(req: Request, res: Response) {
  const body = validatedBody<UserLoginInput>(req);

  const { accessToken, user } = await loginUserService(body);

  // set http-only cookies

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User login successfully"));
}

export async function logoutUser(req: Request, res: Response) {
  res.clearCookie("accessToken");

  return res.status(200).json(new ApiResponse(200, null, "Logout successful"));
}

export async function getCurrentUser(req: Request, res: Response) {
  const userId = requireUserId(req);

  const user = await getUserById(userId);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Current user fetched successfully"));
}
