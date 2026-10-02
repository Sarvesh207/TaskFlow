/**
 * Google sign-in (OAuth 2.0 Authorization Code + PKCE) end to end, with only
 * the call to Google's token endpoint replaced: the real routes, state cookie,
 * PKCE generation, user linking and session cookie all run.
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";
import * as realGoogle from "../../modules/auth/google";
import type { GoogleProfile } from "../../modules/auth/google";
import type { TestClient } from "../helpers/client";
import { PASSWORD, registerAndLogin } from "../helpers/factories";
import { useTestServer } from "./setup";

let profile: GoogleProfile;
const exchangeGoogleCode = mock(async (_code: string, _verifier: string) => profile);

// Copy the real exports before the mock patches the module in place.
const { createPkcePair, buildGoogleAuthUrl } = realGoogle;
mock.module("../../modules/auth/google", () => ({ createPkcePair, buildGoogleAuthUrl, exchangeGoogleCode }));

const ctx = useTestServer();
const FRONTEND = "http://localhost:5173";

beforeEach(() => {
  exchangeGoogleCode.mockClear();
  exchangeGoogleCode.mockImplementation(async () => profile);
  profile = {
    sub: "google-sub-1",
    email: "gina@example.com",
    email_verified: true,
    name: "Gina Google",
    picture: "https://lh3.googleusercontent.com/a/gina",
  };
});

/** Run the whole flow in one client: start → (Google) → callback. */
async function signInWithGoogle(client: TestClient, next = "/projects") {
  const start = await client.navigate(`/auth/google?next=${encodeURIComponent(next)}`);
  const state = new URL(start.location!).searchParams.get("state")!;
  return client.navigate(`/auth/google/callback?code=auth-code&state=${state}`);
}

describe("GET /auth/google", () => {
  test("redirects to Google with PKCE and sets a Lax state cookie", async () => {
    const res = await ctx.anon().navigate("/auth/google?next=/projects");

    expect(res.status).toBe(302);
    const url = new URL(res.location!);
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe(process.env.GOOGLE_CLIENT_ID!);
    expect(url.searchParams.get("redirect_uri")).toBe(process.env.GOOGLE_REDIRECT_URI!);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("state")).toBeTruthy();

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("oauth_google=");
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\/api\/v1\/auth\/google/i);
  });

  test("each start gets its own state and challenge", async () => {
    const a = new URL((await ctx.anon().navigate("/auth/google")).location!);
    const b = new URL((await ctx.anon().navigate("/auth/google")).location!);
    expect(a.searchParams.get("state")).not.toBe(b.searchParams.get("state"));
    expect(a.searchParams.get("code_challenge")).not.toBe(b.searchParams.get("code_challenge"));
  });
});

