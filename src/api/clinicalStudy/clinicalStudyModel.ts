import { commonValidations } from "@/common/utils/commonValidation";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define the ClinicalStudy schema
export const ClinicalStudySchema = z.object({
  _id: zId().optional(),
  name: z.string(),
  description: z.string(),
  includedICD10Diagnosis: z.array(z.string()),
  creationDate: z.date(),
  beginDate: z.date(),
  endDate: z.date(),
  studyType: z.array(z.enum(["prospective", "retrospective", "randomised control trial", "blinded", "double blinded"])),
  studyNurses: z.array(zId("User")),
  supervisors: z.array(zId("User")),
});

// Infer TypeScript type from the schema
export type ClinicalStudy = z.infer<typeof ClinicalStudySchema>;

/** Create Mongoose Schema and Model */
const MongooseClinicalStudySchema = zodSchema(ClinicalStudySchema.omit({ _id: true }));

const personSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  age: Number,
  stories: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

export const clinicalStudyModel =
  mongoose.models.ClinicalStudy || mongoose.model("ClinicalStudy", MongooseClinicalStudySchema, "clinicalstudies");

// ****************************************************
// Input validation

// Input Validation for 'GET clinicalStudy/:id' endpoint
export const GetClinicalStudySchema = z.object({
  params: z.object({ id: commonValidations.id }),
});

// Input Validation for 'PUT user/:id' endpoint
export const UpdateClinicalStudySchema = z.object({
  params: z.object({ id: commonValidations.id }),
  body: ClinicalStudySchema.partial(),
});

export const GetClinicalStudyByDiagnosisSchema = z.object({
  params: z.object({ diagnosis: z.string() }),
});

export const GetClinicalStudyBySupervisorIdSchema = z.object({
  params: z.object({ supervisorId: z.string() }),
});

export const GetClinicalStudyByNurseIdSchema = z.object({
  params: z.object({ studyNurseId: z.string() }),
});
