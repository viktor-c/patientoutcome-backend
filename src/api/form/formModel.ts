import { FormTemplate } from "@/api/formtemplate/formTemplateModel";
import { CreateNoteSchema, NoteSchema, dateSchema } from "@/api/generalSchemas";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define Zod schemas for scoring data structures
const SubscaleScoreSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  rawScore: z.number().nullable().optional(),
  normalizedScore: z.number().nullable().optional(),
  maxPossibleScore: z.number().optional(),
  answeredQuestions: z.number().optional(),
  totalQuestions: z.number().optional(),
  completionPercentage: z.number().optional(),
  isComplete: z.boolean().optional(),
});

// Use z.any() for rawData and subscales to allow flexible nested objects
// This bypasses zodSchema's type inference and lets Mongoose store any structure
const ScoringDataSchema = z.object({
  rawData: z.any().optional(), // Allow any structure for rawData (sections with questions)
  subscales: z.any().optional(), // Allow any structure for subscales
  total: z.any().optional(), // Allow any structure for total
});

// Define the Form schema
export const Form = FormTemplate.extend({
  caseId: zId("PatientCase"),
  consultationId: zId("Consultation"),
  formTemplateId: zId("FormTemplate"),
  createdAt: z.date().optional(),
  formFillStatus: z.enum(["draft", "incomplete", "completed"]).default("draft"),
  updatedAt: z.date().optional(),
  completedAt: z.date().optional(),
  // Form fill timing fields
  formStartTime: z.date().optional(),
  formEndTime: z.date().optional(),
  completionTimeSeconds: z.number().positive().optional(),
  // Soft delete fields
  deletedAt: z.date().optional().nullable(),
  deletedBy: zId("User").optional().nullable(),
  deletionReason: z.string().optional().nullable(),
}).strict();

// Infer TypeScript type from Zod schema
export type Form = z.infer<typeof Form>;

// Create Mongoose schema from the Form schema
const FormSchema = zodSchema(Form.omit({ _id: true }));

export const FormModel = mongoose.model("Form", FormSchema, "forms");
