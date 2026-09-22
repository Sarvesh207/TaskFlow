import { Router } from "express";
import { requireAuth, validate } from "../../middleware";
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
