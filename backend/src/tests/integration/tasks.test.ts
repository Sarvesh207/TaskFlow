import { beforeEach, describe, expect, test } from "bun:test";
import { addMember, createProject, createTask, registerAndLogin, type TestUser } from "../helpers/factories";
import { useTestServer } from "./setup";

const ctx = useTestServer();

let owner: TestUser, admin: TestUser, member: TestUser, outsider: TestUser;
let projectId: string;
const tasks = (id = "") => `/projects/${projectId}/tasks${id ? `/${id}` : ""}`;

beforeEach(async () => {
  owner = await registerAndLogin(ctx.baseUrl, "Owner");
  admin = await registerAndLogin(ctx.baseUrl, "Admin");
  member = await registerAndLogin(ctx.baseUrl, "Member");
  outsider = await registerAndLogin(ctx.baseUrl, "Outsider");
  projectId = (await createProject(owner)).id;
  await addMember(owner, projectId, admin, "admin");
  await addMember(owner, projectId, member, "member");
});

describe("tasks", () => {
  test("B1: list, get and update responses include status", async () => {
    const task = await createTask(owner, projectId, { status: "in_progress" });

    const list = await member.client.get(tasks());
    expect(list.body.data[0].status).toBe("in_progress");

    const one = await member.client.get(tasks(task.id));
    expect(one.body.data.status).toBe("in_progress");

    const updated = await owner.client.put(tasks(task.id), { status: "completed" });
    expect(updated.body.data.status).toBe("completed");
  });

  test("create stores every field; due_date round-trips as a UTC date", async () => {
    const res = await admin.client.post(tasks(), {
      title: "Write docs",
      description: "All endpoints",
      priority: 5,
      due_date: "2026-10-01",
      assigned_to: member.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: "Write docs",
      description: "All endpoints",
      priority: 5,
      status: "pending",
      due_date: "2026-10-01T00:00:00.000Z",
      assigned_to: member.id,
    });
  });

  test("B3: a task can be assigned to the project owner", async () => {
    const res = await admin.client.post(tasks(), { title: "Review", assigned_to: owner.id });
    expect(res.status).toBe(201);
    expect(res.body.data.assigned_to).toBe(owner.id);
  });

  test("assigning to a non-member at creation -> 400", async () => {
    const res = await owner.client.post(tasks(), { title: "Nope", assigned_to: outsider.id });
    expect(res.status).toBe(400);
  });

  test("outsiders can neither read nor create tasks", async () => {
    expect((await outsider.client.get(tasks())).status).toBe(403);
    expect((await outsider.client.post(tasks(), { title: "Sneaky" })).status).toBe(403);
  });

  test("a member can update the status of their own task", async () => {
    const task = await createTask(owner, projectId, { assigned_to: member.id });
    const res = await member.client.put(tasks(task.id), { status: "in_progress" });
    expect(res.status).toBe(200);
  });

  test("a member cannot update someone else's task", async () => {
    const task = await createTask(owner, projectId, { assigned_to: admin.id });
    expect((await member.client.put(tasks(task.id), { status: "completed" })).status).toBe(403);
  });

  test("a member cannot reassign or reprioritise their own task", async () => {
    const task = await createTask(owner, projectId, { assigned_to: member.id });
    expect((await member.client.put(tasks(task.id), { priority: 5 })).status).toBe(403);
    expect((await member.client.put(tasks(task.id), { assigned_to: admin.id })).status).toBe(403);
  });

  test("owner/admin can clear the assignee, due date and description", async () => {
    const task = await createTask(owner, projectId, {
      assigned_to: member.id,
      due_date: "2026-10-01",
      description: "x",
    });
    const res = await admin.client.put(tasks(task.id), { assigned_to: null, due_date: null, description: null });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ assigned_to: null, due_date: null, description: null });
  });

  test("only owner and admin can delete", async () => {
    const task = await createTask(owner, projectId, { assigned_to: member.id });
    expect((await member.client.delete(tasks(task.id))).status).toBe(403);
    expect((await admin.client.delete(tasks(task.id))).status).toBe(200);
    expect((await owner.client.get(tasks(task.id))).status).toBe(404);
  });

  test("cancelled cannot be written", async () => {
    const task = await createTask(owner, projectId);
    const res = await owner.client.put(tasks(task.id), { status: "cancelled" });
    expect(res.status).toBe(422);
    expect(res.body.fieldErrors).toHaveProperty("status");
  });

  test("a task from another project is not reachable through this one", async () => {
    const other = await createProject(owner, { name: "Other" });
    const foreign = await createTask(owner, other.id);
    expect((await owner.client.get(tasks(foreign.id))).status).toBe(404);
  });

  test("assigning to a non-member on update -> 400", async () => {
    const task = await createTask(owner, projectId);
    const res = await admin.client.put(tasks(task.id), { assigned_to: outsider.id });
    expect(res.status).toBe(400);
    expect((await owner.client.get(tasks(task.id))).body.data.assigned_to).toBeNull();
  });

  test("the owner is a valid assignee on update", async () => {
    const task = await createTask(owner, projectId);
    expect((await admin.client.put(tasks(task.id), { assigned_to: owner.id })).status).toBe(200);
  });

  test("members creating a task may assign it to themselves or leave it unassigned", async () => {
    expect((await member.client.post(tasks(), { title: "Mine", assigned_to: member.id })).status).toBe(201);
    expect((await member.client.post(tasks(), { title: "Nobody's" })).status).toBe(201);
  });

  test("members creating a task may not assign others or set priority (same rule as update)", async () => {
    expect((await member.client.post(tasks(), { title: "Yours", assigned_to: admin.id })).status).toBe(403);
    expect((await member.client.post(tasks(), { title: "Urgent", priority: 5 })).status).toBe(403);
  });
});
