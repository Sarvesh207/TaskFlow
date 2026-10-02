import { randomBytes, timingSafeEqual } from "node:crypto";
import type { UserRegisterInput, UserLoginInput } from "./auth.schema";
import { ApiError, ErrorCode } from "../../utils";
import {
  findUserByEmail,
  createUser,
  findUserById,
  findUserByGoogleId,
  linkGoogleId,
  createGoogleUser,
} from "./auth.repository";
import { comparePassword, hashPassword } from "../../utils/password";
import {
  generateAccessToken,
  signOAuthState,
  verifyOAuthState,
  type OAuthState,
} from "../../utils/jwt";
import {
  buildGoogleAuthUrl,
  createPkcePair,
  exchangeGoogleCode,
  type GoogleProfile,
} from "./google";

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

  // Google-only accounts have no password; answer exactly like a wrong one.
  if (!user || !user.password_hash) {
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

/** A same-app path to land on after sign-in; anything else becomes "/". */
export function safeNext(next: unknown): string {
  return typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/\\")
    ? next
    : "/";
}

function googleAuthFailed(message = "Google sign-in failed") {
  return new ApiError(401, message, [], {
    code: ErrorCode.GOOGLE_AUTH_FAILED,
  });
}

/**
 * Step 1 of the OAuth flow: the Google consent URL, plus the signed cookie
 * that carries `state` and the PKCE verifier to the callback.
 */
export async function startGoogleAuthService(next: unknown, mode: unknown) {
  const state = randomBytes(32).toString("base64url");
  const { codeVerifier, codeChallenge } = await createPkcePair();

  return {
    url: buildGoogleAuthUrl(state, codeChallenge),
    stateCookie: signOAuthState({
      state,
      codeVerifier,
      next: safeNext(next),
      popup: mode === "popup",
    }),
  };
}

/** The verified state cookie, or null when it is missing, forged or expired. */
export function readGoogleAuthState(stateCookie: string | undefined) {
  return verifyOAuthState(stateCookie);
}

export interface GoogleCallbackInput {
  code?: unknown;
  state?: unknown;
  error?: unknown;
}

/**
 * Step 2: check `state` against the cookie, exchange the code, and sign the
 * Google account in - linking or creating the TaskFlow user as needed.
 */
export async function completeGoogleAuthService(
  query: GoogleCallbackInput,
  saved: OAuthState | null,
) {
  // The user pressed "Cancel" on Google's screen, or Google refused.
  if (query.error) {
    throw googleAuthFailed("Google sign-in was cancelled");
  }

  if (
    !saved ||
    typeof query.code !== "string" ||
    typeof query.state !== "string" ||
    !sameString(query.state, saved.state)
  ) {
    throw googleAuthFailed();
  }

  let profile: GoogleProfile;
  try {
    profile = await exchangeGoogleCode(query.code, saved.codeVerifier);
  } catch {
    throw googleAuthFailed();
  }

  const user = await findOrCreateGoogleUser(profile);

  return {
    accessToken: generateAccessToken(user.id),
    user,
  };
}

async function findOrCreateGoogleUser(profile: GoogleProfile) {
  const linked = await findUserByGoogleId(profile.sub);
  if (linked) return linked;

  // Without a verified address we cannot tell the account owner from someone
  // who merely typed their email into a Google account.
  if (!profile.email_verified) {
    throw new ApiError(403, "Your Google email address is not verified", [], {
      code: ErrorCode.GOOGLE_EMAIL_UNVERIFIED,
    });
  }

  const existing = await findUserByEmail(profile.email);
  if (existing) {
    if (existing.google_id) {
      // Same email, but already tied to a different Google account.
      throw googleAuthFailed("This email is linked to another Google account");
    }
    return linkGoogleId(existing.id, profile.sub);
  }

  return createGoogleUser({
    email: profile.email,
    full_name: profile.name.slice(0, 100),
    google_id: profile.sub,
    avatar_url: profile.picture,
  });
}

function sameString(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function getUserById(userId: string) {
  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
}
