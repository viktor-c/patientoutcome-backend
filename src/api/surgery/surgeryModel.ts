import { AnaesthesiaTypeSchema, CreateNoteSchema, NoteSchema, dateSchema } from "@/api/generalSchemas";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

export const DiagnosisSchema = z.string();
export type DiagnosisSchema = z.infer<typeof DiagnosisSchema>;

/**
 * This is a schema for a surgery for creation (allows optional createdBy in notes)
 */
export const CreateSurgerySchema = z.object({
  _id: zId(),
  externalId: z.string().optional(),
  diagnosis: z.array(DiagnosisSchema).optional(),
  diagnosisICD10: z.array(DiagnosisSchema).optional(),
  therapy: z.string().optional(),
  OPSCodes: z.array(z.string()).optional(),
  side: z.enum(["left", "right", "none"]),
  surgeryDate: dateSchema,
  surgeryTime: z.coerce.number().optional(),
  tourniquet: z.coerce.number().optional(),
  anaesthesiaType: AnaesthesiaTypeSchema.optional(),
  roentgenDosis: z.coerce.number().optional(),
  roentgenTime: z.string().optional(),
  additionalData: z.array(CreateNoteSchema).optional(),
  surgeons: z.array(zId("User")),
  // Add case reference to link surgery to case
  patientCase: zId("PatientCase"),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
});

/**
 * This is a schema for a surgery. It contains the following fields:
 */
export const SurgerySchema = z.object({
  _id: zId(),
  externalId: z.string().optional(),
  diagnosis: z.array(DiagnosisSchema).optional(),
  diagnosisICD10: z.array(DiagnosisSchema).optional(),
  therapy: z.string().optional(),
  OPSCodes: z.array(z.string()).optional(),
  side: z.enum(["left", "right", "none"]),
  surgeryDate: dateSchema,
  surgeryTime: z.number().optional(),
  tourniquet: z.number().optional(),
  anaesthesiaType: AnaesthesiaTypeSchema.optional(),
  roentgenDosis: z.number().optional(),
  roentgenTime: z.string().optional(),
  additionalData: z.array(NoteSchema).optional(),
  surgeons: z.array(zId("User")),
  // Add case reference to link surgery to case
  patientCase: zId("PatientCase"),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
});

export type Surgery = z.infer<typeof SurgerySchema>;
export type CreateSurgery = z.infer<typeof CreateSurgerySchema>;

const MongooseSurgerySchema = zodSchema(SurgerySchema.omit({ _id: true }));
export const SurgeryModel = mongoose.models.Surgery || mongoose.model("Surgery", MongooseSurgerySchema);
