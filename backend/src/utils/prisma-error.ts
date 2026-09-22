import { Prisma } from "../generated/prisma/client";
import { ApiError } from "./api-error";
import { ErrorCode } from "./error-codes";

/**
 * Pull the offending column out of a Prisma error's `meta`, which is loosely
 * typed and shaped differently per error code. Never returned raw to the
 * client - only the field name is surfaced.
 */
function extractField(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null;

  const record = meta as Record<string, unknown>;
  const candidate =
    record.target ?? record.field_name ?? record.column_name ?? record.constraint;

  if (Array.isArray(candidate)) {
    const first = candidate.find((value) => typeof value === "string");
    return typeof first === "string" ? first : null;
  }

  if (typeof candidate === "string") {
    // Postgres constraint names arrive as "tasks_title_key"; keep them readable
    // but do not try to guess the column out of them.
    return candidate;
  }

  return null;
}

/** Build the per-field map only when we actually know which field broke. */
function fieldErrorsFor(field: string | null, message: string) {
  return field ? { [field]: [message] } : undefined;
}

/**
 * Map a Prisma error onto an ApiError. Returns null when the error is not a
 * Prisma error, so the caller can keep looking.
 */
export function handlePrismaError(error: unknown): ApiError | null {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new ApiError(503, "Database is unavailable. Please try again.", [], {
      code: ErrorCode.SERVICE_UNAVAILABLE,
    });
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new ApiError(500, "Database engine error.", [], {
      code: ErrorCode.DATABASE_ERROR,
    });
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    // The query itself was malformed - that is a server-side bug, not the
    // client's fault, so it must not be reported as a 4xx.
    return new ApiError(500, "Invalid database query.", [], {
      code: ErrorCode.DATABASE_ERROR,
    });
  }

  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  const field = extractField(error.meta);

  switch (error.code) {
    // Value too long for the column
    case "P2000": {
      const message = field
        ? `The value provided for "${field}" is too long.`
        : "One of the values provided is too long.";
      return new ApiError(400, message, [], {
        code: ErrorCode.BAD_REQUEST,
        fieldErrors: fieldErrorsFor(field, message),
      });
    }

    // Record required by the operation does not exist
    case "P2001":
      return new ApiError(404, "The requested record does not exist.", [], {
        code: ErrorCode.NOT_FOUND,
      });

    // Unique constraint violation
    case "P2002": {
      const message = field
        ? `A record with this "${field}" already exists.`
        : "A record with this value already exists.";
      return new ApiError(409, message, [], {
        code: ErrorCode.ALREADY_EXISTS,
        fieldErrors: fieldErrorsFor(field, message),
      });
    }

    // Foreign key constraint violation
    case "P2003": {
      const message = field
        ? `The referenced record in "${field}" does not exist or is still in use.`
        : "Operation failed because a related record is missing or still in use.";
      return new ApiError(409, message, [], {
        code: ErrorCode.CONFLICT,
        fieldErrors: fieldErrorsFor(field, message),
      });
    }

    // Null constraint violation
    case "P2011": {
      const message = field
        ? `"${field}" is required and cannot be null.`
        : "A required value was missing.";
      return new ApiError(400, message, [], {
        code: ErrorCode.BAD_REQUEST,
        fieldErrors: fieldErrorsFor(field, message),
      });
    }

    // Required relation violation
    case "P2014":
      return new ApiError(
        409,
        "This change would break a required relation between records.",
        [],
        { code: ErrorCode.CONFLICT },
      );

    // Record to update/delete not found
    case "P2025":
      return new ApiError(404, "Record not found.", [], {
        code: ErrorCode.NOT_FOUND,
      });

    default:
      return null;
  }
}
