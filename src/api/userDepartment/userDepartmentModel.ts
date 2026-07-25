import { commonValidations } from "@/common/utils/commonValidation";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define the UserDepartment schema
export const UserDepartmentSchema = z.object({
  _id: zId().optional(),
  name: z.string().min(2).max(100),
  shortName: z.string().min(0).max(20).optional(),
  description: z.string().min(0).max(500).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(0).max(50).optional(),
  departmentType: z.enum(["department", "center"]).default("department"),
  center: zId("UserDepartment").optional().nullable(), // Reference to center (only for departments)
  hasChildDepartments: z.boolean().optional(), // Computed field - true if this center has child departments
  /**
   * How long a generated external patient access code remains valid.
   * Format: a positive integer followed by a unit: h (hours), d (days), w (weeks).
   * Examples: "4h", "2d", "3w". Defaults to the system default (4 hours) when absent.
   */
  externalAccessCodeLife: z
    .string()
    .regex(/^\d+[hdw]$/, "Must be a positive number followed by h (hours), d (days) or w (weeks), e.g. '4h', '2d', '3w'")
    .optional(),
  /**
   * How long a case-level access code remains valid (codes bound to a patient case).
   * Format: Either a relative duration or a fixed date:
   * - Relative: "10y" (10 years from activation), "5y" (5 years)
   * - Fixed date: "2030-12-31" (YYYY-MM-DD)
   * If the fixed date is in the past, defaults to 10 years from activation.
   * Defaults to 10 years when absent.
   */
  patientCaseAccessCodeValidUntil: z
    .string()
    .regex(/^(\d+y|\d{4}-\d{2}-\d{2})$/, "Must be either years (e.g. '10y', '5y') or a fixed date (YYYY-MM-DD)")
    .optional(),
  consultationAccessDaysBefore: z.number().int().min(0).max(365).optional(),
  consultationAccessDaysAfter: z.number().int().min(0).max(365).optional(),
});

// Infer TypeScript type from the schema
export type UserDepartment = z.infer<typeof UserDepartmentSchema>;

/** Create Mongoose Schema and Model */
const MongooseUserDepartmentSchema = zodSchema(UserDepartmentSchema.omit({ _id: true }));
export const userDepartmentModel = mongoose.model("UserDepartment", MongooseUserDepartmentSchema, "userDepartments");

// ****************************************************
// Input validation

// Input validation for 'GET userDepartment/:id' endpoint
export const GetUserDepartmentSchema = z.object({
  params: z.object({ id: commonValidations.id }),
});

// Input validation for 'POST userDepartment' endpoint
export const CreateUserDepartmentSchema = z.object({
  body: UserDepartmentSchema.omit({ _id: true, hasChildDepartments: true }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

// Input validation for 'PUT userDepartment/:id' endpoint
export const UpdateUserDepartmentSchema = z.object({
  params: z.object({ id: commonValidations.id }),
  body: UserDepartmentSchema.omit({ _id: true, hasChildDepartments: true }).partial(),
});

// Input validation for 'DELETE userDepartment/:id' endpoint
export const DeleteUserDepartmentSchema = z.object({
  params: z.object({ id: commonValidations.id }),
});

// Input validation for 'PATCH userDepartment/:id/code-life' endpoint (doctor+ only)
export const UpdateCodeLifeSchema = z.object({
  params: z.object({ id: commonValidations.id }),
  body: z.object({
    externalAccessCodeLife: z
      .string()
      .regex(/^\d+[hdw]$/, "Must be a positive number followed by h (hours), d (days) or w (weeks), e.g. '4h', '2d', '3w'"),
  }),
});

export const UpdateConsultationAccessWindowSchema = z.object({
  params: z.object({ id: commonValidations.id }),
  body: z.object({
    consultationAccessDaysBefore: z.number().int().min(0).max(365),
    consultationAccessDaysAfter: z.number().int().min(0).max(365),
  }),
});

// Input validation for 'PATCH userDepartment/:id/case-code-validity' endpoint (doctor+ only)
export const UpdateCaseCodeValiditySchema = z.object({
  params: z.object({ id: commonValidations.id }),
  body: z.object({
    patientCaseAccessCodeValidUntil: z
      .string()
      .regex(/^(\d+y|\d{4}-\d{2}-\d{2})$/, "Must be either years (e.g. '10y', '5y') or a fixed date (YYYY-MM-DD)"),
  }),
});

export type UpdateCodeLife = z.infer<typeof UpdateCodeLifeSchema>["body"];
export type UpdateConsultationAccessWindow = z.infer<typeof UpdateConsultationAccessWindowSchema>["body"];
