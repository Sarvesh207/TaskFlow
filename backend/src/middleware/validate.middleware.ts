import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodType } from "zod";
import { ValidationError } from "../utils/zod-error";
import { ApiError } from "../utils/api-error";
import { ErrorCode } from "../utils/error-codes";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Validate a request against Zod schemas before the controller runs.
 *
 * All three sources are parsed even when the first one fails, so the client
 * gets every problem with the request in a single response instead of
 * discovering them one round trip at a time.
 *
 * On success the parsed (and transformed) values replace `req.body` and are
 * stored on `req.validated`; `req.query` is read-only in Express 5, so the
 * parsed query is only available through `req.validated.query`.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const issues: ZodError["issues"] = [];
    const validated: NonNullable<Request["validated"]> = {};
    let bodyFailed = false;

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) {
        validated.params = result.data;
      } else {
        issues.push(...result.error.issues);
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) {
        validated.query = result.data;
      } else {
        issues.push(...result.error.issues);
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body ?? {});
      if (result.success) {
        validated.body = result.data;
      } else {
        bodyFailed = true;
        issues.push(...result.error.issues);
      }
    }

    if (issues.length > 0) {
      // A malformed body is a semantically invalid payload (422); a malformed
      // path or query is a malformed request line (400).
      throw new ValidationError(new ZodError(issues), {
        statusCode: bodyFailed ? 422 : 400,
        label: bodyFailed ? "body" : "parameters",
      });
    }

    req.validated = validated;
    if (schemas.body) {
      req.body = validated.body;
    }

    next();
  };
}

/**
 * Read the authenticated user id set by `requireAuth`.
 *
 * A missing or malformed id means the token was never verified or was forged,
 * which is an authentication problem (401) rather than bad user input (400).
 */
export function requireUserId(req: Request): string {
  const userId = req.userId;

  if (typeof userId !== "string" || !UUID_PATTERN.test(userId)) {
    throw new ApiError(401, "Unauthorized: invalid session", [], {
      code: ErrorCode.INVALID_TOKEN,
    });
  }

  return userId;
}

/**
 * Typed access to what `validate()` parsed.
 *
 * The cast is safe as long as the type argument matches the schema used on the
 * route; if the middleware was never applied, this throws a 500 rather than
 * letting `undefined` reach the service layer.
 */
function readValidated<T>(
  req: Request,
  key: "body" | "params" | "query",
): T {
  const value = req.validated?.[key];

  if (value === undefined) {
    throw new ApiError(
      500,
      `Route is missing validate() for the request ${key}`,
      [],
      { code: ErrorCode.INTERNAL_ERROR },
    );
  }

  return value as T;
}

export const validatedBody = <T>(req: Request) => readValidated<T>(req, "body");
export const validatedParams = <T>(req: Request) =>
  readValidated<T>(req, "params");
export const validatedQuery = <T>(req: Request) =>
  readValidated<T>(req, "query");
