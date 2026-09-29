import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { groupFieldErrors, handleZodError, toFieldErrors, ValidationError } from "../../utils/zod-error";

const schema = z
  .object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    members: z.array(z.object({ role: z.enum(["admin", "member"], "Bad role") })),
  })
  .strict();

function zodErrorOf(input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) throw new Error("expected a failure");
  return result.error;
}

describe("toFieldErrors", () => {
  test("uses dot paths for nested fields", () => {
    const errors = toFieldErrors(zodErrorOf({ title: "ok", members: [{ role: "boss" }] }));
    expect(errors).toEqual([{ field: "members.0.role", code: "invalid_value", message: "Bad role" }]);
  });

  test("expands unknown keys into one entry per key", () => {
    const errors = toFieldErrors(zodErrorOf({ title: "ok", members: [], a: 1, b: 2 }));
    expect(errors.map((e) => e.field)).toEqual(["a", "b"]);
    expect(errors[0]!.message).toBe('Unknown field "a" is not allowed');
  });

  test("reports object-level issues under _root", () => {
    const refined = z.object({ a: z.string().optional() }).refine((v) => v.a, "Provide at least one field");
    const result = refined.safeParse({});
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!)).toEqual([
      { field: "_root", code: "custom", message: "Provide at least one field" },
    ]);
  });
});

describe("groupFieldErrors", () => {
  test("groups messages by field", () => {
    expect(
      groupFieldErrors([
        { field: "title", code: "x", message: "one" },
        { field: "title", code: "y", message: "two" },
        { field: "email", code: "z", message: "three" },
      ]),
    ).toEqual({ title: ["one", "two"], email: ["three"] });
  });
});

describe("ValidationError", () => {
  test("defaults to 422 VALIDATION_ERROR with a field summary", () => {
    const err = new ValidationError(zodErrorOf({ title: "x", members: [] }));
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Validation failed for 1 field: title");
    expect(err.fieldErrors).toEqual({ title: ["Title must be at least 2 characters"] });
  });

  test("uses the issue message when nothing is field-specific", () => {
    const refined = z.object({}).refine(() => false, "Provide at least one field to update");
    const err = new ValidationError(refined.safeParse({}).error!);
    expect(err.message).toBe("Provide at least one field to update");
  });

  test("handleZodError ignores non-Zod errors", () => {
    expect(handleZodError(new Error("nope"))).toBeNull();
    expect(handleZodError(zodErrorOf({}))).toBeInstanceOf(ValidationError);
  });
});
