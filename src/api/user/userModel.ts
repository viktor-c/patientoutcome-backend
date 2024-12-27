import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose, { model } from "mongoose";

import { commonValidations } from "@/common/utils/commonValidation";

// Extend zod with OpenAPI support
extendZodWithOpenApi(z);

// Define the UserNoPassword schema
export const UserNoPasswordSchema = z.object({
  _id: zId(),
  username: z.string(),
  name: z.string(),
  department: z.string(),
  role: z.number().min(0),
  email: z.string().email(),
  lastLogin: z.string().datetime(),
  belongsToCenter: z.array(z.string()),
});

// Define the User schema by extending UserNoPasswordSchema
export const UserSchema = z.object({
  _id: zId(),
  username: z.string(),
  name: z.string(),
  department: z.string(),
  role: z.number().min(0),
  email: z.string().email(),
  lastLogin: z.string().datetime(),
  belongsToCenter: z.array(z.string()),

  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

// Infer TypeScript type from the schema
export type User = z.infer<typeof UserSchema>;
export type UserNoPassword = z.infer<typeof UserNoPasswordSchema>;

/** Create Mongoose Schema and Model */
const MongooseUserSchema = zodSchema(UserSchema);
export const userModel = mongoose.models.User || mongoose.model("User", MongooseUserSchema, "users");

// Input Validation for 'GET user/:id' endpoint
export const GetUserSchema = z.object({
  params: z.object({ id: commonValidations.id }),
});

// Input Validation for 'PUT user/:id' endpoint
export const UpdateUserSchema = z.object({
  params: z.object({ id: commonValidations.id }),
  body: UserSchema.partial(),
});
