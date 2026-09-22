import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/api-error";
import { ErrorCode } from "../utils/error-codes";
import { handlePrismaError } from "../utils/prisma-error";
import { handleZodError } from "../utils/zod-error";

const isProduction = process.env.NODE_ENV === "production";

/** Errors thrown by express.json() / body-parser carry `type` and `status`. */
interface BodyParserError extends Error {
  type?: string;
  status?: number;
  statusCode?: number;
}

function handleBodyParserError(error: unknown): ApiError | null {
  const candidate = error as BodyParserError;

  if (!candidate || typeof candidate.type !== "string") return null;

  switch (candidate.type) {
    case "entity.parse.failed":
      return new ApiError(
        400,
        "Request body is not valid JSON. Check for trailing commas, single quotes or unquoted keys.",
        [],
        { code: ErrorCode.INVALID_JSON },
      );

    case "entity.too.large":
      return new ApiError(413, "Request body is too large.", [], {
        code: ErrorCode.PAYLOAD_TOO_LARGE,
      });

    case "encoding.unsupported":
      return new ApiError(415, "Unsupported content encoding.", [], {
        code: ErrorCode.BAD_REQUEST,
      });

    case "request.aborted":
      return new ApiError(400, "Request was aborted before it completed.", [], {
        code: ErrorCode.BAD_REQUEST,
      });

    default:
      return null;
  }
}

/** Structured log line. 5xx always logs a stack; 4xx stays a one-liner. */
function logError(req: Request, apiError: ApiError, original: unknown) {
  const context = `${req.method} ${req.originalUrl} [${req.requestId ?? "-"}]${
    req.userId ? ` user=${req.userId}` : ""
  }`;

  if (apiError.statusCode >= 500) {
    console.error(
      `[error] ${context} -> ${apiError.statusCode} ${apiError.code}: ${apiError.message}`,
    );
    console.error(original instanceof Error ? original.stack : original);
    return;
  }

  if (!isProduction) {
    console.warn(
      `[warn] ${context} -> ${apiError.statusCode} ${apiError.code}: ${apiError.message}`,
    );
  }
}

/**
 * The single place an error becomes a response. Every error leaves here in the
 * same envelope:
 *
 *   { success, statusCode, code, message, data, errors, fieldErrors?, requestId }
 */
export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Headers already sent: the response is mid-flight, hand it to Express so it
  // can close the connection instead of trying to write a second body.
  if (res.headersSent) {
    return next(err);
  }

  const apiError =
    (err instanceof ApiError ? err : null) ??
    handleZodError(err) ??
    handlePrismaError(err) ??
    handleBodyParserError(err) ??
    new ApiError(500, "Internal server error", [], {
      code: ErrorCode.INTERNAL_ERROR,
    });

  logError(req, apiError, err);

  const body: Record<string, unknown> = {
    ...apiError.toJSON(),
    requestId: req.requestId,
  };

  // Outside production, surface what actually blew up - an opaque 500 is the
  // hardest thing to debug from the client side.
  if (!isProduction && apiError.statusCode >= 500 && err instanceof Error) {
    body.debug = {
      name: err.name,
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 10),
    };
  }

  return res.status(apiError.statusCode).json(body);
};

/** Unmatched route: same envelope as everything else, never Express's HTML. */
export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  next(
    new ApiError(404, `Route ${req.method} ${req.originalUrl} does not exist.`, [], {
      code: ErrorCode.ROUTE_NOT_FOUND,
    }),
  );
};
