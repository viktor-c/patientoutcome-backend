import { FormTemplate } from "@/api/formtemplate/formTemplateModel";
import { CreateNoteSchema, NoteSchema, dateSchema } from "@/api/generalSchemas";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define the Form schema
export const Form = FormTemplate.extend({
  caseId: zId("PatientCase"),
  consultationId: zId("Consultation"),
  formTemplateId: zId("FormTemplate"),
  score: z.number().optional(),
  createdAt: z.date().optional(),
  formFillStatus: z.enum(["draft", "incomplete", "completed"]).default("draft"),
  updatedAt: z.date().optional(),
  completedAt: z.date().optional(),
  // Form fill timing fields
  formStartTime: z.date().optional(),
  formEndTime: z.date().optional(),
  completionTimeSeconds: z.number().positive().optional(),
}).strict();

// Infer TypeScript type from Zod schema
export type Form = z.infer<typeof Form>;

// Create Mongoose schema from the Form schema
const FormSchema = zodSchema(Form.omit({ _id: true }));

export const FormModel = mongoose.model("Form", FormSchema, "forms");
