import { describe, expect, mock, spyOn, test } from "bun:test";

let database: "up" | "down" = "up";

mock.module("../../modules/health/health.repository", () => ({
  pingDatabase: mock(async () => {
    if (database === "down") throw new Error("connection refused");
  }),
}));

const { checkHealth } = await import("../../modules/health/health.service");

describe("checkHealth", () => {
  test("reports ok when the database answers", async () => {
    database = "up";
    expect(await checkHealth()).toEqual({ status: "ok", database: "up" });
  });

  test("a database failure becomes 503 SERVICE_UNAVAILABLE, without leaking the cause", async () => {
    database = "down";
    const log = spyOn(console, "error").mockImplementation(() => {}); // the failure is logged on purpose
    const error = await checkHealth().catch((e) => e);
    log.mockRestore();

    expect(error).toMatchObject({ statusCode: 503, code: "SERVICE_UNAVAILABLE" });
    expect(error.message).not.toContain("connection refused");
  });
});
