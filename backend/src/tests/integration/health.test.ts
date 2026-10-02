import { describe, expect, test } from "bun:test";
import { useTestServer } from "./setup";

const ctx = useTestServer();

describe("GET /health (liveness)", () => {
  test("is public and answers ok", async () => {
    const res = await ctx.anon().get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: "ok" } });
    expect(res.body.data).not.toHaveProperty("database");
  });
});

describe("GET /health/db (readiness)", () => {
  test("is public and reports the database as up", async () => {
    const res = await ctx.anon().get("/health/db");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { status: "ok", database: "up" },
    });
  });
});

describe("CORS", () => {
  const preflight = (origin: string) =>
    fetch(`${ctx.baseUrl}/auth/login`, {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "POST" },
    });

  test("allows the configured origin with credentials", async () => {
    const res = await preflight("http://localhost:5173");

    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test("does not allow any other origin", async () => {
    const res = await preflight("https://evil.example.com");

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
