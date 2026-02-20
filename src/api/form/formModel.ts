import { FormTemplate, FormAccessLevel, PatientFormDataSchema } from "@/api/formtemplate/formTemplateModel";
import { CreateNoteSchema, NoteSchema, dateSchema } from "@/api/generalSchemas";
import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

/**
 * PatientForm (Form) schema
 * Represents a form instance for a patient consultation
 */
export const Form = FormTemplate.extend({
  caseId: zId("PatientCase"),
  consultationId: zId("Consultation"),
  formTemplateId: zId("FormTemplate"),
  // Patient form data - can be null if not yet filled
  patientFormData: PatientFormDataSchema.nullable(),
  // Versioning
  currentVersion: z.number().int().positive().default(1), // Current version number
  // Metadata
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
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

// Create Mongoose schema from the Form schema, using zodSchema
const FormSchemaGenerated = zodSchema(Form.omit({ _id: true }));

// Define nested patientFormData schema with proper types for all fields
const PatientFormDataNestedSchema = new mongoose.Schema(
  {
    // rawFormData: Object (section => { question => answer })
    rawFormData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    // subscales: Object (key => SubscaleScore | null)
    subscales: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    // totalScore: SubscaleScore object or null
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

// Create main Form schema
const FormSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PatientCase",
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Consultation",
    },
    formTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "FormTemplate",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    accessLevel: {
      type: String,
      enum: Object.values(FormAccessLevel),
      default: FormAccessLevel.PATIENT,
    },
    // patientFormData as nested document
    patientFormData: {
      type: PatientFormDataNestedSchema,
      required: false,
      default: null,
    },
    currentVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    createdAt: {
      type: Date,
      required: false,
    },
    updatedAt: {
      type: Date,
      required: false,
    },
    formStartTime: {
      type: Date,
      required: false,
    },
    formEndTime: {
      type: Date,
      required: false,
    },
    completionTimeSeconds: {
      type: Number,
      required: false,
    },
    deletedAt: {
      type: Date,
      required: false,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "User",
      default: null,
    },
    deletionReason: {
      type: String,
      required: false,
      default: null,
    },
  },
  {
    collection: "forms",
    timestamps: true,
  }
);

export const FormModel = mongoose.model("Form", FormSchema, "forms");
