/**
 * Authorization rules in projects.service.ts, with the repository and Prisma
 * replaced by an in-memory project. The real `requireProjectRole` helper runs
 * against the fake Prisma client, so both permission styles are exercised.
 *
 * `mock.module` is process-wide in Bun; that is why unit and integration tests
 * run as separate `bun test` invocations.
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";

const PROJECT = "11111111-1111-4111-8111-111111111111";
const OWNER = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const MEMBER = "44444444-4444-4444-8444-444444444444";
const OUTSIDER = "55555555-5555-4555-8555-555555555555";
const TASK = "66666666-6666-4666-8666-666666666666";

type Role = "admin" | "member";
let members: { user_id: string; role: Role }[];
let task: { id: string; assigned_to: string | null } | null;

const project = () => ({ id: PROJECT, owner_id: OWNER, project_members: members });
const memberRow = (_p: string, userId: string) => members.find((m) => m.user_id === userId) ?? null;

const repo = {
  findProjectById: mock(async (id: string) => (id === PROJECT ? project() : null)),
  findAllProjects: mock(async () => []),
  createProject: mock(async () => ({})),
  updateProject: mock(async (_id: string, data: object) => data),
  deleteProject: mock(async () => ({})),
  addMemberToProject: mock(async (_p: string, user_id: string, role: Role) => ({ user_id, role })),
  updateProjectMemberRole: mock(async (_p: string, user_id: string, role: Role) => ({ user_id, role })),
  removeMemberFromProject: mock(async () => ({})),
  getProjectMember: mock(async (p: string, u: string) => memberRow(p, u)),
  getProjectMembers: mock(async () => members),
  getProjectTaskById: mock(async () => task),
  getProjectTasks: mock(async () => (task ? [task] : [])),
  createProjectTask: mock(async (_p: string, data: object) => ({ id: TASK, ...data })),
  updateProjectTask: mock(async (_t: string, data: object) => ({ ...task, ...data })),
  deleteProjectTask: mock(async () => ({})),
};

mock.module("../../modules/projects/projects.repository", () => repo);
mock.module("../../db/prisma", () => ({
  default: {
    projects: { findUnique: async () => ({ owner_id: OWNER }) },
    project_members: {
      findUnique: async ({ where }: any) => {
        const row = memberRow(PROJECT, where.project_id_user_id.user_id);
        return row ? { role: row.role } : null;
      },
    },
  },
  connectDB: async () => {},
}));

const svc = await import("../../modules/projects/projects.service");

beforeEach(() => {
  members = [
    { user_id: ADMIN, role: "admin" },
    { user_id: MEMBER, role: "member" },
  ];
  task = { id: TASK, assigned_to: MEMBER };
  for (const fn of Object.values(repo)) fn.mockClear();
});

const status = (code: number) => expect.objectContaining({ statusCode: code });

describe("project access", () => {
  test("owner and members can read; outsiders get 403", async () => {
    for (const user of [OWNER, ADMIN, MEMBER]) {
      await expect(svc.getProjectByIdService(PROJECT, user)).resolves.toMatchObject({ id: PROJECT });
    }
    await expect(svc.getProjectByIdService(PROJECT, OUTSIDER)).rejects.toEqual(status(403));
  });

  test("the membership list is stripped from the project response", async () => {
    await expect(svc.getProjectByIdService(PROJECT, OWNER)).resolves.not.toHaveProperty("project_members");
  });

  test("unknown project -> 404", async () => {
    await expect(svc.getProjectByIdService(TASK, OWNER)).rejects.toEqual(status(404));
  });

  test("only the owner may update or delete", async () => {
    await expect(svc.updateProjectService(PROJECT, OWNER, { name: "New" })).resolves.toBeDefined();
    await expect(svc.updateProjectService(PROJECT, ADMIN, { name: "New" })).rejects.toEqual(status(403));
    await expect(svc.deleteProjectService(PROJECT, MEMBER)).rejects.toEqual(status(403));
    await expect(svc.deleteProjectService(PROJECT, OWNER)).resolves.toBeDefined();
  });
});

describe("members", () => {
  test("owner and admin may add; members may not", async () => {
    await expect(svc.addMemberService(PROJECT, OWNER, OUTSIDER, "member")).resolves.toBeDefined();
    await expect(svc.addMemberService(PROJECT, ADMIN, OUTSIDER, "admin")).resolves.toBeDefined();
    await expect(svc.addMemberService(PROJECT, MEMBER, OUTSIDER, "member")).rejects.toEqual(status(403));
  });

  test("adding an existing member -> 409", async () => {
    await expect(svc.addMemberService(PROJECT, OWNER, MEMBER, "member")).rejects.toEqual(status(409));
  });

  test("the owner's role cannot be changed", async () => {
    await expect(svc.updateMemberService(PROJECT, ADMIN, OWNER, "member")).rejects.toEqual(status(400));
  });

  test("members may leave; they may not remove others", async () => {
    await expect(svc.removeMemberService(PROJECT, MEMBER, MEMBER)).resolves.toBeUndefined();
    await expect(svc.removeMemberService(PROJECT, MEMBER, ADMIN)).rejects.toEqual(status(403));
  });

  test("nobody can remove the owner", async () => {
    await expect(svc.removeMemberService(PROJECT, OWNER, OWNER)).rejects.toEqual(status(400));
  });
});

describe("tasks", () => {
  test("B3: a task can be assigned to the owner at creation", async () => {
    await expect(
      svc.createProjectTasksService(PROJECT, ADMIN, { title: "Ship it", assigned_to: OWNER }),
    ).resolves.toMatchObject({ assigned_to: OWNER });
  });

  test("assigning to a non-member at creation -> 400", async () => {
    await expect(
      svc.createProjectTasksService(PROJECT, OWNER, { title: "Ship it", assigned_to: OUTSIDER }),
    ).rejects.toEqual(status(400));
  });

  test("outsiders cannot create tasks", async () => {
    await expect(svc.createProjectTasksService(PROJECT, OUTSIDER, { title: "Nope" })).rejects.toEqual(status(403));
  });

  test("a member may update their own task's status", async () => {
    await expect(svc.updateTasksService(PROJECT, MEMBER, TASK, { status: "completed" })).resolves.toBeDefined();
  });

  test("a member may not update someone else's task", async () => {
    task = { id: TASK, assigned_to: ADMIN };
    await expect(svc.updateTasksService(PROJECT, MEMBER, TASK, { status: "completed" })).rejects.toEqual(
      status(403),
    );
  });

  test("a member may not reassign or reprioritise, even their own task", async () => {
    await expect(svc.updateTasksService(PROJECT, MEMBER, TASK, { priority: 5 })).rejects.toEqual(status(403));
    await expect(svc.updateTasksService(PROJECT, MEMBER, TASK, { assigned_to: null })).rejects.toEqual(status(403));
  });

  test("owner and admin may change anything", async () => {
    await expect(svc.updateTasksService(PROJECT, ADMIN, TASK, { priority: 1, assigned_to: ADMIN })).resolves.toBeDefined();
    await expect(svc.updateTasksService(PROJECT, OWNER, TASK, { priority: 2 })).resolves.toBeDefined();
  });

  test("only owner and admin may delete", async () => {
    await expect(svc.deleteProjectTasksService(PROJECT, TASK, MEMBER)).rejects.toEqual(status(403));
    await expect(svc.deleteProjectTasksService(PROJECT, TASK, ADMIN)).resolves.toBeDefined();
  });

  test("missing task -> 404", async () => {
    task = null;
    await expect(svc.getProjectTaskService(PROJECT, OWNER, TASK)).rejects.toEqual(status(404));
  });

  test("members may create tasks for themselves but not set priority or assign others", async () => {
    await expect(
      svc.createProjectTasksService(PROJECT, MEMBER, { title: "Mine", assigned_to: MEMBER }),
    ).resolves.toBeDefined();
    await expect(
      svc.createProjectTasksService(PROJECT, MEMBER, { title: "Theirs", assigned_to: ADMIN }),
    ).rejects.toEqual(status(403));
    await expect(svc.createProjectTasksService(PROJECT, MEMBER, { title: "Hot", priority: 5 })).rejects.toEqual(
      status(403),
    );
  });

  test("updates may only assign people on the project", async () => {
    await expect(svc.updateTasksService(PROJECT, ADMIN, TASK, { assigned_to: OUTSIDER })).rejects.toEqual(status(400));
    await expect(svc.updateTasksService(PROJECT, ADMIN, TASK, { assigned_to: OWNER })).resolves.toBeDefined();
    await expect(svc.updateTasksService(PROJECT, ADMIN, TASK, { assigned_to: null })).resolves.toBeDefined();
  });
});
