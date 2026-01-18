import zodToMongoose, { zId } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

export const registrationCodeZod = z.object({
  code: z.string().regex(/^[A-Za-z0-9]{3}-[A-Za-z0-9]{3}-[A-Za-z0-9]{3}$/),
  createdAt: z.date(),
  activatedAt: z.date().nullable(),
  validUntil: z.date(),
  userCreatedWith: zId().nullable(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()).optional(),
  userDepartment: z.array(z.string()),
  userBelongsToCenter: z.string().optional(),
  active: z.boolean(),
});
export type RegistrationCode = z.infer<typeof registrationCodeZod>;
const registrationCodeSchema = zodToMongoose(registrationCodeZod);

export const RegistrationCodeModel = mongoose.model("RegistrationCode", registrationCodeSchema);