describe("GET /auth/google/callback", () => {
  test("creates the user, sets the session cookie and lands on ?next=", async () => {
    const client = ctx.anon();
    const res = await signInWithGoogle(client, "/projects");

    expect(res.status).toBe(302);
    expect(res.location).toBe(`${FRONTEND}/projects`);
    expect(res.headers.get("set-cookie") ?? "").toMatch(/accessToken=.*SameSite=Strict/i);
    expect(client.isAuthenticated).toBe(true);
    expect(client.cookie("oauth_google")).toBeUndefined();

    // The PKCE verifier from the cookie is what reaches the token exchange.
    expect(exchangeGoogleCode).toHaveBeenCalledTimes(1);
    const [code, verifier] = exchangeGoogleCode.mock.calls[0]!;
    expect(code).toBe("auth-code");
    expect(verifier.length).toBeGreaterThanOrEqual(43);

    const me = await client.get("/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data).toMatchObject({ email: "gina@example.com", full_name: "Gina Google" });
    expect(me.body.data.profile.avatar_url).toBe(profile.picture);
    expect(me.body.data).not.toHaveProperty("password_hash");
    expect(me.body.data).not.toHaveProperty("google_id");
  });

  test("signing in again reuses the same account", async () => {
    const first = ctx.anon();
    await signInWithGoogle(first);
    const firstId = (await first.get("/auth/me")).body.data.id;

    const second = ctx.anon();
    await signInWithGoogle(second);
    expect((await second.get("/auth/me")).body.data.id).toBe(firstId);
  });

  test("links an existing password account with the same verified email", async () => {
    const existing = await registerAndLogin(ctx.baseUrl, "Gina");
    profile.email = existing.email;

    const client = ctx.anon();
    await signInWithGoogle(client);
    expect((await client.get("/auth/me")).body.data.id).toBe(existing.id);

    // The password still works after linking.
    const login = await ctx.anon().post("/auth/login", { email: existing.email, password: PASSWORD });
    expect(login.status).toBe(200);
  });

  test("an email already linked to another Google account is refused", async () => {
    await signInWithGoogle(ctx.anon());

    profile.sub = "google-sub-2";
    const client = ctx.anon();
    const res = await signInWithGoogle(client);
    expect(res.location).toBe(`${FRONTEND}/login?error=GOOGLE_AUTH_FAILED`);
    expect(client.isAuthenticated).toBe(false);
  });

  test("an unverified Google email is refused", async () => {
    profile.email_verified = false;
    const client = ctx.anon();
    const res = await signInWithGoogle(client);

    expect(res.location).toBe(`${FRONTEND}/login?error=GOOGLE_EMAIL_UNVERIFIED`);
    expect(client.isAuthenticated).toBe(false);
  });

  test("a state that does not match the cookie is refused", async () => {
    const client = ctx.anon();
    await client.navigate("/auth/google");
    const res = await client.navigate("/auth/google/callback?code=auth-code&state=forged");

    expect(res.location).toBe(`${FRONTEND}/login?error=GOOGLE_AUTH_FAILED`);
    expect(client.isAuthenticated).toBe(false);
    expect(exchangeGoogleCode).not.toHaveBeenCalled();
  });

  test("a callback without the state cookie is refused", async () => {
    const starter = ctx.anon();
    const start = await starter.navigate("/auth/google");
    const state = new URL(start.location!).searchParams.get("state")!;

    // A different browser (no cookie) replays the callback URL.
    const attacker = ctx.anon();
    const res = await attacker.navigate(`/auth/google/callback?code=auth-code&state=${state}`);
    expect(res.location).toBe(`${FRONTEND}/login?error=GOOGLE_AUTH_FAILED`);
    expect(attacker.isAuthenticated).toBe(false);
  });

  test("the state cookie is single-use", async () => {
    const client = ctx.anon();
    const start = await client.navigate("/auth/google");
    const state = new URL(start.location!).searchParams.get("state")!;
    await client.navigate(`/auth/google/callback?code=auth-code&state=${state}`);
    await client.post("/auth/logout");

    const replay = await client.navigate(`/auth/google/callback?code=auth-code&state=${state}`);
    expect(replay.location).toBe(`${FRONTEND}/login?error=GOOGLE_AUTH_FAILED`);
  });

  test("cancelling on Google's screen returns to login", async () => {
    const client = ctx.anon();
    const start = await client.navigate("/auth/google");
    const state = new URL(start.location!).searchParams.get("state")!;
    const res = await client.navigate(`/auth/google/callback?error=access_denied&state=${state}`);

    expect(res.location).toBe(`${FRONTEND}/login?error=GOOGLE_AUTH_FAILED`);
    expect(exchangeGoogleCode).not.toHaveBeenCalled();
  });

  test("a failed code exchange returns to login", async () => {
    exchangeGoogleCode.mockImplementation(async () => {
      throw new Error("invalid_grant");
    });
    const client = ctx.anon();
    const res = await signInWithGoogle(client);

    expect(res.location).toBe(`${FRONTEND}/login?error=GOOGLE_AUTH_FAILED`);
    expect(client.isAuthenticated).toBe(false);
  });

  test("an off-site ?next= is replaced with the dashboard", async () => {
    for (const next of ["//evil.example.com", "/\\evil.example.com", "https://evil.example.com"]) {
      const res = await signInWithGoogle(ctx.anon(), next);
      expect(res.location).toBe(`${FRONTEND}/`);
    }
  });
});

describe("popup mode (?mode=popup)", () => {
  async function popupSignIn(client: TestClient, next = "/projects") {
    const start = await client.navigate(`/auth/google?mode=popup&next=${encodeURIComponent(next)}`);
    const state = new URL(start.location!).searchParams.get("state")!;
    return client.navigate(`/auth/google/callback?code=auth-code&state=${state}`);
  }

  test("success lands on /auth/google/done with next, and sets the session", async () => {
    const client = ctx.anon();
    const res = await popupSignIn(client);

    expect(res.location).toBe(`${FRONTEND}/auth/google/done?next=%2Fprojects`);
    expect(client.isAuthenticated).toBe(true);
  });

  test("failure lands on /auth/google/done with the error code", async () => {
    profile.email_verified = false;
    const client = ctx.anon();
    const res = await popupSignIn(client);

    expect(res.location).toBe(`${FRONTEND}/auth/google/done?error=GOOGLE_EMAIL_UNVERIFIED`);
    expect(client.isAuthenticated).toBe(false);
  });

  test("an unconfigured server reports to the popup, not the login page", async () => {
    const saved = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    try {
      const res = await ctx.anon().navigate("/auth/google?mode=popup");
      expect(res.location).toMatch(/\/auth\/google\/done\?error=SERVICE_UNAVAILABLE$/);
    } finally {
      process.env.GOOGLE_CLIENT_ID = saved;
    }
  });
});

test("password login on a Google-only account -> 401 INVALID_CREDENTIALS", async () => {
  await signInWithGoogle(ctx.anon());
  const res = await ctx.anon().post("/auth/login", { email: profile.email, password: PASSWORD });
  expect(res.status).toBe(401);
  expect(res.body.code).toBe("INVALID_CREDENTIALS");
});
