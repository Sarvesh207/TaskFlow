/**
 * Email invites end to end through the real routes and database, with only
 * the email sender replaced: each "sent" email is captured so the test can
 * follow its link like the recipient would.
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { InviteEmail } from "../../modules/invites/mailer";
import { TestClient } from "../helpers/client";
import { prisma } from "../helpers/db";
import { addMember, createProject, PASSWORD, registerAndLogin, type TestUser } from "../helpers/factories";
import { useTestServer } from "./setup";

const sent: InviteEmail[] = [];
const sendInviteEmail = mock(async (email: InviteEmail) => {
  sent.push(email);
});
mock.module("../../modules/invites/mailer", () => ({ sendInviteEmail }));

const ctx = useTestServer();

let owner: TestUser, admin: TestUser, member: TestUser, outsider: TestUser;
let projectId: string;
const invitesPath = (suffix = "") => `/projects/${projectId}/invites${suffix}`;

/** The token from the most recent email's link. */
function lastToken(): string {
  const link = sent.at(-1)?.link;
  if (!link) throw new Error("No invite email was sent");
  return link.split("/invite/")[1]!;
}

async function signUp(email: string, fullName = "New Person"): Promise<TestClient> {
  const client = new TestClient(ctx.baseUrl);
  expect((await client.post("/auth/register", { email, full_name: fullName, password: PASSWORD })).status).toBe(201);
  expect((await client.post("/auth/login", { email, password: PASSWORD })).status).toBe(200);
  return client;
}

beforeEach(async () => {
  sent.length = 0;
  sendInviteEmail.mockClear();
  sendInviteEmail.mockImplementation(async (email: InviteEmail) => {
    sent.push(email);
  });
  owner = await registerAndLogin(ctx.baseUrl, "Owner");
  admin = await registerAndLogin(ctx.baseUrl, "Admin");
  member = await registerAndLogin(ctx.baseUrl, "Member");
  outsider = await registerAndLogin(ctx.baseUrl, "Outsider");
  projectId = (await createProject(owner, { name: "Website Relaunch" })).id;
  await addMember(owner, projectId, admin, "admin");
  await addMember(owner, projectId, member, "member");
});

describe("sending invites", () => {
  test("the owner invites an email; the email carries a link to the frontend", async () => {
    const res = await owner.client.post(invitesPath(), { email: "  New.Person@Example.com ", role: "admin" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: "new.person@example.com", role: "admin" });
    expect(res.body.data).not.toHaveProperty("token_hash");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: "new.person@example.com",
      projectName: "Website Relaunch",
      inviterName: "Owner",
      role: "admin",
    });
    expect(sent[0]!.link).toMatch(/^http:\/\/localhost:5173\/invite\/[A-Za-z0-9_-]{43}$/);
  });

  test("the database stores only a hash of the token", async () => {
    await owner.client.post(invitesPath(), { email: "new@example.com" });
    const row = await prisma.project_invites.findFirstOrThrow();
    expect(row.token_hash).not.toBe(lastToken());
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("an admin can invite; a member and an outsider cannot", async () => {
    expect((await admin.client.post(invitesPath(), { email: "a@example.com" })).status).toBe(201);
    expect((await member.client.post(invitesPath(), { email: "b@example.com" })).status).toBe(403);
    expect((await outsider.client.post(invitesPath(), { email: "c@example.com" })).status).toBe(403);
    expect(sent).toHaveLength(1);
  });

  test("inviting someone already on the project -> 409 ALREADY_MEMBER", async () => {
    for (const email of [member.email, owner.email.toUpperCase()]) {
      const res = await admin.client.post(invitesPath(), { email });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("ALREADY_MEMBER");
      expect(res.body.fieldErrors?.email).toBeDefined();
    }
  });

  test("a second invite to the same email -> 409 until the first expires", async () => {
    expect((await owner.client.post(invitesPath(), { email: "dup@example.com" })).status).toBe(201);
    const again = await owner.client.post(invitesPath(), { email: "dup@example.com" });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("ALREADY_EXISTS");

    await prisma.project_invites.updateMany({ data: { expires_at: new Date(Date.now() - 1000) } });
    expect((await owner.client.post(invitesPath(), { email: "dup@example.com" })).status).toBe(201);
  });

  test("bad input -> 422 with field errors; owner role is not allowed", async () => {
    const res = await owner.client.post(invitesPath(), { email: "nope", role: "owner" });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.fieldErrors ?? {})).toEqual(expect.arrayContaining(["email", "role"]));
  });

  test("when the email cannot be sent -> 502 and no invite is left behind", async () => {
    sendInviteEmail.mockImplementation(async () => {
      throw new Error("Resend is down");
    });
    const res = await owner.client.post(invitesPath(), { email: "new@example.com" });
    expect(res.status).toBe(502);
    expect(res.body.code).toBe("EMAIL_FAILED");
    expect(await prisma.project_invites.count()).toBe(0);
  });
});

