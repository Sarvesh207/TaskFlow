import { Router } from "express";
import { getLiveness, getReadiness } from "./health.controller";

const router = Router();

// Both are public on purpose: the host's health check and uptime monitors call them.
router.get("/", getLiveness); // no database access, safe to call every few seconds
router.get("/db", getReadiness); // queries the database; use sparingly

export default router;
