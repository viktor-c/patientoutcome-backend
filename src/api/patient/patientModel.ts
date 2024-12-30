import { commonValidations } from "@/common/utils/commonValidation";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Extend zod with OpenAPI support
extendZodWithOpenApi(z);

// Define the Patient schema
export const PatientSchema = z.object({
  _id: zId().optional(),
  externalPatientId: z.array(z.string()),
  age: z.number(),
  sex: z.string(),
  cases: z.array(z.object({ id: z.string(), description: z.string() })).optional(),
});

// Infer TypeScript type from the schema
export type Patient = z.infer<typeof PatientSchema>;

/** Create Mongoose Schema and Model */
const MongoosePatientSchema = zodSchema(PatientSchema.omit({ _id: true }));
export const patientModel = mongoose.models.Patient || mongoose.model("Patient", MongoosePatientSchema, "patients");

// Input validation for 'GET patient/:id' endpoint
export const GetPatientSchema = z.object({
  params: z.object({ id: commonValidations.id }),
});

// Input validation for 'POST patient' endpoint
export const CreatePatientSchema = z.object({
  body: PatientSchema.omit({ _id: true }),
});

// Input validation for 'PUT patient/:id' endpoint
export const UpdatePatientSchema = z.object({
  params: z.object({ id: commonValidations.id }),
  body: PatientSchema.partial(),
});

// Input validation for 'DELETE patient/:id' endpoint
export const DeletePatientSchema = z.object({
  params: z.object({ id: commonValidations.id }),
});
