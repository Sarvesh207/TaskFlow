import { ZodError } from "zod";
import { ApiError, type FieldError } from "./api-error";
import { ErrorCode, type ErrorCodeType } from "./error-codes";

/** Issues that are about the payload as a whole rather than one field. */
const ROOT_FIELD = "_root";

/**
 * Turn a Zod issue path into a dot path a client can bind to:
 *   ["title"]              -> "title"
 *   ["members", 0, "role"] -> "members.0.role"
 *   []                     -> "_root"
 */
function formatPath(path: PropertyKey[]): string {
  if (path.length === 0) return ROOT_FIELD;
  return path.map((segment) => String(segment)).join(".");
}

/**
 * Flatten a ZodError into a client-friendly list.
 *
 * `unrecognized_keys` is expanded so each unknown key is reported against its
 * own field name instead of one opaque issue on the root.
 */
export function toFieldErrors(error: ZodError): FieldError[] {
  const fieldErrors: FieldError[] = [];

  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        fieldErrors.push({
          field: formatPath([...issue.path, key]),
          code: issue.code,
          message: `Unknown field "${key}" is not allowed`,
        });
      }
      continue;
    }

    fieldErrors.push({
      field: formatPath(issue.path),
      code: issue.code,
      message: issue.message,
    });
  }

  return fieldErrors;
}

/** Group flat field errors by field path, the shape a form binds to. */
export function groupFieldErrors(
  fieldErrors: FieldError[],
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const { field, message } of fieldErrors) {
    (grouped[field] ??= []).push(message);
  }

  return grouped;
}

/** Human summary: "Validation failed for 2 fields: title, priority". */
function buildMessage(fieldErrors: FieldError[], label: string): string {
  const fields = [...new Set(fieldErrors.map((e) => e.field))].filter(
    (field) => field !== ROOT_FIELD,
  );

  if (fields.length === 0) {
    // Nothing is attributable to a single field (e.g. an object-level refine),
    // so the issue's own message is more useful than a generic summary.
    return fieldErrors[0]?.message ?? `Invalid request ${label}`;
  }

  return `Validation failed for ${fields.length} ${
    fields.length === 1 ? "field" : "fields"
  }: ${fields.join(", ")}`;
}

export interface ValidationErrorOptions {
  /** Where the bad data came from; used in the summary message. */
  label?: string;
  statusCode?: number;
  code?: ErrorCodeType;
}

/**
 * A failed schema parse, rendered so that both a human reading the response and
 * a form binding to it get what they need.
 */
export class ValidationError extends ApiError {
  constructor(error: ZodError, options: ValidationErrorOptions = {}) {
    const {
      label = "body",
      statusCode = 422,
      code = ErrorCode.VALIDATION_ERROR,
    } = options;

    const fieldErrors = toFieldErrors(error);

    super(statusCode, buildMessage(fieldErrors, label), fieldErrors, {
      code,
      fieldErrors: groupFieldErrors(fieldErrors),
    });

    this.name = "ValidationError";
  }
}

/** Convert any ZodError into an ApiError, for use as a safety net. */
export function handleZodError(
  error: unknown,
  options?: ValidationErrorOptions,
): ApiError | null {
  if (!(error instanceof ZodError)) return null;
  return new ValidationError(error, options);
}
