
import { z } from "zod";

export const createIncidentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters long")
    .max(150, "Title cannot exceed 150 characters"),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters long")
    .max(5000, "Description cannot exceed 5000 characters"),

  severity: z
    .enum(["low", "medium", "high", "critical"])
    .default("medium"),
});


export const updateIncidentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5)
      .max(150)
      .optional(),

    description: z
      .string()
      .trim()
      .min(10)
      .max(5000)
      .optional(),

    severity: z
      .enum(["low", "medium", "high", "critical"])
      .optional(),

    status: z
      .enum(["open", "in_progress", "resolved"])
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "Provide at least one field to update" }
  );
