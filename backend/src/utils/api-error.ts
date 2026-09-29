import {
  ErrorCode,
  defaultCodeForStatus,
  type ErrorCodeType,
} from "./error-codes";

/**
 * One problem with one specific field of the request.
 * `field` is a dot path ("title", "members.0.role") so a form can bind to it.
 */
export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface ApiErrorOptions {
  /** Stable machine-readable code. Defaults to one derived from statusCode. */
  code?: ErrorCodeType;
  /** Field path -> messages, for direct binding to form inputs. */
  fieldErrors?: Record<string, string[]>;
  stack?: string;
}

/**
 * The error every layer of the app throws. The error middleware is the only
 * place that turns one into a response, via `toJSON()`.
 */
export class ApiError extends Error {
  statusCode: number;
  code: ErrorCodeType;
  data: null;
  success: boolean;
  errors: unknown[];
  fieldErrors?: Record<string, string[]>;

  constructor(
    statusCode: number,
    message = "Something went wrong",
    errors: unknown[] = [],
    options: ApiErrorOptions = {},
  ) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = options.code ?? defaultCodeForStatus(statusCode);
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (options.fieldErrors) {
      this.fieldErrors = options.fieldErrors;
    }

    if (options.stack) {
      this.stack = options.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /** The exact JSON body sent to the client. */
  toJSON() {
    return {
      success: false,
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
      data: null,
      errors: this.errors,
      ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
    };
  }

  static badRequest(message: string, code: ErrorCodeType = ErrorCode.BAD_REQUEST) {
    return new ApiError(400, message, [], { code });
  }

  static unauthorized(
    message = "Unauthorized",
    code: ErrorCodeType = ErrorCode.UNAUTHORIZED,
  ) {
    return new ApiError(401, message, [], { code });
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message, [], { code: ErrorCode.FORBIDDEN });
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message, [], { code: ErrorCode.NOT_FOUND });
  }

  static conflict(message: string, code: ErrorCodeType = ErrorCode.CONFLICT) {
    return new ApiError(409, message, [], { code });
  }
}
