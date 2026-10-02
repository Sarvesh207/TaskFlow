import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRateLimiter, errorMiddleware } from "../../middleware";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.get("/limited", createRateLimiter({ windowMs: 60_000, max: 3 }), (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/open", (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorMiddleware);

  server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe("createRateLimiter", () => {
  test("allows the limit, then answers 429 TOO_MANY_REQUESTS in the standard envelope", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await fetch(`${baseUrl}/limited`)).status).toBe(200);
    }

    const blocked = await fetch(`${baseUrl}/limited`);
    const body = await blocked.json();

    expect(blocked.status).toBe(429);
    expect(body).toMatchObject({ success: false, statusCode: 429, code: "TOO_MANY_REQUESTS" });
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  test("only throttles the routes it is attached to", async () => {
    for (let i = 0; i < 6; i++) {
      expect((await fetch(`${baseUrl}/open`)).status).toBe(200);
    }
  });
});
