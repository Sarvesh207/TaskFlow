import { ApiError, ErrorCode } from "../../utils";
import { pingDatabase } from "./health.repository";

export async function checkHealth() {
  try {
    await pingDatabase();
  } catch (error) {
    console.error("Health check: database unreachable", error);
    throw new ApiError(503, "Database is unreachable", [], {
      code: ErrorCode.SERVICE_UNAVAILABLE,
    });
  }

  return { status: "ok", database: "up" } as const;
}
