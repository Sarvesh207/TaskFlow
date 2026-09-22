import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

/**
 * Tag every request with an id, echoed back in the `X-Request-Id` header and in
 * error responses, so a report of "it failed" can be matched to a server log.
 * An incoming `X-Request-Id` is honoured so the frontend can supply its own.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");

  req.requestId =
    incoming && incoming.length <= 128 ? incoming : randomUUID();

  res.setHeader("X-Request-Id", req.requestId);
  next();
}
