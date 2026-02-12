import { zId } from "@zodyac/zod-mongoose";
import { zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Extend zod with OpenAPI support

export interface Questionnaire {
  [key: string]: number | string | null;
}

export interface CustomFormData {
  [key: string]: Questionnaire;
}

// Define the Questionnaire schema
export const QuestionnaireSchema = z.record(z.string(), z.union([z.number(), z.string()]).nullable());

// Define the CustomFormData schema
export const CustomFormDataSchema = z.record(z.string(), QuestionnaireSchema);

// Define the FormTemplate schema
export const FormTemplate = z
  .object({
    _id: zId().optional(),
    title: z.string(),
    description: z.string(),
    formSchema: z.object({}).passthrough(),
    formSchemaUI: z.object({}).passthrough(),
    // formData: CustomFormDataSchema //this does not work when validating mongoose model. But zod validates.
    formData: z.object({}).passthrough(),
    // translations removed - now stored in plugin code instead of database
  })
  .strict();

// infer typescript type from zod schema
export type FormTemplate = z.infer<typeof FormTemplate>;

// Create Mongoose schema from the FormTemplate schema
const FormTemplateSchema = zodSchema(FormTemplate.omit({ _id: true }));

export const FormTemplateModel = mongoose.model("FormTemplate", FormTemplateSchema, "formtemplates");

//*************
// response schema validation only for a list of form templates
//  */
export const FormTemplateListSchema = z.array(
  FormTemplate.pick({
    _id: true,
    title: true,
    description: true,
  }).strict(),
);

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
