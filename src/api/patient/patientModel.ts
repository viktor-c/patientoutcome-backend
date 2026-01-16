import { commonValidations } from "@/common/utils/commonValidation";

import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define the Patient schema
export const PatientSchema = z.object({
  _id: zId().optional(),
  externalPatientId: z.array(z.string()).optional(),
  sex: z.string().optional().nullable(),
  cases: z.array(zId("PatientCase")).optional(),
});

// Infer TypeScript type from the schema
export type Patient = z.infer<typeof PatientSchema>;

// Lightweight schema for search results - only returns IDs to minimize traffic
export const PatientSearchResultSchema = z.object({
  _id: zId().optional(),
  externalPatientId: z.array(z.string()),
});

export type PatientSearchResult = z.infer<typeof PatientSearchResultSchema>;

/** Create Mongoose Schema and Model */
const MongoosePatientSchema = zodSchema(PatientSchema.omit({ _id: true }));
export const patientModel = mongoose.model("Patient", MongoosePatientSchema, "patients");

// ****************************************************
// Input validation

// Input validation for 'GET patient/:id' endpoint
export const GetPatientSchema = z.object({
  params: z.object({ id: commonValidations.id }),
});

export const GetPatientByExternalIdSchema = z.object({
  params: z.object({ id: z.string() }),
});

// Input validation for 'GET patient/search/externalId/:searchQuery' endpoint (partial match)
export const SearchPatientsByExternalIdSchema = z.object({
  params: z.object({ searchQuery: z.string().min(3) }),
});

// Input validation for 'POST patient' endpoint
export const CreatePatientSchema = z.object({
  body: PatientSchema.omit({ _id: true, cases: true }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
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

// Schema for pagination query parameters
export const GetPatientsQuerySchema = z.object({
  query: z.object({
    page: z.string().transform(Number).pipe(z.number().min(1)).default("1"),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default("10"),
  }),
});

// Response schema for paginated patient list
export const PatientListSchema = z.object({
  patients: z.array(PatientSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});
