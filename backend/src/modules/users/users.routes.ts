import { Router } from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from "./users.controller";
import { userIdSchema } from "./users.schema";
import { requireAuth } from "../../middleware";
const router = Router();

router.get("/", requireAuth, getAllUsers);

router.get("/:id", requireAuth, getUserById);

router.delete("/:id", requireAuth, deleteUser);

router.patch("/:id", requireAuth, updateUser);

export default router;
