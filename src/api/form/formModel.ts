import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define the Form schema
export const Form = z
  .object({
    _id: zId().optional(),
    patientId: zId(),
    caseId: zId(),
    consultationId: zId(),
    formTemplateId: zId(),
    formData: z.object({}).passthrough(),
    score: z.number(),
  })
  .strict();

// Infer TypeScript type from Zod schema
export type Form = z.infer<typeof Form>;

// Create Mongoose schema from the Form schema
const FormSchema = zodSchema(Form.omit({ _id: true }));

export const FormModel = mongoose.model("Form", FormSchema, "forms");
