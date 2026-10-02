import { rateLimit } from "express-rate-limit";
import { ApiError } from "../utils/api-error";
import { ErrorCode } from "../utils/error-codes";

interface RateLimitOptions {
  /** Length of the counting window. */
  windowMs: number;
  /** Requests allowed per client IP within the window. */
  max: number;
}

/**
 * Throttles by client IP. Rejections go through the normal error middleware,
 * so a 429 has the same JSON envelope as every other failure, plus a
 * `Retry-After` header.
 *
 * Behind a proxy the IP is only the real client's when `trust proxy` matches
 * the number of proxies in front of the app (see TRUST_PROXY_HOPS in app.ts).
 */
export function createRateLimiter({ windowMs, max }: RateLimitOptions) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        new ApiError(429, "Too many attempts. Please wait a minute and try again.", [], {
          code: ErrorCode.TOO_MANY_REQUESTS,
        }),
      );
    },
  });
}

/**
 * Brute-force guard for the sign-in and sign-up endpoints: 10 requests per
 * minute per IP. The test suite signs in constantly from one address, so it
 * is effectively switched off under NODE_ENV=test (the limiter itself is
 * tested through createRateLimiter).
 */
export const authRateLimiter = createRateLimiter(
  process.env.NODE_ENV === "test"
    ? { windowMs: 60_000, max: 1_000_000 }
    : { windowMs: 60_000, max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10 },
);
