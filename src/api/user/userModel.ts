import { zId, zodSchema, zodSchemaRaw } from "@zodyac/zod-mongoose";
import mongoose, { model, Mongoose } from "mongoose";
import { z } from "zod";

import { commonValidations } from "@/common/utils/commonValidation";

// Define the UserNoPassword schema
export const UserNoPasswordSchema = z.object({
  _id: zId().optional(),
  username: z.string(),
  name: z.string(),
  department: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()).optional(),
  email: z.string().email(),
  lastLogin: z.string().datetime().optional(),
  belongsToCenter: z.array(z.string()),
  // per-user frontend setting: how many days to look back for consultations
  daysBeforeConsultations: z.number().int().min(0).max(365).optional(),
  // consultationId for kiosk users - links a kiosk user to an active consultation
  consultationId: zId("Consultation").optional().nullable(),
  // postopWeek for kiosk users - sequential number indicating n-th kiosk user created
  postopWeek: z.number().int().min(1).optional(),
});

// Define the User schema by extending UserNoPasswordSchema
export const UserSchema = UserNoPasswordSchema.extend({
  password: z.string().min(6),
  confirmPassword: z.string().min(6).optional(),
  registerCode: z.string().min(8).optional(),
});

// Infer TypeScript type from the schema
export type User = z.infer<typeof UserSchema>;
export type UserNoPassword = z.infer<typeof UserNoPasswordSchema>;

/** Create Mongoose Schema and Model */
/***    REMOVE _id: we need it for typescript, but if we give it to mongoose.model, then we have the situation, where _id will not
 * automatically be created, and we have to provide it manually.
 * If we don't provide it, then we get an error "Error: document must have an _id before saving".
 */
const MongooseUserSchemaRaw = zodSchemaRaw(UserSchema.omit({ _id: true }));
// make password field not show up in the response by default; makes queries with subdocuments easier, because they don't populate the password field
//@ts-ignore
MongooseUserSchemaRaw.password.select = false;
Mongoose;
const MongooseUserSchema = new mongoose.Schema(MongooseUserSchemaRaw);

export const userModel = mongoose.model("User", MongooseUserSchema, "users");

// ****************************************************
// Input validation

// Input Validation for 'GET user/:id' endpoint
export const GetUserSchema = z.object({
  params: z.object({ id: commonValidations.id }),
});

// Input Validation for 'PUT user' endpoint (no id param)
export const UpdateUserSchema = z
  .object({
    id: z.string().min(1).optional(),
    username: z.string().min(3).max(50).optional(),
    name: z.string().min(3).max(50).optional(),
    department: z.string().min(3).max(50).optional(),
    email: z.string().email().optional(),
    roles: z.array(z.string()).optional(),
    belongsToCenter: z.array(z.string()).optional(),
    daysBeforeConsultations: z.number().int().min(0).max(365).optional(),
  })
  .strict();
// Input Validation for 'POST user' endpoint
export const CreateUserSchema = UserSchema.omit({
  _id: true,
  lastLogin: true,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Body schema for change password (without wrapper)
export const ChangePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .passthrough();

// Input Validation for 'PUT user/change-password' endpoint (with wrapper for validateRequest)
export const ChangePasswordSchema = z.object({
  body: ChangePasswordBodySchema,
});

// Infer TypeScript type from the schema
export type CreateUser = z.infer<typeof CreateUserSchema>;
