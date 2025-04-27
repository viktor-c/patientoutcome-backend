import { zId } from "@zodyac/zod-mongoose";
import { zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Define the FormTemplate schema
export const FormTemplate = z
  .object({
    _id: zId().optional(),
    title: z.string(),
    description: z.string(),
    markdownHeader: z.string(),
    markdownFooter: z.string(),
    formSchema: z.object({}).passthrough(),
    formSchemaUI: z.object({}).passthrough(),
    formData: z.object({}).passthrough(),
  })
  .strict();

// infer typescript type from zod schema
export type FormTemplate = z.infer<typeof FormTemplate>;

// Create Mongoose schema from the FormTemplate schema
const FormTemplateSchema = zodSchema(FormTemplate.omit({ _id: true }));

export const FormTemplateModel = mongoose.model("FormTemplate", FormTemplateSchema, "formtemplates");

// ****************************************************
// Response validation
export const FormTemplateArray = z.array(FormTemplate);

// ****************************************************
// Input validation

// input validation for GET /formtemplate/{templateId}
export const GetFormTemplateSchema = z.object({
  params: z.object({
    templateId: z.string(),
  }),
});

// input validation for POST /formtemplate
export const CreateFormTemplateSchema = z.object({
  body: FormTemplate,
});
