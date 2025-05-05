import { FormTemplate } from "@/api/formtemplate/formTemplateModel";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define the Form schema
export const Form = FormTemplate.extend({
  patientId: zId("Patient"),
  caseId: zId("PatientCase"),
  consultationId: zId("Consultation"),
  formTemplateId: zId("FormTemplate"),
  score: z.number().optional(),
  createdAt: z.date().optional(),
  completedAt: z.date().optional(),
}).strict();

// Infer TypeScript type from Zod schema
export type Form = z.infer<typeof Form>;

// Create Mongoose schema from the Form schema
const FormSchema = zodSchema(Form.omit({ _id: true }));

export const FormModel = mongoose.model("Form", FormSchema, "forms");
