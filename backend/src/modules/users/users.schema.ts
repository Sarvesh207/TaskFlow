import { z } from "zod";
import { uuidParam } from "../../types/global.types";

export const userIdSchema = z.object({
  id: uuidParam("id"),
});

export const updateUserSchema = z
  .object({
    email: z
      .string("Email must be text")
      .trim()
      .toLowerCase()
      .email("Enter a valid email address")
      .optional(),
    full_name: z
      .string("Full name must be text")
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be at most 100 characters")
      .optional(),
    avatar_url: z
      .string("Avatar URL must be text")
      .url("Avatar URL must be a valid URL")
      .optional(),
    bio: z
      .string("Bio must be text")
      .trim()
      .max(500, "Bio must be at most 500 characters")
      .optional(),
    phone: z
      .string("Phone must be text")
      .trim()
      .regex(
        /^\+?[0-9 ()-]{7,20}$/,
        "Phone must be 7-20 digits and may start with +",
      )
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    error: "Provide at least one field to update",
  });

export type UserIdParam = z.infer<typeof userIdSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
