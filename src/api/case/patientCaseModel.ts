import { AnaesthesiaTypeSchema, CreateNoteSchema, NoteSchema, dateSchema } from "@/api/generalSchemas";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

export const DiagnosisSchema = z.string();
export type DiagnosisSchema = z.infer<typeof DiagnosisSchema>;

export const CreatePatientCaseSchema = z.object({
  _id: zId(),
  externalId: z.string().optional(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
  patient: zId("Patient"),
  mainDiagnosis: z.array(DiagnosisSchema).optional(),
  studyDiagnosis: z.array(DiagnosisSchema).optional(),
  mainDiagnosisICD10: z.array(DiagnosisSchema).optional(),
  studyDiagnosisICD10: z.array(DiagnosisSchema).optional(),
  otherDiagnosis: z.array(DiagnosisSchema).optional(),
  otherDiagnosisICD10: z.array(DiagnosisSchema).optional(),
  // Surgeries are now references to Surgery documents
  surgeries: z.array(zId("Surgery")),
  supervisors: z.array(zId("User")),
  notes: z.array(CreateNoteSchema),
  medicalHistory: z.string().optional(),
  consultations: z.array(zId("Consultation")).optional(),
  consultationTemplate: z.array(zId("ConsultationTemplate")).optional(),
});

export const PatientCaseSchema = z.object({
  _id: zId(),
  externalId: z.string().optional(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
  patient: zId("Patient"),
  mainDiagnosis: z.array(DiagnosisSchema).optional(),
  studyDiagnosis: z.array(DiagnosisSchema).optional(),
  mainDiagnosisICD10: z.array(DiagnosisSchema).optional(),
  studyDiagnosisICD10: z.array(DiagnosisSchema).optional(),
  otherDiagnosis: z.array(DiagnosisSchema).optional(),
  otherDiagnosisICD10: z.array(DiagnosisSchema).optional(),
  // Surgeries are now references to Surgery documents
  surgeries: z.array(zId("Surgery")),
  supervisors: z.array(zId("User")),
  //BUG could be a problem when editing existing cases and adding new notes, that it gets mixed up when validating existing and empty createdById
  notes: z.array(NoteSchema),
  medicalHistory: z.string().optional(),
  consultations: z.array(zId("Consultation")).optional(),
  consultationTemplate: z.array(zId("ConsultationTemplate")).optional(),
});

export type PatientCase = z.infer<typeof PatientCaseSchema>;
export type CreatePatientCase = z.infer<typeof CreatePatientCaseSchema>;

// For services that populate the surgeries field with actual Surgery objects
export type PatientCaseWithPopulatedSurgeries = Omit<PatientCase, "surgeries"> & {
  surgeries: import("../surgery/surgeryModel").Surgery[];
};

const MongoosePatientCaseSchema = zodSchema(PatientCaseSchema.omit({ _id: true }));
export const PatientCaseModel = mongoose.models.PatientCase || mongoose.model("PatientCase", MongoosePatientCaseSchema);