describe("managing pending invites", () => {
  test("owners and admins list open, unexpired invites; members cannot", async () => {
    await owner.client.post(invitesPath(), { email: "one@example.com" });
    await owner.client.post(invitesPath(), { email: "two@example.com", role: "admin" });

    const list = await admin.client.get(invitesPath());
    expect(list.status).toBe(200);
    expect(list.body.data.map((i: any) => i.email).sort()).toEqual(["one@example.com", "two@example.com"]);
    expect(list.body.data[0].inviter).toMatchObject({ id: owner.id, full_name: "Owner" });
    expect((await member.client.get(invitesPath())).status).toBe(403);
  });

  test("resend issues a new link; the old one stops working", async () => {
    const created = await owner.client.post(invitesPath(), { email: "new@example.com" });
    const oldToken = lastToken();

    const res = await owner.client.post(invitesPath(`/${created.body.data.id}/resend`));
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(2);
    expect(lastToken()).not.toBe(oldToken);

    expect((await ctx.anon().get(`/invites/${oldToken}`)).status).toBe(404);
    expect((await ctx.anon().get(`/invites/${lastToken()}`)).status).toBe(200);
  });

  test("revoke cancels the link and removes it from the list", async () => {
    const created = await owner.client.post(invitesPath(), { email: "new@example.com" });
    const token = lastToken();

    expect((await admin.client.delete(invitesPath(`/${created.body.data.id}`))).status).toBe(200);
    expect((await owner.client.get(invitesPath())).body.data).toHaveLength(0);

    const preview = await ctx.anon().get(`/invites/${token}`);
    expect(preview.body.data.status).toBe("revoked");
    const client = await signUp("new@example.com");
    const accept = await client.post(`/invites/${token}/accept`);
    expect(accept.status).toBe(410);
    expect(accept.body.code).toBe("INVITE_INVALID");
  });

  test("resend or revoke of an unknown invite -> 404", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    expect((await owner.client.post(invitesPath(`/${id}/resend`))).status).toBe(404);
    expect((await owner.client.delete(invitesPath(`/${id}`))).status).toBe(404);
  });
});

describe("accepting an invite", () => {
  test("anyone with the link sees a preview, without signing in", async () => {
    await admin.client.post(invitesPath(), { email: "new@example.com", role: "admin" });

    const res = await ctx.anon().get(`/invites/${lastToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      project: { id: projectId, name: "Website Relaunch" },
      inviter: { full_name: "Admin" },
      email: "new@example.com",
      role: "admin",
      status: "pending",
    });
  });

  test("an unknown or malformed token -> 404 / 400", async () => {
    expect((await ctx.anon().get(`/invites/${"x".repeat(43)}`)).status).toBe(404);
    expect((await ctx.anon().get("/invites/short")).status).toBe(400);
  });

  test("a new user signs up with the invited email and joins with the invited role", async () => {
    await owner.client.post(invitesPath(), { email: "New@Example.com", role: "admin" });
    const token = lastToken();
    const client = await signUp("new@example.com");

    const res = await client.post(`/invites/${token}/accept`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ project_id: projectId });

    const members = await owner.client.get(`/projects/${projectId}/members`);
    expect(members.body.data.find((m: any) => m.users.email === "new@example.com")).toMatchObject({ role: "admin" });
    expect((await client.get(`/projects/${projectId}`)).status).toBe(200);
    expect((await ctx.anon().get(`/invites/${token}`)).body.data.status).toBe("accepted");
    expect((await owner.client.get(invitesPath())).body.data).toHaveLength(0);
  });

  test("accepting twice is harmless", async () => {
    await owner.client.post(invitesPath(), { email: "new@example.com" });
    const client = await signUp("new@example.com");
    expect((await client.post(`/invites/${lastToken()}/accept`)).status).toBe(200);
    expect((await client.post(`/invites/${lastToken()}/accept`)).status).toBe(200);
    expect(await prisma.project_members.count({ where: { project_id: projectId } })).toBe(3);
  });

  test("a different account cannot use the link -> 403 INVITE_EMAIL_MISMATCH", async () => {
    await owner.client.post(invitesPath(), { email: "new@example.com" });

    const res = await outsider.client.post(`/invites/${lastToken()}/accept`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("INVITE_EMAIL_MISMATCH");
    expect(res.body.message).toContain("new@example.com");
  });

  test("accepting requires signing in -> 401", async () => {
    await owner.client.post(invitesPath(), { email: "new@example.com" });
    expect((await ctx.anon().post(`/invites/${lastToken()}/accept`)).status).toBe(401);
  });

  test("an expired invite -> 410 INVITE_EXPIRED", async () => {
    await owner.client.post(invitesPath(), { email: "new@example.com" });
    await prisma.project_invites.updateMany({ data: { expires_at: new Date(Date.now() - 1000) } });

    expect((await ctx.anon().get(`/invites/${lastToken()}`)).body.data.status).toBe("expired");
    const client = await signUp("new@example.com");
    const res = await client.post(`/invites/${lastToken()}/accept`);
    expect(res.status).toBe(410);
    expect(res.body.code).toBe("INVITE_EXPIRED");
  });

  test("someone who joined another way meanwhile keeps their role", async () => {
    await owner.client.post(invitesPath(), { email: outsider.email, role: "admin" });
    await addMember(owner, projectId, outsider, "member");

    expect((await outsider.client.post(`/invites/${lastToken()}/accept`)).status).toBe(200);
    const row = await prisma.project_members.findFirstOrThrow({ where: { project_id: projectId, user_id: outsider.id } });
    expect(row.role).toBe("member");
  });

  test("deleting the project removes its invites", async () => {
    await owner.client.post(invitesPath(), { email: "new@example.com" });
    expect((await owner.client.delete(`/projects/${projectId}`)).status).toBe(200);
    expect((await ctx.anon().get(`/invites/${lastToken()}`)).status).toBe(404);
  });
});
