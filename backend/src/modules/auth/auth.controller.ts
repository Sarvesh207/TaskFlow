import type { Response, Request } from "express";
import { ApiResponse } from "../../utils";
import { requireUserId, validatedBody } from "../../middleware";
import type { UserRegisterInput, UserLoginInput } from "./auth.schema";

import {
  loginUserService,
  registerUserService,
  getUserById,
  startGoogleAuthService,
  completeGoogleAuthService,
  readGoogleAuthState,
} from "./auth.service";
import { ApiError, ErrorCode } from "../../utils";

// Bodies are validated by `validate()` in auth.routes.ts.

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function setAuthCookie(res: Response, accessToken: string) {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ONE_DAY_MS,
  });
}

// Holds `state` + PKCE verifier between the redirect to Google and the
// callback. Lax, not Strict: the callback is a top-level navigation from
// accounts.google.com, and a Strict cookie would not be sent on it.
const OAUTH_STATE_COOKIE = "oauth_google";
const oauthStateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/auth/google",
} as const;

function frontendUrl(path: string) {
  const base = process.env.FRONTEND_URL ?? "http://localhost:5173";
  return new URL(path, base).toString();
}

function googleErrorCode(error: unknown) {
  if (!(error instanceof ApiError)) {
    console.error("Google sign-in failed", error);
  }

  return error instanceof ApiError ? error.code : ErrorCode.GOOGLE_AUTH_FAILED;
}

/**
 * Where the browser goes when the flow ends. The browser navigated here, so
 * this is a redirect, never JSON. A popup lands on /auth/google/done, which
 * reports to the tab that opened it and closes; a full-page flow goes
 * straight to `next`, or back to the login page on failure.
 */
function googleResultUrl(
  popup: boolean,
  result: { next: string } | { error: string },
) {
  if (popup) {
    const params = new URLSearchParams(result);
    return frontendUrl(`/auth/google/done?${params}`);
  }

  return "next" in result
    ? frontendUrl(result.next)
    : frontendUrl(`/login?error=${result.error}`);
}

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

  setAuthCookie(res, accessToken);

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User login successfully"));
}

export async function startGoogleAuth(req: Request, res: Response) {
  const popup = req.query.mode === "popup";

  try {
    const { url, stateCookie } = await startGoogleAuthService(
      req.query.next,
      req.query.mode,
    );

    res.cookie(OAUTH_STATE_COOKIE, stateCookie, {
      ...oauthStateCookieOptions,
      maxAge: 10 * 60 * 1000,
    });

    return res.redirect(302, url);
  } catch (error) {
    return res.redirect(
      302,
      googleResultUrl(popup, { error: googleErrorCode(error) }),
    );
  }
}

export async function googleAuthCallback(req: Request, res: Response) {
  const saved = readGoogleAuthState(req.cookies?.[OAUTH_STATE_COOKIE]);
  res.clearCookie(OAUTH_STATE_COOKIE, oauthStateCookieOptions);

  // Without a readable state cookie we cannot tell it was a popup, so the
  // error falls back to the login page (inside the popup, if it was one).
  const popup = saved?.popup ?? false;

  try {
    const { accessToken } = await completeGoogleAuthService(req.query, saved);

    setAuthCookie(res, accessToken);

    return res.redirect(302, googleResultUrl(popup, { next: saved!.next }));
  } catch (error) {
    return res.redirect(
      302,
      googleResultUrl(popup, { error: googleErrorCode(error) }),
    );
  }
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
