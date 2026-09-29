import { describe, expect, mock, test } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireUserId } from "../../middleware/validate.middleware";
import { generateAccessToken } from "../../utils/jwt";
import { comparePassword, hashPassword } from "../../utils/password";

const USER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const secret = process.env.JWT_SECRET!;

function run(token?: string) {
  const req = { cookies: token === undefined ? {} : { accessToken: token } } as unknown as Request;
  const next = mock(() => {}) as unknown as NextFunction;
  let error: unknown;
  try {
    requireAuth(req, {} as Response, next);
  } catch (e) {
    error = e;
  }
  return { req, next, error };
}

describe("generateAccessToken", () => {
  test("signs { sub, type: 'access' } expiring in one day", () => {
    const payload = jwt.verify(generateAccessToken(USER_ID), secret) as jwt.JwtPayload;
    expect(payload.sub).toBe(USER_ID);
    expect(payload.type).toBe("access");
    expect(payload.exp! - payload.iat!).toBe(24 * 60 * 60);
  });
});

describe("requireAuth", () => {
  test("a valid token sets req.userId and continues", () => {
    const { req, next, error } = run(generateAccessToken(USER_ID));
    expect(error).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe(USER_ID);
  });

  test("no cookie -> 401 UNAUTHORIZED", () => {
    expect(run().error).toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" });
  });

  test("expired token -> 401 TOKEN_EXPIRED", () => {
    const expired = jwt.sign({ sub: USER_ID, type: "access" }, secret, { expiresIn: -10 });
    expect(run(expired).error).toMatchObject({ statusCode: 401, code: "TOKEN_EXPIRED" });
  });

  test("tampered token -> 401 INVALID_TOKEN", () => {
    const forged = jwt.sign({ sub: USER_ID, type: "access" }, "not-the-secret");
    expect(run(forged).error).toMatchObject({ statusCode: 401, code: "INVALID_TOKEN" });
  });
});

describe("requireUserId", () => {
  test("returns a well-formed id", () => {
    expect(requireUserId({ userId: USER_ID } as Request)).toBe(USER_ID);
  });

  test("rejects a missing or malformed id as INVALID_TOKEN", () => {
    expect(() => requireUserId({} as Request)).toThrow();
    expect(() => requireUserId({ userId: "not-a-uuid" } as Request)).toThrow(
      expect.objectContaining({ code: "INVALID_TOKEN" }),
    );
  });
});

describe("password hashing", () => {
  test("hash verifies against the original only", async () => {
    const hash = await hashPassword("Passw0rd!");
    expect(hash).not.toBe("Passw0rd!");
    expect(await comparePassword("Passw0rd!", hash)).toBe(true);
    expect(await comparePassword("wrong", hash)).toBe(false);
  });
});
