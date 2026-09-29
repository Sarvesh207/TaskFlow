import prisma from "../../db/prisma";
import type {
  CreateProjectInput,
  createTaskInput,
  UpdateProjectInput,
  updateTaskInput,
} from "./project.schema";

async function findAllProjects(userId: string) {
  return prisma.projects.findMany({
    where: {
      OR: [
        { owner_id: userId }, // project they own
        {
          project_members: {
            some: {
              user_id: userId,
            }, // Projects they are member of
          },
        },
      ],
    },
    orderBy: {
      created_at: "desc",
    },
  });
}

async function findProjectById(id: string) {
  return prisma.projects.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      owner_id: true,
      status: true,
      created_at: true,
      updated_at: true,
      project_members: {
        select: {
          user_id: true,
          role: true,
        },
      },
    },
  });
}

async function createProject(
  owner_id: string,
  projectData: CreateProjectInput,
) {
  return prisma.projects.create({
    data: {
      ...projectData,
      users: {
        connect: {
          id: owner_id,
        },
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });
}

async function deleteProject(id: string) {
  return prisma.projects.delete({
    where: {
      id,
    },
  });
}

async function updateProject(id: string, data: UpdateProjectInput) {
  return prisma.projects.update({
    where: { id },
    data: data,
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });
}

async function addMemberToProject(
  projectId: string,
  userId: string,
  role: "admin" | "member",
) {
  return prisma.project_members.create({
    data: {
      project_id: projectId,
      user_id: userId,
      role: role,
    },
  });
}
async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: "admin" | "member" | "owner",
) {
  return prisma.project_members.update({
    where: {
      project_id_user_id: {
        project_id: projectId,
        user_id: userId,
      },
    },
    data: {
      role: role,
    },
  });
}
async function removeMemberFromProject(projectId: string, userId: string) {
  return prisma.project_members.delete({
    where: {
      project_id_user_id: {
        project_id: projectId,
        user_id: userId,
      },
    },
  });
}
async function getProjectMembers(projectId: string) {
  return prisma.project_members.findMany({
    where: {
      project_id: projectId,
    },
    include: {
      users: {
        select: {
          full_name: true,
          email: true,
          id: true,
        },
      },
    },
  });
}
async function getProjectMember(projectId: string, userId: string) {
  return prisma.project_members.findUnique({
    where: {
      project_id_user_id: {
        project_id: projectId,
        user_id: userId,
      },
    },
    include: {
      users: {
        select: {
          full_name: true,
          email: true,
          id: true,
        },
      },
    },
  });
}

async function getProjectTaskById(projectId: string, taskId: string) {
  return prisma.tasks.findFirst({
    where: {
      id: taskId,
      project_id: projectId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      due_date: true,
      priority: true,
      status: true,
      project_id: true,
      assigned_to: true,
      created_at: true,
      updated_at: true,
    },
  });
}

async function getProjectTasks(projectId: string) {
  return prisma.tasks.findMany({
    where: {
      project_id: projectId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      due_date: true,
      priority: true,
      status: true,
      project_id: true,
      assigned_to: true,
      created_at: true,
      updated_at: true,
    },
  });
}

async function createProjectTask(projectId: string, data: createTaskInput) {
  const { assigned_to, ...tasksData } = data;
  return prisma.tasks.create({
    data: {
      ...tasksData,
      projects: {
        connect: {
          id: projectId,
        },
      },
      ...(assigned_to && {
        users: {
          connect: {
            id: assigned_to,
          },
        },
      }),
    },
  });
}

async function updateProjectTask(taskId: string, data: updateTaskInput) {
  return prisma.tasks.update({
    where: {
      id: taskId,
    },
    data,
    select: {
      id: true,
      title: true,
      description: true,
      due_date: true,
      priority: true,
      status: true,
      project_id: true,
      assigned_to: true,
      created_at: true,
      updated_at: true,
    },
  });
}

async function deleteProjectTask(taskId: string) {
  return prisma.tasks.delete({
    where: {
      id: taskId,
    },
  });
}

export {
  findProjectById,
  findAllProjects,
  createProject,
  deleteProject,
  updateProject,
  addMemberToProject,
  updateProjectMemberRole,
  removeMemberFromProject,
  getProjectMember,
  getProjectMembers,
  getProjectTaskById,
  getProjectTasks,
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
};
