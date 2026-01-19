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
