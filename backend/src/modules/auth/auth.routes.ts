import { Router } from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  startGoogleAuth,
  googleAuthCallback,
} from "./auth.controller";
import { authRateLimiter, requireAuth, validate } from "../../middleware";
import { userRegisterSchema, userLoginSchema } from "./auth.schema";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validate({ body: userRegisterSchema }),
  registerUser,
);
router.post(
  "/login",
  authRateLimiter,
  validate({ body: userLoginSchema }),
  loginUser,
);
router.post("/logout", logoutUser);
router.get("/me", requireAuth, getCurrentUser);

// OAuth 2.0 Authorization Code + PKCE. Browser navigations, not fetch calls:
// both respond with redirects, never JSON.
router.get("/google", authRateLimiter, startGoogleAuth);
router.get("/google/callback", authRateLimiter, googleAuthCallback);

export default router;
