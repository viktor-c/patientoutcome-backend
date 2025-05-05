import { Form } from "@/api/form/formModel";
import { NoteSchema, dateSchema } from "@/api/generalSchemas";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define the Image schema
export const ImageSchema = z.object({
  path: z.string(),
  format: z.string(),
  dateAdded: dateSchema,
  addedBy: zId("User"),
  notes: z.array(NoteSchema),
});

// Define the PatientCaseConsultation schema
export const ConsultationSchema = z.object({
  _id: zId().optional(),
  __v: z.number().optional(),
  patientCaseId: zId("PatientCase"),
  dateAndTime: dateSchema,
  reasonForConsultation: z.array(z.enum(["planned", "unplanned", "emergency", "pain", "followup"])),
  notes: z.array(NoteSchema),
  proms: z.array(Form),
  images: z.array(ImageSchema),
  visitedBy: z.array(zId("User")),
});

export const CreateConsultationSchema = ConsultationSchema.omit({ _id: true, __v: true }).extend({
  formTemplates: z.array(zId("FormTemplate")),
});

export const UpdateConsultationSchema = z.object({
  params: z.object({ id: zId("Consultation") }),
  body: ConsultationSchema.partial(),
});
export const GetConsultationSchema = z.object({
  params: z.object({ id: zId("Consultation") }),
});

export type Consultation = z.infer<typeof ConsultationSchema>;
export type CreateConsultation = z.infer<typeof CreateConsultationSchema>;
// Define the mongoose schema and model
const ConsultationMongooseSchema = zodSchema(ConsultationSchema.omit({ _id: true }));

export const consultationModel = mongoose.model<Consultation>(
  "Consultation",
  ConsultationMongooseSchema,
  "consultations",
);
