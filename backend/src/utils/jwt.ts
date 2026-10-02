import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (JWT_SECRET === undefined) {
  throw new Error("JWT_SECRET is not defined");
}

const secret: string = JWT_SECRET;
export function generateAccessToken(userId: string) {
  return jwt.sign(
    {
      sub: userId,
      type: "access",
    },
    secret,
    {
      expiresIn: "1d",
    },
  );
}

/** What we remember between the redirect to Google and the callback. */
export interface OAuthState {
  state: string;
  codeVerifier: string;
  next: string;
  /** Started from a popup window: the callback hands off to /auth/google/done. */
  popup: boolean;
}

// A separate audience so a state cookie can never pass for an access token.
const OAUTH_STATE_AUDIENCE = "oauth-state";

export function signOAuthState(data: OAuthState) {
  return jwt.sign({ ...data }, secret, {
    audience: OAUTH_STATE_AUDIENCE,
    expiresIn: "10m",
  });
}

/** Returns null when the cookie is missing, tampered with, or expired. */
export function verifyOAuthState(token: string | undefined): OAuthState | null {
  if (!token) return null;

  try {
    const payload = jwt.verify(token, secret, {
      audience: OAUTH_STATE_AUDIENCE,
    }) as jwt.JwtPayload & Partial<OAuthState>;

    if (!payload.state || !payload.codeVerifier || !payload.next) return null;

    return {
      state: payload.state,
      codeVerifier: payload.codeVerifier,
      next: payload.next,
      popup: payload.popup === true,
    };
  } catch {
    return null;
  }
}
