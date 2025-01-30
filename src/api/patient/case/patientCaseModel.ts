import { AnaesthesiaTypeSchema, NoteSchema, dateSchema } from "@/api/generalSchemas";
import { zId, zodSchema, zodSchemaRaw } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { date, z } from "zod";

export const DiagnosisSchema = z.string();
export type DiagnosisSchema = z.infer<typeof DiagnosisSchema>;

/**
 * This is a schema for a surgery. It contains the following fields:
 */
export const SurgerySchema = z.object({
  _id: zId().optional(),
  externalId: z.string().optional(),
  diagnosis: z.array(DiagnosisSchema).optional(),
  diagnosisICD10: z.array(DiagnosisSchema).optional(),
  therapy: z.string().optional(),
  OPSCodes: z.array(z.string()).optional(),
  side: z.enum(["left", "right", "none"]),
  surgeryDate: dateSchema,
  surgeryTime: z.number().optional(),
  tourniqet: z.number().optional(),
  anaesthesiaType: AnaesthesiaTypeSchema.optional(),
  roentgenDosis: z.number().optional(),
  roentgenTime: z.string().optional(),
  additionalData: z.array(NoteSchema).optional(),
  surgeons: z.array(zId("User")),
});

export const PatientCaseSchema = z.object({
  _id: zId().optional(),
  patient: zId("Patient"),
  MainDiagnosis: z.array(DiagnosisSchema).optional(),
  StudyDiagnosis: z.array(DiagnosisSchema).optional(),
  MainDiagnosisICD10: z.array(DiagnosisSchema).optional(),
  StudyDiagnosisICD10: z.array(DiagnosisSchema).optional(),
  otherDiagnosis: z.array(DiagnosisSchema).optional(),
  OtherDiagnosisICD10: z.array(DiagnosisSchema).optional(),
  surgeries: z.array(SurgerySchema),
  supervisors: z.array(zId("User")),
  notes: z.array(NoteSchema),
  medicalHistory: z.string().optional(),
  consultations: z.array(zId("CaseConsultation")).optional(),
  consultationTemplate: z.array(zId("ConsultationTemplate")).optional(),
});

export type PatientCase = z.infer<typeof PatientCaseSchema>;

const MongoosePatientCaseSchema = zodSchema(PatientCaseSchema.omit({ _id: true }));
export const PatientCaseModel = mongoose.models.PatientCase || mongoose.model("PatientCase", MongoosePatientCaseSchema);
