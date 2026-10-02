import { Router } from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  startGoogleAuth,
  googleAuthCallback,
} from "./auth.controller";
import { requireAuth, validate } from "../../middleware";
import { userRegisterSchema, userLoginSchema } from "./auth.schema";

const router = Router();

router.post("/register", validate({ body: userRegisterSchema }), registerUser);
router.post("/login", validate({ body: userLoginSchema }), loginUser);
router.post("/logout", logoutUser);
router.get("/me", requireAuth, getCurrentUser);

// OAuth 2.0 Authorization Code + PKCE. Browser navigations, not fetch calls:
// both respond with redirects, never JSON.
router.get("/google", startGoogleAuth);
router.get("/google/callback", googleAuthCallback);

export default router;
