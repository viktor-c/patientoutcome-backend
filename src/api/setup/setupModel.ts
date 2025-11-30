import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

/**
 * Setup Status Schema - indicates whether initial setup is required
 */
export const SetupStatusSchema = z.object({
  setupRequired: z.boolean().openapi({
    description: "Whether initial setup is required (no admin user exists)",
    example: true,
  }),
  hasAdminUser: z.boolean().openapi({
    description: "Whether at least one admin user exists",
    example: false,
  }),
  hasAnyUsers: z.boolean().openapi({
    description: "Whether any users exist in the database",
    example: false,
  }),
  databaseConnected: z.boolean().openapi({
    description: "Whether the database connection is established",
    example: true,
  }),
});

export type SetupStatus = z.infer<typeof SetupStatusSchema>;

/**
 * Create Admin Request Schema - data required to create the first admin user
 */
export const CreateAdminRequestSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .openapi({
      description: "Admin username",
      example: "admin",
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    )
    .openapi({
      description: "Admin password (must be strong)",
      example: "SecurePass123!",
    }),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .openapi({
      description: "Full name of the admin user",
      example: "System Administrator",
    }),
  email: z.string().email("Invalid email format").openapi({
    description: "Admin email address",
    example: "admin@example.com",
  }),
  department: z.string().min(1, "Department is required").default("Administration").openapi({
    description: "Department of the admin user",
    example: "Administration",
  }),
  belongsToCenter: z
    .array(z.string())
    .min(1, "At least one center is required")
    .default(["1"])
    .openapi({
      description: "Center IDs the admin belongs to",
      example: ["1"],
    }),
});

export type CreateAdminRequest = z.infer<typeof CreateAdminRequestSchema>;

/**
 * Seed Request Schema - options for seeding demo data
 */
export const SeedRequestSchema = z.object({
  seedUsers: z.boolean().default(true).openapi({
    description: "Whether to seed demo users",
    example: true,
  }),
  seedPatients: z.boolean().default(true).openapi({
    description: "Whether to seed demo patients",
    example: true,
  }),
  seedBlueprints: z.boolean().default(true).openapi({
    description: "Whether to seed blueprint templates",
    example: true,
  }),
  seedForms: z.boolean().default(true).openapi({
    description: "Whether to seed demo forms",
    example: true,
  }),
  seedAll: z.boolean().default(false).openapi({
    description: "Seed all demo data (overrides individual options)",
    example: true,
  }),
});

export type SeedRequest = z.infer<typeof SeedRequestSchema>;

/**
 * Setup Complete Response Schema
 */
export const SetupCompleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  adminUserId: z.string().optional(),
});

export type SetupCompleteResponse = z.infer<typeof SetupCompleteResponseSchema>;
