import { describe, expect, test } from "bun:test";
import { ApiError } from "../../utils/api-error";
import { defaultCodeForStatus, ErrorCode } from "../../utils/error-codes";

describe("ApiError", () => {
  test("toJSON() is the documented error envelope", () => {
    const err = new ApiError(409, "Email taken", [], {
      code: ErrorCode.ALREADY_EXISTS,
      fieldErrors: { email: ["Email taken"] },
    });

    expect(err.toJSON()).toEqual({
      success: false,
      statusCode: 409,
      code: "ALREADY_EXISTS",
      message: "Email taken",
      data: null,
      errors: [],
      fieldErrors: { email: ["Email taken"] },
    });
  });

  test("omits fieldErrors when none were given", () => {
    expect(new ApiError(404, "Nope").toJSON()).not.toHaveProperty("fieldErrors");
  });

  test("derives a code from the status when none is given", () => {
    expect(new ApiError(403, "No").code).toBe("FORBIDDEN");
  });

  test("static helpers set status and code", () => {
    expect(ApiError.forbidden()).toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    expect(ApiError.notFound()).toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
    expect(ApiError.unauthorized()).toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" });
    expect(ApiError.conflict("dup")).toMatchObject({ statusCode: 409, code: "CONFLICT" });
    expect(ApiError.badRequest("bad")).toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
  });
});

describe("defaultCodeForStatus", () => {
  test.each([
    [400, "BAD_REQUEST"],
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [413, "PAYLOAD_TOO_LARGE"],
    [422, "VALIDATION_ERROR"],
    [503, "SERVICE_UNAVAILABLE"],
    [500, "INTERNAL_ERROR"],
    [502, "INTERNAL_ERROR"],
    [418, "BAD_REQUEST"],
  ])("%i -> %s", (status, code) => {
    expect(defaultCodeForStatus(status)).toBe(code as never);
  });
});
