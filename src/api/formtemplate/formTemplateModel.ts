import { zId } from "@zodyac/zod-mongoose";
import { zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

// Extend zod with OpenAPI support

// Legacy types - kept for backward compatibility during migration
export interface Questionnaire {
  [key: string]: number | string | null;
}

export interface CustomFormData {
  [key: string]: Questionnaire;
}

// Define the Questionnaire schema - legacy
export const QuestionnaireSchema = z.record(z.string(), z.union([z.number(), z.string()]).nullable());

// Define the CustomFormData schema - legacy
export const CustomFormDataSchema = z.record(z.string(), QuestionnaireSchema);

/**
 * Represents a single question answer
 */
export const QuestionAnswerSchema = z.record(
  z.string(),
  z.union([z.string(), z.number()]).nullable()
);

export interface QuestionAnswer {
  [key: string]: string | number | null;
}

/**
 * Represents form data with questions grouped by sections
 */
export const FormQuestionsSchema = z.record(z.string(), QuestionAnswerSchema);

/**
 * Represents form data with questions grouped by sections.
 * Each section maps question keys to answers (string | number | null).
 */
export interface FormQuestions {
  [sectionKey: string]: QuestionAnswer;
}

/**
 * Represents a subscale score (e.g., Walking & Standing, Pain, Social Interaction)
 */
export const SubscaleScoreSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  rawScore: z.number(),
  normalizedScore: z.number().optional(),
  maxScore: z.number().optional(),
  minScore: z.number().optional(),
  answeredQuestions: z.number().optional(),
  totalQuestions: z.number().optional(),
  completionPercentage: z.number().optional(),
  isComplete: z.boolean(),
});

export interface SubscaleScore {
  name: string;
  description?: string | null;
  rawScore: number;
  normalizedScore?: number;
  maxScore?: number;
  minScore?: number;
  answeredQuestions?: number;
  totalQuestions?: number;
  completionPercentage?: number;
  isComplete: boolean;
}

/**
 * patientFormData:
 *  - this is a standard interface and describes how the form data looks like for a specific form.
 *  - the frontend renderer fills out this object when the backend sends a null.
 *  - this has the advantage of having a single source of truth. Each form has different subscales,
 *    so the management is secured by the plugins on the frontend.
 */
export const PatientFormDataSchema = z.object({
  rawFormData: FormQuestionsSchema,
  subscales: z.record(z.string(), SubscaleScoreSchema.nullable()).optional(),
  totalScore: SubscaleScoreSchema.nullable().optional(),
  fillStatus: z.enum(["draft", "incomplete", "complete"]),
  completedAt: z.coerce.date().nullable(),
  beginFill: z.coerce.date().nullable(),
});

export interface PatientFormData {
  rawFormData: FormQuestions;
  subscales?: {
    [key: string]: SubscaleScore | null;
  };
  totalScore?: SubscaleScore | null;
  fillStatus: "draft" | "incomplete" | "complete";
  completedAt: Date | null;
  beginFill: Date | null;
}

// Define the FormTemplate schema - simplified to only metadata
// Supports frontend-provided ObjectIds for consistent cross-system form identification
export const FormTemplate = z
  .object({
    _id: z.union([zId(), z.string()]).optional(), // Allow frontend to provide ObjectId as string
    title: z.string().min(1, "Title is required"),
    description: z.string(),
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

// API response schema (for OpenAPI generation) - converts zId to string
export const FormTemplateApiSchema = z.object({
  _id: z.string().optional(),
  title: z.string(),
  description: z.string(),
});

// ****************************************************
// Input validation

// input validation for GET /formtemplate/{templateId}
export const GetFormTemplateSchema = z.object({
  params: z.object({
    templateId: z.string(),
  }),
});

// Input validation for GET /formtemplate (with query params)
// Note: This schema validates req.query directly (not wrapped in { query: ... })
export const GetFormTemplatesQuerySchema = z.object({
  id: z.union([z.string(), z.array(z.string())]).optional(), // Single ID or array of IDs
  ids: z.array(z.string()).optional(), // Alternative: array of IDs
  departmentId: z.string().optional(), // Filter by department
});

// input validation for POST /formtemplate
// Allows frontend to provide _id as string (will be converted to ObjectId)
export const CreateFormTemplateSchema = z.object({
  body: z.object({
    _id: z
      .string()
      .refine((val) => {
        // Use MongoDB's isValidObjectId to validate format
        const mongoose = require("mongoose");
        return mongoose.isValidObjectId(val);
      }, "Invalid ObjectId format")
      .optional(),
    title: z.string().min(1, "Title is required"),
    description: z.string(),
  }).strict(),
});
