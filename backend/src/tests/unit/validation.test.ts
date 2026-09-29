import { describe, expect, mock, test } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import { userLoginSchema, userRegisterSchema } from "../../modules/auth/auth.schema";
import {
  addMemberSchema,
  createTasksSchema,
  taskParamsSchema,
  updateProjectSchema,
  updateTaskSchema,
} from "../../modules/projects/project.schema";
import { updateUserSchema } from "../../modules/users/users.schema";
import { validate } from "../../middleware/validate.middleware";

const UUID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

describe("auth schemas", () => {
  const valid = { email: "  Jane@Example.COM ", full_name: " Jane ", password: "Passw0rd!" };

  test("normalises email and name", () => {
    expect(userRegisterSchema.parse(valid)).toEqual({
      email: "jane@example.com",
      full_name: "Jane",
      password: "Passw0rd!",
    });
  });

  test.each([
    ["short", "Pa0!"],
    ["no uppercase", "passw0rd!"],
    ["no lowercase", "PASSW0RD!"],
    ["no number", "Password!"],
    ["no symbol", "Passw0rdd"],
  ])("rejects a password with %s", (_label, password) => {
    expect(userRegisterSchema.safeParse({ ...valid, password }).success).toBe(false);
  });

  test("rejects unknown keys (strict)", () => {
    expect(userLoginSchema.safeParse({ email: "a@b.co", password: "x", admin: true }).success).toBe(false);
  });
});

describe("project schemas", () => {
  test("update requires at least one field", () => {
    expect(updateProjectSchema.safeParse({}).success).toBe(false);
    expect(updateProjectSchema.safeParse({ status: "archived" }).success).toBe(true);
  });

  test("members cannot be added as owner", () => {
    expect(addMemberSchema.safeParse({ user_id: UUID, role: "owner" }).success).toBe(false);
    expect(addMemberSchema.parse({ user_id: UUID }).role).toBe("member");
  });

  test("task priority must be an integer 1-5", () => {
    for (const priority of [0, 6, 2.5]) {
      expect(createTasksSchema.safeParse({ title: "Do it", priority }).success).toBe(false);
    }
    expect(createTasksSchema.safeParse({ title: "Do it", priority: 5 }).success).toBe(true);
  });

  test("due_date must be YYYY-MM-DD and becomes a UTC midnight Date", () => {
    expect(createTasksSchema.safeParse({ title: "Do it", due_date: "10/01/2026" }).success).toBe(false);
    const parsed = createTasksSchema.parse({ title: "Do it", due_date: "2026-10-01" });
    expect(parsed.due_date?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  test("cancelled is not a writable status", () => {
    expect(updateTaskSchema.safeParse({ status: "cancelled" }).success).toBe(false);
  });

  test("update allows clearing nullable fields", () => {
    expect(updateTaskSchema.safeParse({ assigned_to: null, due_date: null, description: null }).success).toBe(true);
  });

  test("task route param is spelled tasksId", () => {
    expect(taskParamsSchema.safeParse({ projectId: UUID, tasksId: UUID }).success).toBe(true);
    expect(taskParamsSchema.safeParse({ projectId: UUID, taskId: UUID }).success).toBe(false);
  });
});

describe("user schema", () => {
  test("phone pattern and bio length", () => {
    expect(updateUserSchema.safeParse({ phone: "12" }).success).toBe(false);
    expect(updateUserSchema.safeParse({ phone: "+91 98765 43210" }).success).toBe(true);
    expect(updateUserSchema.safeParse({ bio: "x".repeat(501) }).success).toBe(false);
  });
});

describe("validate middleware", () => {
  function run(req: Partial<Request>) {
    const next = mock(() => {}) as unknown as NextFunction;
    let error: any;
    try {
      validate({ params: taskParamsSchema, body: createTasksSchema })(
        { params: {}, query: {}, ...req } as Request,
        {} as Response,
        next,
      );
    } catch (e) {
      error = e;
    }
    return { error, next };
  }

  test("reports params and body problems together, as 422 when the body is bad", () => {
    const { error, next } = run({ params: { projectId: "x", tasksId: UUID }, body: { title: "" } });
    expect(next).not.toHaveBeenCalled();
    expect(error.statusCode).toBe(422);
    expect(Object.keys(error.fieldErrors).sort()).toEqual(["projectId", "title"]);
  });

  test("bad params alone are a 400", () => {
    const { error } = run({ params: { projectId: "x", tasksId: UUID }, body: { title: "Fine" } });
    expect(error.statusCode).toBe(400);
  });

  test("stores parsed values and calls next", () => {
    const req = { params: { projectId: UUID, tasksId: UUID }, query: {}, body: { title: "  Trim me " } } as unknown as Request;
    const next = mock(() => {}) as unknown as NextFunction;
    validate({ params: taskParamsSchema, body: createTasksSchema })(req, {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({ title: "Trim me" });
    expect(req.validated?.params).toEqual({ projectId: UUID, tasksId: UUID });
  });
});
