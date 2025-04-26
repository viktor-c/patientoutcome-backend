import { NoteSchema, dateSchema } from "@/api/generalSchemas";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define the Form schema
export const FormSchema = z.object({
  id: z.string(),
  data: z.record(z.any()), // Placeholder for form data
  createdAt: z.date(),
  createdBy: zId("User"),
});

// Define the Image schema
export const ImageSchema = z.object({
  path: z.string(),
  format: z.string(),
  dateAdded: dateSchema,
  addedBy: zId("User"),
  notes: z.array(NoteSchema),
});

// Define the PatientCaseConsultation schema
export const PatientCaseConsultationSchema = z.object({
  _id: zId().optional(),
  __v: z.number().optional(),
  patientCaseId: zId("PatientCase"),
  dateAndTime: dateSchema,
  reasonForConsultation: z.array(z.enum(["planned", "unplanned", "emergency", "pain", "followup"])),
  notes: z.array(NoteSchema),
  proms: z.array(FormSchema),
  images: z.array(ImageSchema),
  visitedBy: z.array(zId("User")), // Assuming IUser is represented by a string ID
});

export type PatientCaseConsultation = z.infer<typeof PatientCaseConsultationSchema>;

// Define the mongoose schema and model
const PatientCaseConsultationMongooseSchema = zodSchema(PatientCaseConsultationSchema.omit({ _id: true }));

export const consultationModel = mongoose.model<PatientCaseConsultation>(
  "Consultation",
  PatientCaseConsultationMongooseSchema,
  "consultations",
);
