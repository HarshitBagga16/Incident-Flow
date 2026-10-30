import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(60, { message: "Name must be at most 60 characters long" }),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Invalid email address" })),

  password: z
    .string()
    .min(4, { message: "Password must be at least 4 characters long" })
    .max(32, { message: "Password cannot exceed 32 characters" }),
});

export const loginSchema = z.object({
  email:z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Invalid email address" })),

  password:z
  .string()
  .min(4, { message: "Password must be at least 4 characters long" })
  .max(32, { message: "Password cannot exceed 32 characters" }),
})