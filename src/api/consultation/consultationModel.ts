import { Form } from "@/api/form/formModel";
import { CreateNoteSchema, NoteSchema, dateSchema } from "@/api/generalSchemas";
import { zId, zodSchema, zodSchemaRaw } from "@zodyac/zod-mongoose";
import mongoose, { Schema } from "mongoose";
import { z } from "zod";

// Extend zod with OpenAPI support

// Define the Image schema for creation (allows optional createdBy in notes)
export const CreateImageSchema = z.object({
  path: z.string(),
  format: z.string(),
  dateAdded: dateSchema,
  addedBy: zId("User"),
  notes: z.array(CreateNoteSchema),
});

// Define the Image schema
export const ImageSchema = z.object({
  path: z.string(),
  format: z.string(),
  dateAdded: dateSchema,
  addedBy: zId("User"),
  notes: z.array(NoteSchema),
});

// Define the PatientCaseConsultation schema (for database)
export const ConsultationSchema = z.object({
  _id: zId().optional(),
  __v: z.number().optional(),
  patientCaseId: zId("PatientCase"),
  dateAndTime: dateSchema,
  reasonForConsultation: z.array(z.enum(["planned", "unplanned", "emergency", "pain", "followup"])),
  notes: z.array(NoteSchema),
  proms: z.array(zId("Form")),
  images: z.array(ImageSchema),
  visitedBy: z.array(zId("User")),
  formAccessCode: zId("FormAccessCode").optional(),
  kioskId: zId("User").optional().nullable(),
});

// Define the PatientCaseConsultation schema for OpenAPI (with populated forms)
export const ConsultationWithFormsSchema = ConsultationSchema.extend({
  proms: z.array(Form),
});

export const CreateConsultationSchema = ConsultationSchema.omit({
  _id: true,
  __v: true,
  formAccessCode: true,
  proms: true,
}).extend({
  formAccessCode: z.string().optional(),
  formTemplates: z.array(zId("FormTemplate")),
  notes: z.array(CreateNoteSchema),
  images: z.array(CreateImageSchema),
});

export const UpdateConsultationSchema = ConsultationSchema.partial().extend({
  notes: z.array(CreateNoteSchema).optional(),
  images: z.array(CreateImageSchema).optional(),
});

export const GetConsultationRequestSchema = z.object({
  params: z.object({ id: zId("Consultation") }),
});

export type Consultation = z.infer<typeof ConsultationSchema>;
export type ConsultationWithForms = z.infer<typeof ConsultationWithFormsSchema>;
export type CreateConsultation = z.infer<typeof CreateConsultationSchema>;
// Define the mongoose schema and model
const ConsultationMongooseSchema = zodSchema(ConsultationSchema.omit({ _id: true }));

export const consultationModel = mongoose.model<Consultation>(
  "Consultation",
  ConsultationMongooseSchema,
  "consultations",
);
