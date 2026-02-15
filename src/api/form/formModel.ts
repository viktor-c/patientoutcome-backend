import { FormTemplate, PatientFormDataSchema } from "@/api/formtemplate/formTemplateModel";
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
    caseId: FormSchemaGenerated.obj.caseId,
    consultationId: FormSchemaGenerated.obj.consultationId,
    formTemplateId: FormSchemaGenerated.obj.formTemplateId,
    title: FormSchemaGenerated.obj.title,
    description: FormSchemaGenerated.obj.description,
    // patientFormData as nested document
    patientFormData: {
      type: PatientFormDataNestedSchema,
      required: false,
      default: null,
    },
    createdAt: FormSchemaGenerated.obj.createdAt,
    updatedAt: FormSchemaGenerated.obj.updatedAt,
    formStartTime: FormSchemaGenerated.obj.formStartTime,
    formEndTime: FormSchemaGenerated.obj.formEndTime,
    completionTimeSeconds: FormSchemaGenerated.obj.completionTimeSeconds,
    deletedAt: FormSchemaGenerated.obj.deletedAt,
    deletedBy: FormSchemaGenerated.obj.deletedBy,
    deletionReason: FormSchemaGenerated.obj.deletionReason,
  },
  {
    collection: "forms",
    timestamps: true,
  }
);

export const FormModel = mongoose.model("Form", FormSchema, "forms");
