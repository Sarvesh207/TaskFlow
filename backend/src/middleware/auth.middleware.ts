import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/api-error";
import { ErrorCode } from "../utils/error-codes";

interface JwtPayload {
  sub: string;
  type: string;
}

/**
 * Verify the httpOnly `accessToken` cookie and put the user id on the request.
 *
 * Expiry and tampering are reported with distinct codes: the client should
 * re-authenticate on TOKEN_EXPIRED, but treat INVALID_TOKEN as a hard failure.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken;

  if (!token) {
    throw new ApiError(401, "Unauthorized: no token provided", [], {
      code: ErrorCode.UNAUTHORIZED,
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as JwtPayload;

    req.userId = decoded.sub;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, "Session expired. Please log in again.", [], {
        code: ErrorCode.TOKEN_EXPIRED,
      });
    }

    throw new ApiError(401, "Unauthorized: invalid token", [], {
      code: ErrorCode.INVALID_TOKEN,
    });
  }
}
