import { z } from "zod";

/**
 * A UUID with a message that names the field, so the client is told which id
 * was wrong rather than a bare "Invalid uuid".
 */
export const uuidParam = (label: string) =>
  z.uuid(`${label} must be a valid UUID`);

/** Kept for callers that validate a bare `{ id }` object. */
export const UUIDSchema = z.object({
  id: uuidParam("id"),
});
