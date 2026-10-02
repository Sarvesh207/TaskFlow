import type { Request, Response } from "express";
import { ApiResponse } from "../../utils";
import { checkHealth } from "./health.service";

export async function getHealth(_req: Request, res: Response) {
  const health = await checkHealth();

  return res.status(200).json(new ApiResponse(200, health, "Healthy"));
}
