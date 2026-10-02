import { Router } from "express";
import { getHealth } from "./health.controller";

const router = Router();

// Public on purpose: the host's health check and uptime monitors call it.
router.get("/", getHealth);

export default router;
