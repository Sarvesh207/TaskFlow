import { expect } from "bun:test";
import { TestClient } from "./client";

export const PASSWORD = "Passw0rd!";

export interface TestUser {
  id: string;
  email: string;
  full_name: string;
  client: TestClient;
}

let counter = 0;

/** Register a fresh user and return a client already signed in as them. */
export async function registerAndLogin(baseUrl: string, fullName = "Test User"): Promise<TestUser> {
  const client = new TestClient(baseUrl);
  const email = `${fullName.toLowerCase().replace(/\W+/g, ".")}.${Date.now()}.${++counter}@example.com`;

  const reg = await client.post("/auth/register", { email, full_name: fullName, password: PASSWORD });
  expect(reg.status).toBe(201);

  const login = await client.post("/auth/login", { email, password: PASSWORD });
  expect(login.status).toBe(200);

  return { id: reg.body.data.id, email, full_name: fullName, client };
}

export async function createProject(
  owner: TestUser,
  body: { name?: string; description?: string; status?: string } = {},
): Promise<{ id: string; name: string }> {
  const res = await owner.client.post("/projects", { name: "Website Redesign", ...body });
  expect(res.status).toBe(201);
  return res.body.data;
}

export async function addMember(
  actor: TestUser,
  projectId: string,
  user: TestUser,
  role: "admin" | "member" = "member",
): Promise<void> {
  const res = await actor.client.post(`/projects/${projectId}/members`, { user_id: user.id, role });
  expect(res.status).toBe(201);
}

export async function createTask(
  actor: TestUser,
  projectId: string,
  body: Record<string, unknown> = {},
): Promise<{ id: string; [key: string]: unknown }> {
  const res = await actor.client.post(`/projects/${projectId}/tasks`, { title: "A task", ...body });
  expect(res.status).toBe(201);
  return res.body.data;
}
