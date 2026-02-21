/**
 * @file Form Version Model
 * @module api/form/formVersionModel
 * @description Tracks version history for form updates. Each time a form is updated,
 * a snapshot is saved with metadata about the change. This enables:
 * - Viewing past versions of forms
 * - Comparing different versions (diff view)
 * - Restoring previous versions
 * - Audit trail of who changed what and when
 */

import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";
import { PatientFormDataSchema } from "@/api/formtemplate/formTemplateModel";

/**
 * FormVersion schema - represents a snapshot of a form at a specific point in time
 */
export const FormVersion = z.object({
  _id: zId().optional(),
  formId: zId("Form"), // Reference to the current form
  version: z.number().int().positive(), // Incremental version number (1, 2, 3, ...)
  
  // Form data at this version
  rawData: PatientFormDataSchema,
  
  // Previous data (for easy diffing)
  previousRawData: PatientFormDataSchema.nullable().optional(),
  
  // Change metadata
  changedBy: zId("User"), // User who made the change
  changedAt: z.date().default(() => new Date()), // When the change was made
  changeNotes: z.string().default(""), // Description of the change (why/what)
  
  // Additional metadata
  isRestoration: z.boolean().default(false), // True if this version restores an older version
  restoredFromVersion: z.number().int().positive().nullable().optional(), // If restoration, which version was restored
});

// Infer TypeScript type
export type FormVersion = z.infer<typeof FormVersion>;

// Create Mongoose schema
const FormVersionSchemaGenerated = zodSchema(FormVersion.omit({ _id: true }));

// Define nested schemas for patientFormData
const PatientFormDataNestedSchema = new mongoose.Schema(
  {
    rawFormData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    subscales: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    totalScore: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    fillStatus: {
      type: String,
      enum: ["draft", "incomplete", "complete"],
      required: true,
      default: "draft",
    },
    completedAt: {
      type: Date,
      required: false,
      default: null,
    },
    beginFill: {
      type: Date,
      required: false,
      default: null,
    },
  },
  { _id: false, strict: true }
);

// Create main FormVersion schema
const FormVersionSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Form",
    } as const,
    version: {
      type: Number,
      required: true,
    },
    rawData: {
      type: PatientFormDataNestedSchema,
      required: true,
    },
    previousRawData: {
      type: PatientFormDataNestedSchema,
      required: false,
      default: null,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    } as const,
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    changeNotes: {
      type: String,
      default: "",
    },
    isRestoration: {
      type: Boolean,
      default: false,
    },
    restoredFromVersion: {
      type: Number,
      required: false,
      default: null,
    },
  },
  {
    timestamps: false, // Use changedAt instead
    strict: true,
  }
);

// Create indexes for efficient queries
FormVersionSchema.index({ formId: 1, version: -1 }); // Get versions for a form, newest first
FormVersionSchema.index({ formId: 1, version: 1 }, { unique: true }); // Ensure unique version numbers per form
FormVersionSchema.index({ changedBy: 1, changedAt: -1 }); // Query by user and time

export const FormVersionModel = mongoose.model("FormVersion", FormVersionSchema, "formversions");

// ****************************************************
// API Schemas

// Response schema for version list
export const FormVersionApiSchema = z.object({
  _id: z.string(),
  formId: z.string(),
  version: z.number(),
  changedBy: z.string(),
  changedAt: z.string(), // ISO date string
  changeNotes: z.string(),
  isRestoration: z.boolean(),
  restoredFromVersion: z.number().nullable().optional(),
  // Note: rawData and previousRawData excluded from list view for performance
});

// Response schema for single version with full data
export const FormVersionDetailApiSchema = FormVersionApiSchema.extend({
  rawData: PatientFormDataSchema,
  previousRawData: PatientFormDataSchema.nullable().optional(),
});

// Input validation for creating version restore
export const RestoreVersionSchema = z.object({
  body: z.object({
    changeNotes: z.string().optional(), // Optional override for auto-generated note
  }).optional(),
});

// Input validation for version diff query
export const VersionDiffQuerySchema = z.object({
  query: z.object({
    v1: z.string().regex(/^\d+$/).transform(Number), // First version number
    v2: z.string().regex(/^\d+$/).transform(Number), // Second version number
  }),
});
