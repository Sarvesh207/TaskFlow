import { Router } from "express";
import { inviteRateLimiter, requireAuth, validate } from "../../middleware";
import {
  createInvite,
  listInvites,
  resendInvite,
  revokeInvite,
} from "../invites/invites.controller";
import { createInviteSchema, inviteParamsSchema } from "../invites/invites.schema";
import {
  createProject,
  deleteProject,
  getAllProjects,
  getProjectById,
  getProjectStats,
  updateProject,
  getProjectMembers,
  getProjectMember,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  getProjectTasksController,
  getProjectTaskController,
  createProjectTaskController,
  updateProjectTaskController,
  deleteProjectTaskController,
} from "./projects.controller";
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  createTasksSchema,
  updateTaskSchema,
  projectIdParamSchema,
  projectScopedParamSchema,
  memberParamsSchema,
  taskParamsSchema,
} from "./project.schema";

const router = Router();

router.get("/", requireAuth, getAllProjects);

router.get(
  "/:id",
  requireAuth,
  validate({ params: projectIdParamSchema }),
  getProjectById,
);

router.post(
  "/",
  requireAuth,
  validate({ body: createProjectSchema }),
  createProject,
);

router.patch(
  "/:id",
  requireAuth,
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  updateProject,
);

router.delete(
  "/:id",
  requireAuth,
  validate({ params: projectIdParamSchema }),
  deleteProject,
);

// router.get("/:id/stats", requireAuth, getProjectStats);

// project members routes

router.get(
  "/:projectId/members",
  requireAuth,
  validate({ params: projectScopedParamSchema }),
  getProjectMembers,
);

router.get(
  "/:projectId/members/:userId",
  requireAuth,
  validate({ params: memberParamsSchema }),
  getProjectMember,
);

router.post(
  "/:projectId/members",
  requireAuth,
  validate({ params: projectScopedParamSchema, body: addMemberSchema }),
  addProjectMember,
);

router.put(
  "/:projectId/members/:userId",
  requireAuth,
  validate({ params: memberParamsSchema, body: updateMemberRoleSchema }),
  updateProjectMemberRole,
);

router.delete(
  "/:projectId/members/:userId",
  requireAuth,
  validate({ params: memberParamsSchema }),
  removeProjectMember,
);

// project invites (owner/admin; the recipient's side is in invites.routes.ts)

router.get(
  "/:projectId/invites",
  requireAuth,
  validate({ params: projectScopedParamSchema }),
  listInvites,
);

router.post(
  "/:projectId/invites",
  inviteRateLimiter,
  requireAuth,
  validate({ params: projectScopedParamSchema, body: createInviteSchema }),
  createInvite,
);

router.post(
  "/:projectId/invites/:inviteId/resend",
  inviteRateLimiter,
  requireAuth,
  validate({ params: inviteParamsSchema }),
  resendInvite,
);

router.delete(
  "/:projectId/invites/:inviteId",
  requireAuth,
  validate({ params: inviteParamsSchema }),
  revokeInvite,
);

// projects tasks

router.get(
  "/:projectId/tasks",
  requireAuth,
  validate({ params: projectScopedParamSchema }),
  getProjectTasksController,
);

router.get(
  "/:projectId/tasks/:tasksId",
  requireAuth,
  validate({ params: taskParamsSchema }),
  getProjectTaskController,
);

router.post(
  "/:projectId/tasks",
  requireAuth,
  validate({ params: projectScopedParamSchema, body: createTasksSchema }),
  createProjectTaskController,
);

router.put(
  "/:projectId/tasks/:tasksId",
  requireAuth,
  validate({ params: taskParamsSchema, body: updateTaskSchema }),
  updateProjectTaskController,
);

router.delete(
  "/:projectId/tasks/:tasksId",
  requireAuth,
  validate({ params: taskParamsSchema }),
  deleteProjectTaskController,
);

export default router;
