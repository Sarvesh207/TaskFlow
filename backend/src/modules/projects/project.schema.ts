import z from "zod";
import { uuidParam } from "../../types/global.types";

const PROJECT_STATUSES = ["active", "completed", "archived"] as const;
const MEMBER_ROLES = ["admin", "member"] as const;
const TASK_STATUSES = ["completed", "pending", "in_progress"] as const;

const projectName = z
  .string("Name is required")
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be at most 100 characters");

const projectDescription = z
  .string("Description must be text")
  .trim()
  .max(2000, "Description must be at most 2000 characters");

const projectStatus = z.enum(
  PROJECT_STATUSES,
  `Status must be one of: ${PROJECT_STATUSES.join(", ")}`,
);

const memberRole = z.enum(
  MEMBER_ROLES,
  `Role must be one of: ${MEMBER_ROLES.join(", ")}`,
);

const taskTitle = z
  .string("Title is required")
  .trim()
  .min(2, "Title must be at least 2 characters")
  .max(100, "Title must be at most 100 characters");

const taskDescription = z
  .string("Description must be text")
  .trim()
  .max(2000, "Description must be at most 2000 characters");

const taskStatus = z.enum(
  TASK_STATUSES,
  `Status must be one of: ${TASK_STATUSES.join(", ")}`,
);

const taskPriority = z
  .number("Priority must be a number")
  .int("Priority must be a whole number")
  .min(1, "Priority must be between 1 and 5")
  .max(5, "Priority must be between 1 and 5");

const dueDate = z
  .string("Due date must be a string")
  .date("Due date must be a calendar date in YYYY-MM-DD format")
  .transform((value) => new Date(`${value}T00:00:00Z`));

// ---------------------------------------------------------------- body schemas

const createProjectSchema = z
  .object({
    name: projectName,
    description: projectDescription.optional(),
    status: projectStatus.optional(),
  })
  .strict();

const updateProjectSchema = z
  .object({
    name: projectName.optional(),
    description: projectDescription.optional(),
    status: projectStatus.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    error: "Provide at least one field to update",
  });

const addMemberSchema = z
  .object({
    user_id: uuidParam("user_id"),
    role: memberRole.default("member"),
  })
  .strict();

const updateMemberRoleSchema = z
  .object({
    role: memberRole,
  })
  .strict();

const createTasksSchema = z
  .object({
    title: taskTitle,
    description: taskDescription.optional(),
    status: taskStatus.optional(),
    priority: taskPriority.optional(),
    due_date: dueDate.optional(),
    assigned_to: uuidParam("assigned_to").nullable().optional(),
  })
  .strict();

const updateTaskSchema = z
  .object({
    title: taskTitle.optional(),
    description: taskDescription.nullable().optional(),
    status: taskStatus.optional(),
    priority: taskPriority.optional(),
    due_date: dueDate.nullable().optional(),
    assigned_to: uuidParam("assigned_to").nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    error: "Provide at least one field to update",
  });

// -------------------------------------------------------------- param schemas
// Keys must match the route parameter names in projects.routes.ts.

const projectIdParamSchema = z.object({
  id: uuidParam("id"),
});

const projectScopedParamSchema = z.object({
  projectId: uuidParam("projectId"),
});

const memberParamsSchema = z.object({
  projectId: uuidParam("projectId"),
  userId: uuidParam("userId"),
});

const taskParamsSchema = z.object({
  projectId: uuidParam("projectId"),
  tasksId: uuidParam("tasksId"),
});

type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
type ProjectScopedParam = z.infer<typeof projectScopedParamSchema>;
type MemberParams = z.infer<typeof memberParamsSchema>;
type TaskParams = z.infer<typeof taskParamsSchema>;
type CreateProjectInput = z.infer<typeof createProjectSchema>;
type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
type addMemberInput = z.infer<typeof addMemberSchema>;
type updateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
type createTaskInput = z.infer<typeof createTasksSchema>;
type updateTaskInput = z.infer<typeof updateTaskSchema>;

export {
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
};

export type {
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
};
