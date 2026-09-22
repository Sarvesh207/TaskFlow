import { ApiResponse } from "./api-response";
import { ApiError, type ApiErrorOptions, type FieldError } from "./api-error";
import {
  ErrorCode,
  defaultCodeForStatus,
  type ErrorCodeType,
} from "./error-codes";
import {
  ValidationError,
  handleZodError,
  toFieldErrors,
  groupFieldErrors,
} from "./zod-error";
import { handlePrismaError } from "./prisma-error";

export {
  ApiError,
  ApiResponse,
  ErrorCode,
  defaultCodeForStatus,
  ValidationError,
  handleZodError,
  handlePrismaError,
  toFieldErrors,
  groupFieldErrors,
};

export type { ApiErrorOptions, ErrorCodeType, FieldError };
