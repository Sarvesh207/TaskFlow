import { describe, expect, test } from "bun:test";
import { Prisma } from "../../generated/prisma/client";
import { handlePrismaError } from "../../utils/prisma-error";

function known(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("boom", { code, clientVersion: "test", meta });
}

describe("handlePrismaError", () => {
  test.each([
    ["P2000", 400, "BAD_REQUEST"],
    ["P2001", 404, "NOT_FOUND"],
    ["P2002", 409, "ALREADY_EXISTS"],
    ["P2003", 409, "CONFLICT"],
    ["P2011", 400, "BAD_REQUEST"],
    ["P2014", 409, "CONFLICT"],
    ["P2025", 404, "NOT_FOUND"],
  ])("%s -> %i %s", (code, status, errorCode) => {
    expect(handlePrismaError(known(code))).toMatchObject({ statusCode: status, code: errorCode });
  });

  test("names the offending field when Prisma reports it", () => {
    const err = handlePrismaError(known("P2002", { target: ["email"] }));
    expect(err?.fieldErrors).toEqual({ email: ['A record with this "email" already exists.'] });
  });

  test("unknown Prisma codes are left for the next handler", () => {
    expect(handlePrismaError(known("P9999"))).toBeNull();
  });

  test("an unreachable database is a 503", () => {
    const err = new Prisma.PrismaClientInitializationError("down", "test");
    expect(handlePrismaError(err)).toMatchObject({ statusCode: 503, code: "SERVICE_UNAVAILABLE" });
  });

  test("a malformed query is a server bug (500), not a client error", () => {
    const err = new Prisma.PrismaClientValidationError("bad query", { clientVersion: "test" });
    expect(handlePrismaError(err)).toMatchObject({ statusCode: 500, code: "DATABASE_ERROR" });
  });

  test("non-Prisma errors are ignored", () => {
    expect(handlePrismaError(new Error("x"))).toBeNull();
  });
});
