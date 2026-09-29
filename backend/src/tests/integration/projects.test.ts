import { describe, expect, test } from "bun:test";
import { prisma } from "../helpers/db";
import { addMember, createProject, createTask, registerAndLogin } from "../helpers/factories";
import { useTestServer } from "./setup";

const ctx = useTestServer();

describe("projects", () => {
  test("create, read, update, delete as the owner", async () => {
    const owner = await registerAndLogin(ctx.baseUrl, "Owner");

    const created = await owner.client.post("/projects", { name: "Launch", description: "Q4", status: "active" });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const read = await owner.client.get(`/projects/${id}`);
    expect(read.body.data).toMatchObject({ id, name: "Launch", description: "Q4", status: "active", owner_id: owner.id });

    const updated = await owner.client.patch(`/projects/${id}`, { status: "archived" });
    expect(updated.status).toBe(200);
    expect((await owner.client.get(`/projects/${id}`)).body.data.status).toBe("archived");

    expect((await owner.client.delete(`/projects/${id}`)).status).toBe(200);
    expect((await owner.client.get(`/projects/${id}`)).status).toBe(404);
  });

  test("the list contains owned and joined projects only", async () => {
    const alex = await registerAndLogin(ctx.baseUrl, "Alex");
    const sam = await registerAndLogin(ctx.baseUrl, "Sam");
    const own = await createProject(alex, { name: "Alex's" });
    const shared = await createProject(sam, { name: "Shared" });
    await createProject(sam, { name: "Private" });
    await addMember(sam, shared.id, alex);

    const res = await alex.client.get("/projects");
    expect(res.body.data.map((p: { id: string }) => p.id).sort()).toEqual([own.id, shared.id].sort());
  });

  test("non-members get 403", async () => {
    const owner = await registerAndLogin(ctx.baseUrl, "Owner");
    const outsider = await registerAndLogin(ctx.baseUrl, "Outsider");
    const project = await createProject(owner);

    const res = await outsider.client.get(`/projects/${project.id}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  test("admins and members cannot edit or delete the project", async () => {
    const owner = await registerAndLogin(ctx.baseUrl, "Owner");
    const admin = await registerAndLogin(ctx.baseUrl, "Admin");
    const project = await createProject(owner);
    await addMember(owner, project.id, admin, "admin");

    expect((await admin.client.patch(`/projects/${project.id}`, { name: "Mine now" })).status).toBe(403);
    expect((await admin.client.delete(`/projects/${project.id}`)).status).toBe(403);
  });

  test("deleting a project removes its tasks and memberships", async () => {
    const owner = await registerAndLogin(ctx.baseUrl, "Owner");
    const member = await registerAndLogin(ctx.baseUrl, "Member");
    const project = await createProject(owner);
    await addMember(owner, project.id, member);
    await createTask(owner, project.id);

    await owner.client.delete(`/projects/${project.id}`);
    expect(await prisma.tasks.count({ where: { project_id: project.id } })).toBe(0);
    expect(await prisma.project_members.count({ where: { project_id: project.id } })).toBe(0);
  });

  test("update with an empty body -> 422 on _root", async () => {
    const owner = await registerAndLogin(ctx.baseUrl, "Owner");
    const project = await createProject(owner);
    const res = await owner.client.patch(`/projects/${project.id}`, {});
    expect(res.status).toBe(422);
    expect(res.body.fieldErrors).toHaveProperty("_root");
  });
});
