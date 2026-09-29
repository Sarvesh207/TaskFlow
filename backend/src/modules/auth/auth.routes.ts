import { Router } from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} from "./auth.controller";
import { requireAuth, validate } from "../../middleware";
import { userRegisterSchema, userLoginSchema } from "./auth.schema";

const router = Router();

router.post("/register", validate({ body: userRegisterSchema }), registerUser);
router.post("/login", validate({ body: userLoginSchema }), loginUser);
router.post("/logout", logoutUser);
router.get("/me", requireAuth, getCurrentUser);

export default router;
