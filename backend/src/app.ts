import express from "express";
import { errorMiddleware, notFoundMiddleware, requestId } from "./middleware";
import usersRouter from "./modules/users/users.routes";
import authRouter from "./modules/auth/auth.routes";
import projectsRouter from "./modules/projects/projects.routes";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(requestId);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api/v1/users", usersRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectsRouter);

// Unmatched routes fall through to a JSON 404 instead of Express's HTML page.
app.use(notFoundMiddleware);

// Global Error handle middleware
app.use(errorMiddleware);

export default app;
