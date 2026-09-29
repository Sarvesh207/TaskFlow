import { beforeEach, describe, expect, test } from "bun:test";
import { addMember, createProject, registerAndLogin, type TestUser } from "../helpers/factories";
import { useTestServer } from "./setup";

const ctx = useTestServer();

let owner: TestUser, admin: TestUser, member: TestUser, outsider: TestUser;
let projectId: string;
const path = (userId = "") => `/projects/${projectId}/members${userId ? `/${userId}` : ""}`;

beforeEach(async () => {
  owner = await registerAndLogin(ctx.baseUrl, "Owner");
  admin = await registerAndLogin(ctx.baseUrl, "Admin");
  member = await registerAndLogin(ctx.baseUrl, "Member");
  outsider = await registerAndLogin(ctx.baseUrl, "Outsider");
  projectId = (await createProject(owner)).id;
  await addMember(owner, projectId, admin, "admin");
  await addMember(owner, projectId, member, "member");
});

describe("project members", () => {
  test("list includes each member's user details", async () => {
    const res = await member.client.get(path());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.find((m: any) => m.user_id === admin.id)).toMatchObject({
      role: "admin",
      users: { id: admin.id, email: admin.email, full_name: "Admin" },
    });
  });

  test("an admin can add members; a member cannot", async () => {
    expect((await admin.client.post(path(), { user_id: outsider.id })).status).toBe(201);
    const extra = await registerAndLogin(ctx.baseUrl, "Extra");
    expect((await member.client.post(path(), { user_id: extra.id })).status).toBe(403);
  });

  test("adding an existing member -> 409", async () => {
    expect((await owner.client.post(path(), { user_id: member.id })).status).toBe(409);
  });

  test("members cannot be added as owner", async () => {
    const res = await owner.client.post(path(), { user_id: outsider.id, role: "owner" });
    expect(res.status).toBe(422);
    expect(res.body.fieldErrors).toHaveProperty("role");
  });

  test("owner and admin can change roles; members cannot", async () => {
    expect((await member.client.put(path(admin.id), { role: "member" })).status).toBe(403);
    expect((await admin.client.put(path(member.id), { role: "admin" })).status).toBe(200);
    expect((await owner.client.get(path(member.id))).body.data.role).toBe("admin");
  });

  test("the owner's role cannot be changed and the owner cannot be removed", async () => {
    expect((await admin.client.put(path(owner.id), { role: "member" })).status).toBe(400);
    expect((await admin.client.delete(path(owner.id))).status).toBe(400);
  });

  test("a member can leave but cannot remove others", async () => {
    expect((await member.client.delete(path(admin.id))).status).toBe(403);
    expect((await member.client.delete(path(member.id))).status).toBe(200);
    expect((await member.client.get(`/projects/${projectId}`)).status).toBe(403);
  });

  test("outsiders cannot view the member list", async () => {
    expect((await outsider.client.get(path())).status).toBe(403);
  });
});
