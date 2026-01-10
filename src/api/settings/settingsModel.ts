/**
 * @file Settings Model
 * @module api/settings
 * @description Defines the schema and types for application settings management
 */

import { z } from "zod";

// Base field validation schema
export const FieldValidationSchema = z.object({
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
});

// Translation schema for descriptions and help text
export const TranslationSchema = z.object({
  en: z.string(),
  de: z.string(),
});

// Setting field schema
export const SettingFieldSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean(),
  sensitive: z.boolean().optional().default(false),
  validation: FieldValidationSchema.optional(),
  description: TranslationSchema,
  helpText: TranslationSchema,
});

// Setting category schema
export const SettingCategorySchema = z.object({
  category: z.string(),
  priority: z.number(),
  fields: z.record(z.string(), SettingFieldSchema),
});

// Complete settings schema
export const SettingsConfigSchema = z.object({
  version: z.string(),
  settings: z.record(z.string(), SettingCategorySchema),
});

// Schema for updating settings (only values)
export const UpdateSettingsSchema = z.object({
  body: z.record(
    z.string(),
    z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  ),
});

// Schema for getting settings response
export const GetSettingsResponseSchema = SettingsConfigSchema;

// TypeScript types derived from schemas
export type FieldValidation = z.infer<typeof FieldValidationSchema>;
export type Translation = z.infer<typeof TranslationSchema>;
export type SettingField = z.infer<typeof SettingFieldSchema>;
export type SettingCategory = z.infer<typeof SettingCategorySchema>;
export type SettingsConfig = z.infer<typeof SettingsConfigSchema>;
export type UpdateSettings = z.infer<typeof UpdateSettingsSchema>;

// Helper type for setting values only (for updates)
export type SettingValues = {
  [category: string]: {
    [field: string]: string | number | boolean;
  };
};
