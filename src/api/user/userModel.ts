import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { zodSchema } from "@zodyac/zod-mongoose";
import mongoose, { model } from "mongoose";

import { commonValidations } from "@/common/utils/commonValidation";

// Extend zod with OpenAPI support
extendZodWithOpenApi(z);

// Define the UserNoPassword schema
export const UserNoPasswordSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  department: z.string(),
  role: z.number().min(0),
  email: z.string().email(),
  lastLogin: z.string().datetime(),
  belongsToCenter: z.array(z.string()),
});

// Define the User schema by extending UserNoPasswordSchema
export const UserSchema = UserNoPasswordSchema.extend({
  password: z.string(),
});

// Infer TypeScript type from the schema
export type User = z.infer<typeof UserSchema>;
export type UserNoPassword = z.infer<typeof UserNoPasswordSchema>;

/** Create Mongoose Schema and Model */
const MongooseUserSchema = zodSchema(UserSchema);
export const userModel = mongoose.models.User || mongoose.model("User", MongooseUserSchema, "users");

// Input Validation for 'GET users/:id' endpoint
export const GetUserSchema = z.object({
  params: z.object({ id: commonValidations.id }),
});
