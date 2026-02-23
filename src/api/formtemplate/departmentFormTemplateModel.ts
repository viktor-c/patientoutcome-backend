import { zId, zodSchema } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

/**
 * Department Form Template Mapping
 * 
 * This collection maps departments to form templates, enabling
 * department-level access control for form templates.
 * 
 * A department can have multiple form templates associated with it.
 * A form template can be associated with multiple departments.
 */

// Define the schema
export const DepartmentFormTemplateSchema = z.object({
  _id: zId().optional(),
  departmentId: zId("UserDepartment"),
  formTemplateIds: z.array(zId("FormTemplate")),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  createdBy: zId("User").optional(),
  updatedBy: zId("User").optional(),
}).strict();

// Infer TypeScript type
export type DepartmentFormTemplate = z.infer<typeof DepartmentFormTemplateSchema>;

// Create Mongoose schema
const DepartmentFormTemplateMongooseSchema = zodSchema(
  DepartmentFormTemplateSchema.omit({ _id: true })
);

// Add timestamps
DepartmentFormTemplateMongooseSchema.set('timestamps', true);

// Add indexes for efficient queries
DepartmentFormTemplateMongooseSchema.index({ departmentId: 1 }, { unique: true });
DepartmentFormTemplateMongooseSchema.index({ formTemplateIds: 1 });

// Create and export model
export const DepartmentFormTemplateModel = mongoose.model(
  "DepartmentFormTemplate",
  DepartmentFormTemplateMongooseSchema,
  "departmentformtemplates"
);

// ****************************************************
// Input validation schemas

// Create department-template mapping
export const CreateDepartmentFormTemplateSchema = z.object({
  body: z.object({
    departmentId: z.string(),
    formTemplateIds: z.array(z.string()),
  }).strict(),
});

// Update department-template mapping
export const UpdateDepartmentFormTemplateSchema = z.object({
  params: z.object({
    departmentId: z.string(),
  }),
  body: z.object({
    formTemplateIds: z.array(z.string()),
    addFormTemplateIds: z.array(z.string()).optional(),
    removeFormTemplateIds: z.array(z.string()).optional(),
  }).strict(),
});

// Get department-template mapping
export const GetDepartmentFormTemplateSchema = z.object({
  params: z.object({
    departmentId: z.string(),
  }),
});

// ****************************************************
// Response schemas (for OpenAPI)

export const DepartmentFormTemplateResponseSchema = z.object({
  _id: z.string().optional(),
  departmentId: z.string(),
  formTemplateIds: z.array(z.string()),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type DepartmentFormTemplateResponse = z.infer<typeof DepartmentFormTemplateResponseSchema>;

// Alias for OpenAPI registration
export const DepartmentFormTemplateApiSchema = DepartmentFormTemplateResponseSchema;
