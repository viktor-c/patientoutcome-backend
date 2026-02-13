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


/**
 * Represents form data with questions grouped by sections
 */
export const FormQuestionsSchema = z.record(z.string(), z.record(z.string(), z.union([z.string(), z.number()]).nullable()));

/**
 * Represents form data with questions grouped by sections.
 * Each section maps question keys to answers (string | number | null).
 */
export interface FormQuestions {
  [sectionKey: string]: { [questionKey: string]: string | number | null };
}

export const FormData = z
  .object({
    rawData: FormQuestionsSchema,
    scoring: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()]).nullable()),
    isComplete: z.boolean(),
    completedAt: z.string().nullable().optional(),
  }).strict();

// Define the FormTemplate schema
export const FormTemplate = z
  .object({
    _id: zId().optional(),
    title: z.string(),
    description: z.string(),
    formData: FormData,
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
