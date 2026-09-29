import { describe, expect, test } from "bun:test";
import { prisma } from "../helpers/db";
import { registerAndLogin } from "../helpers/factories";
import { useTestServer } from "./setup";

const ctx = useTestServer();

describe("users", () => {
  test("list and detail never expose password hashes", async () => {
    const user = await registerAndLogin(ctx.baseUrl, "Private Person");

    const list = await user.client.get("/users");
    expect(list.status).toBe(200);
    for (const u of list.body.data) expect(u).not.toHaveProperty("password_hash");

    const one = await user.client.get(`/users/${user.id}`);
    expect(one.body.data).not.toHaveProperty("password_hash");
    expect(JSON.stringify(one.body)).not.toContain("$2b$");
  });

  test("B2: the first profile edit creates the profile row", async () => {
    const user = await registerAndLogin(ctx.baseUrl, "Fresh User");
    expect(await prisma.user_profiles.count({ where: { user_id: user.id } })).toBe(0);

    const res = await user.client.patch(`/users/${user.id}`, { bio: "Hello", phone: "+91 98765 43210" });
    expect(res.status).toBe(200);
    expect(res.body.data.profile).toMatchObject({ bio: "Hello", phone: "+91 98765 43210" });

    // A second edit updates the same row.
    const again = await user.client.patch(`/users/${user.id}`, { bio: "Updated" });
    expect(again.body.data.profile).toMatchObject({ bio: "Updated", phone: "+91 98765 43210" });
    expect(await prisma.user_profiles.count({ where: { user_id: user.id } })).toBe(1);
  });

  test("account fields and profile fields can change together", async () => {
    const user = await registerAndLogin(ctx.baseUrl, "Old Name");
    const res = await user.client.patch(`/users/${user.id}`, { full_name: "New Name", bio: "Bio" });
    expect(res.body.data).toMatchObject({ full_name: "New Name", profile: { bio: "Bio" } });
  });

  test("invalid phone -> 422", async () => {
    const user = await registerAndLogin(ctx.baseUrl, "Phone");
    const res = await user.client.patch(`/users/${user.id}`, { phone: "12" });
    expect(res.status).toBe(422);
    expect(res.body.fieldErrors).toHaveProperty("phone");
  });

  test("unknown user -> 404", async () => {
    const user = await registerAndLogin(ctx.baseUrl, "Looker");
    const res = await user.client.get("/users/7c9e6679-7425-40de-944b-e07fc1f90ae7");
    expect(res.status).toBe(404);
  });

  test("users can only edit their own account", async () => {
    const alice = await registerAndLogin(ctx.baseUrl, "Alice");
    const mallory = await registerAndLogin(ctx.baseUrl, "Mallory");
    const res = await mallory.client.patch(`/users/${alice.id}`, { full_name: "Hacked" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
    expect((await alice.client.get(`/users/${alice.id}`)).body.data.full_name).toBe("Alice");
  });

  test("users can only delete their own account", async () => {
    const alice = await registerAndLogin(ctx.baseUrl, "Alice");
    const mallory = await registerAndLogin(ctx.baseUrl, "Mallory");
    expect((await mallory.client.delete(`/users/${alice.id}`)).status).toBe(403);
    expect((await alice.client.get(`/users/${alice.id}`)).status).toBe(200);

    expect((await mallory.client.delete(`/users/${mallory.id}`)).status).toBe(200);
  });
});
