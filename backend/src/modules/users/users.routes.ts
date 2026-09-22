import { Router } from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from "./users.controller";
import { userIdSchema, updateUserSchema } from "./users.schema";
import { requireAuth, validate } from "../../middleware";

const router = Router();

router.get("/", requireAuth, getAllUsers);

router.get(
  "/:id",
  requireAuth,
  validate({ params: userIdSchema }),
  getUserById,
);

router.delete(
  "/:id",
  requireAuth,
  validate({ params: userIdSchema }),
  deleteUser,
);

router.patch(
  "/:id",
  requireAuth,
  validate({ params: userIdSchema, body: updateUserSchema }),
  updateUser,
);

export default router;
