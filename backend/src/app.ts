import express from "express";
import { errorMiddleware, notFoundMiddleware, requestId } from "./middleware";
import usersRouter from "./modules/users/users.routes";
import authRouter from "./modules/auth/auth.routes";
import projectsRouter from "./modules/projects/projects.routes";
import healthRouter from "./modules/health/health.routes";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// Number of reverse proxies in front of this app, so `req.ip` (used by the
// rate limiter and logs) is the real client and not a proxy. 0 locally; 2 in
// production behind Vercel's /api rewrite and Render's load balancer.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS) || 0;
if (trustProxyHops > 0) app.set("trust proxy", trustProxyHops);

// Browser origins allowed to call the API with cookies (comma-separated).
// In production the browser talks to the frontend's own domain, which proxies
// /api here, so this only matters for direct cross-origin calls.
const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);

app.use(requestId);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectsRouter);

// Unmatched routes fall through to a JSON 404 instead of Express's HTML page.
app.use(notFoundMiddleware);

// Global Error handle middleware
app.use(errorMiddleware);

export default app;
