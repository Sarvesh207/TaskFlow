import type { Request, Response } from "express";
import { ApiResponse } from "../../utils";
import { checkHealth } from "./health.service";

/**
 * Liveness: "the process is up". Deliberately never touches the database: the
 * host calls this every few seconds, and on a serverless database (Neon) a
 * query per call would keep the compute awake around the clock and use up
 * the free quota. Point the platform health check and uptime monitors here.
 */
export function getLiveness(_req: Request, res: Response) {
  return res.status(200).json(new ApiResponse(200, { status: "ok" }, "Alive"));
}

/** Readiness: the process is up and the database answers. For manual checks. */
export async function getReadiness(_req: Request, res: Response) {
  const health = await checkHealth();

  return res.status(200).json(new ApiResponse(200, health, "Healthy"));
}
