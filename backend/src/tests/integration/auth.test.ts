import { describe, expect, test } from "bun:test";
import { PASSWORD, registerAndLogin } from "../helpers/factories";
import { useTestServer } from "./setup";

const ctx = useTestServer();

describe("auth", () => {
  test("register returns the user without secrets", async () => {
    const res = await ctx.anon().post("/auth/register", {
      email: "Jane@Example.com",
      full_name: "Jane Doe",
      password: PASSWORD,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: "jane@example.com", full_name: "Jane Doe" });
    expect(res.body.data).not.toHaveProperty("password_hash");
  });

  test("duplicate email -> 409 ALREADY_EXISTS with a field error", async () => {
    const body = { email: "dup@example.com", full_name: "Dup", password: PASSWORD };
    await ctx.anon().post("/auth/register", body);
    const res = await ctx.anon().post("/auth/register", body);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ALREADY_EXISTS");
    expect(res.body.fieldErrors?.email).toHaveLength(1);
  });

  test("weak password -> 422 with a password field error", async () => {
    const res = await ctx.anon().post("/auth/register", { email: "w@example.com", full_name: "W", password: "weak" });
    expect(res.status).toBe(422);
    expect(res.body.fieldErrors).toHaveProperty("password");
    expect(res.body.fieldErrors).toHaveProperty("full_name");
  });

  test("login sets an httpOnly accessToken cookie", async () => {
    const client = ctx.anon();
    await client.post("/auth/register", { email: "c@example.com", full_name: "Cookie", password: PASSWORD });
    const res = await client.post("/auth/login", { email: "c@example.com", password: PASSWORD });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("accessToken=");
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
  });

  test("wrong password -> 401 INVALID_CREDENTIALS", async () => {
    const user = await registerAndLogin(ctx.baseUrl, "Pat");
    const res = await ctx.anon().post("/auth/login", { email: user.email, password: "Wrong1!" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  test("unknown email gets the same response as a wrong password", async () => {
    const res = await ctx.anon().post("/auth/login", { email: "ghost@example.com", password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  test("/me returns the signed-in user", async () => {
    const user = await registerAndLogin(ctx.baseUrl, "Me Myself");
    const res = await user.client.get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: user.id, email: user.email, full_name: "Me Myself" });
  });

  test("logout clears the cookie and ends the session", async () => {
    const user = await registerAndLogin(ctx.baseUrl, "Leaving");
    await user.client.post("/auth/logout");
    expect(user.client.isAuthenticated).toBe(false);
    const res = await user.client.get("/auth/me");
    expect(res.status).toBe(401);
  });

  test("protected routes without a cookie -> 401 UNAUTHORIZED", async () => {
    for (const path of ["/auth/me", "/projects", "/users"]) {
      const res = await ctx.anon().get(path);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHORIZED");
    }
  });

  test("a forged cookie -> 401 INVALID_TOKEN", async () => {
    const client = ctx.anon();
    client.setCookie("accessToken", "not.a.jwt");
    const res = await client.get("/projects");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_TOKEN");
  });
});
