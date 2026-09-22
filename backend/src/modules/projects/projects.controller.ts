import type { Request, Response } from "express";

import {
  getAllProjectService,
  getProjectByIdService,
  updateProjectService,
  deleteProjectService,
  createProjectService,
  getProjectMemberService,
  getProjectMembersService,
  addMemberService,
  updateMemberService,
  removeMemberService,
  createProjectTasksService,
  updateTasksService,
  deleteProjectTasksService,
  getAllProjectTasksService,
  getProjectTaskService,
} from "./projects.service";
import { ApiResponse } from "../../utils";
import {
  requireUserId,
  validatedBody,
  validatedParams,
} from "../../middleware";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  addMemberInput,
  updateMemberRoleInput,
  createTaskInput,
  updateTaskInput,
  ProjectIdParam,
  ProjectScopedParam,
  MemberParams,
  TaskParams,
} from "./project.schema";

// Request params and bodies are validated by `validate()` in projects.routes.ts,
// so every handler below reads already-parsed, correctly typed values.

async function getAllProjects(req: Request, res: Response) {
  const userId = requireUserId(req);

  const projects = await getAllProjectService(userId);

  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched succfully"));
}

async function getProjectById(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = validatedParams<ProjectIdParam>(req);

  const project = await getProjectByIdService(id, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, project, "Project fetched successfully"));
}

async function createProject(req: Request, res: Response) {
  const userId = requireUserId(req);
  const body = validatedBody<CreateProjectInput>(req);

  const project = await createProjectService(userId, body);

  return res
    .status(201)
    .json(new ApiResponse(201, project, "Project created successfully"));
}

async function updateProject(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = validatedParams<ProjectIdParam>(req);
  const body = validatedBody<UpdateProjectInput>(req);

  const updatedProject = await updateProjectService(id, userId, body);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedProject,
        "project details updated successfully",
      ),
    );
}

async function deleteProject(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = validatedParams<ProjectIdParam>(req);

  await deleteProjectService(id, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Project deleted successfully"));
}

async function getProjectStats(req: Request, res: Response) {}

async function getProjectMembers(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId } = validatedParams<ProjectScopedParam>(req);

  const members = await getProjectMembersService(projectId, userId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, members, "Project members fetched successfully"),
    );
}

async function getProjectMember(req: Request, res: Response) {
  const reqUserId = requireUserId(req);
  const { projectId, userId } = validatedParams<MemberParams>(req);

  const member = await getProjectMemberService(projectId, reqUserId, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, member, "Project member fetched successfully"));
}

async function addProjectMember(req: Request, res: Response) {
  const reqUserId = requireUserId(req);
  const { projectId } = validatedParams<ProjectScopedParam>(req);
  const body = validatedBody<addMemberInput>(req);

  const newMember = await addMemberService(
    projectId,
    reqUserId,
    body.user_id,
    body.role,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, newMember, "Project member added successfully"));
}

async function updateProjectMemberRole(req: Request, res: Response) {
  const reqUserId = requireUserId(req);
  const { projectId, userId } = validatedParams<MemberParams>(req);
  const body = validatedBody<updateMemberRoleInput>(req);

  const updatedMember = await updateMemberService(
    projectId,
    reqUserId,
    userId,
    body.role,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedMember,
        "Project member role updated successfully",
      ),
    );
}

async function removeProjectMember(req: Request, res: Response) {
  const reqUserId = requireUserId(req);
  const { projectId, userId } = validatedParams<MemberParams>(req);

  await removeMemberService(projectId, reqUserId, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Project member removed successfully"));
}

async function getProjectTasksController(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId } = validatedParams<ProjectScopedParam>(req);

  const tasks = await getAllProjectTasksService(projectId, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
}

async function getProjectTaskController(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId, tasksId } = validatedParams<TaskParams>(req);

  const task = await getProjectTaskService(projectId, userId, tasksId);

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task fetched successfully"));
}

async function createProjectTaskController(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId } = validatedParams<ProjectScopedParam>(req);
  const body = validatedBody<createTaskInput>(req);

  const newTask = await createProjectTasksService(projectId, userId, body);

  return res
    .status(201)
    .json(new ApiResponse(201, newTask, "Task created successfully"));
}

async function updateProjectTaskController(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId, tasksId } = validatedParams<TaskParams>(req);
  const body = validatedBody<updateTaskInput>(req);

  const updatedTask = await updateTasksService(
    projectId,
    userId,
    tasksId,
    body,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTask, "Task updated successfully"));
}

async function deleteProjectTaskController(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { projectId, tasksId } = validatedParams<TaskParams>(req);

  await deleteProjectTasksService(projectId, tasksId, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Task deleted successfully"));
}

export {
  getAllProjects,
  getProjectById,
  createProject,
  deleteProject,
  updateProject,
  getProjectStats,
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
};
