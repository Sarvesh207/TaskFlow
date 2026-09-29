import { describe, expect, test } from "bun:test";
import { registerAndLogin } from "../helpers/factories";
import { useTestServer } from "./setup";

const ctx = useTestServer();

describe("error contract (ERRORS.md)", () => {
  test("malformed JSON -> 400 INVALID_JSON", async () => {
    const res = await ctx.anon().request("POST", "/auth/login", undefined, { rawBody: '{"email": "a@b.co",}' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_JSON");
  });

  test("unknown route -> 404 ROUTE_NOT_FOUND in the JSON envelope", async () => {
    const res = await ctx.anon().get("/nope");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, code: "ROUTE_NOT_FOUND", data: null });
  });

  test("a bad UUID in the path -> 400 with a field error", async () => {
    const user = await registerAndLogin(ctx.baseUrl, "Pathy");
    const res = await user.client.get("/projects/not-a-uuid");
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toHaveProperty("id");
  });

  test("unknown body fields are rejected by name", async () => {
    const user = await registerAndLogin(ctx.baseUrl, "Strict");
    const res = await user.client.post("/projects", { name: "Ok", owner_id: user.id });
    expect(res.status).toBe(422);
    expect(res.body.fieldErrors).toHaveProperty("owner_id");
  });

  test("every error carries a requestId that matches the X-Request-Id header", async () => {
    const res = await ctx.anon().get("/projects");
    expect(res.body.requestId).toBeString();
    expect(res.headers.get("x-request-id")).toBe(res.body.requestId!);
  });

  test("a client-supplied X-Request-Id is echoed back", async () => {
    const res = await ctx.anon().request("GET", "/projects", undefined, { headers: { "X-Request-Id": "trace-123" } });
    expect(res.body.requestId).toBe("trace-123");
  });

  test("success responses use the documented envelope", async () => {
    const user = await registerAndLogin(ctx.baseUrl, "Happy");
    const res = await user.client.get("/projects");
    expect(res.body).toMatchObject({ success: true, statusCode: 200, data: [] });
    expect(res.body.message).toBeString();
  });
});
