import { z } from "zod";

const email = z
  .string("Email is required")
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

export const userRegisterSchema = z
  .object({
    email,
    full_name: z
      .string("Full name is required")
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be at most 100 characters"),
    password: z
      .string("Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be at most 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
  })
  .strict();

export const userLoginSchema = z
  .object({
    email,
    password: z.string("Password is required").min(1, "Password is required"),
  })
  .strict();

export type UserRegisterInput = z.infer<typeof userRegisterSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
