import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import { ApiError, ErrorCode } from "../../utils";

/**
 * Everything that talks to Google lives here, so tests can replace this one
 * module with `mock.module` and never reach the network.
 */

export interface GoogleProfile {
  /** Google's stable account id (the ID token `sub`). */
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string | null;
}

let client: OAuth2Client | undefined;

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new ApiError(503, "Google sign-in is not configured", [], {
      code: ErrorCode.SERVICE_UNAVAILABLE,
    });
  }

  return { clientId, clientSecret, redirectUri };
}

function getClient() {
  const config = getConfig();
  client ??= new OAuth2Client(config);
  return client;
}

/** A fresh PKCE pair: the verifier stays with us, the challenge goes to Google. */
export async function createPkcePair() {
  const { codeVerifier, codeChallenge } =
    await getClient().generateCodeVerifierAsync();

  return { codeVerifier, codeChallenge: codeChallenge! };
}

export function buildGoogleAuthUrl(state: string, codeChallenge: string) {
  return getClient().generateAuthUrl({
    scope: ["openid", "email", "profile"],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: "select_account",
  });
}

/**
 * Swap the authorization code for tokens and return the verified identity
 * from the ID token. Throws on any failure; the caller maps it to an ApiError.
 */
export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string,
): Promise<GoogleProfile> {
  const google = getClient();
  const { tokens } = await google.getToken({ code, codeVerifier });

  if (!tokens.id_token) {
    throw new Error("Google did not return an ID token");
  }

  const ticket = await google.verifyIdToken({
    idToken: tokens.id_token,
    audience: getConfig().clientId,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new Error("Google ID token is missing sub or email");
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    email_verified: payload.email_verified === true,
    name: payload.name?.trim() || payload.email.split("@")[0]!,
    picture: payload.picture ?? null,
  };
}
