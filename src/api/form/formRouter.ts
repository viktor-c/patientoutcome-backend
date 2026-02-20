/**
 * @file Form Router
 * @module api/form
 * @description Manages completed and in-progress patient-reported outcome measure (PROM) forms. Handles form data
 * submission, retrieval, updates, and deletion. Tracks form completion status, timing metrics, and scoring. Forms
 * are linked to consultations and support draft/incomplete/completed states.
 */

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponseSchema, ValidationErrorsSchema } from "@/common/models/serviceResponse";
import { AclMiddleware } from "@/common/middleware/globalAclMiddleware";
import { commonValidations } from "@/common/utils/commonValidation";
import { validateRequest } from "@/common/utils/httpHandlers";
import { logger } from "@/server";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { type NextFunction, type Request, type Response, Router } from "express";
import { z } from "zod";
import { formController } from "./formController";
import { formVersionController } from "./formVersionController";
import { Form } from "./formModel";
import { PatientFormDataSchema } from "@/api/formtemplate/formTemplateModel";

const router = Router();
export const formRegistry = new OpenAPIRegistry();

// Register the Form schema for OpenAPI
formRegistry.register("Form", Form);

// Create a response schema for getFormById that matches the ServiceResponse structure
const GetFormByIdResponseSchema = ServiceResponseSchema(Form);
formRegistry.register("GetFormByIdResponse", GetFormByIdResponseSchema);

const formIdSchema = z.object({
  params: z.object({
    formId: z.string(),
  }),
});

// Schema for the body content only (used in OpenAPI docs)
const createFormBodySchema = z.object({
  patientFormData: PatientFormDataSchema.nullable().optional(),
});

// Full validation schema (used in validateRequest middleware)
const createFormSchema = z.object({
  body: createFormBodySchema,
});

// Schema for the update body content only (used in OpenAPI docs)
const updateFormBodySchema = z
  .object({
    code: z.string().optional(),
    // PatientFormData structure
    patientFormData: PatientFormDataSchema.nullable().optional(),
    // Form timing fields
    completionTimeSeconds: z.number().positive().optional(),
    formStartTime: z.coerce.date().optional(),
    formEndTime: z.coerce.date().optional(),
  })
  .passthrough();

// Full validation schema (used in validateRequest middleware)
const updateFormSchema = z.object({
  params: z.object({
    formId: commonValidations.id,
  }),
  body: updateFormBodySchema,
});

// Register path for getting a form by patient ID, case ID, consultation ID and form Id
formRegistry.registerPath({
  method: "get",
  path: "/form/{formId}",
  tags: ["form"],
  operationId: "getFormById",
  description: "Get a form by ID",
  summary: "Get a form by ID",
  request: {
    params: z.object({
      formId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: Form,
      description: "Form retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Form not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the form.",
      statusCode: 500,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

// Schema for getting deleted forms with pagination
const getDeletedFormsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

// Register path for getting all deleted forms
formRegistry.registerPath({
  method: "get",
  path: "/form/deleted",
  tags: ["form"],
  operationId: "getDeletedForms",
  description: "Get all soft deleted forms with pagination (requires doctor role or higher)",
  summary: "Get all soft deleted forms",
  request: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: createApiResponses([
    {
      schema: z.object({
        forms: z.array(Form),
        totalScore: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
      }),
      description: "Deleted forms retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving deleted forms.",
      statusCode: 500,
    },
  ]),
});

router.get(
  "/form/deleted",
  AclMiddleware("form:get-deleted"),
  validateRequest(getDeletedFormsSchema),
  formController.getDeletedForms
);

router.get("/form/:formId", formController.getFormById);

// Register the path for creating a form
formRegistry.registerPath({
  method: "post",
  path: "/form",
  tags: ["form"],
  operationId: "createForm",
  description: "Create a new form",
  summary: "Create a new form",
  request: {
    body: {
      content: {
        "application/json": { schema: createFormBodySchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: createFormSchema,
      description: "Form created successfully",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the form.",
      statusCode: 500,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

router.post("/form", validateRequest(createFormSchema), formController.createForm);

// Register the path for getting all forms
formRegistry.registerPath({
  method: "get",
  path: "/forms",
  tags: ["form"],
  operationId: "getForms",
  description: "Get all forms",
  summary: "Get all forms",
  responses: createApiResponses([
    {
      schema: z.array(Form),
      description: "Forms retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving forms.",
      statusCode: 500,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

router.get("/forms", formController.getForms);

// Register the path for updating a form
formRegistry.registerPath({
  method: "put",
  path: "/form/{formId}",
  tags: ["form"],
  operationId: "updateForm",
  description: "Update a form answers by its id",
  summary: "Update a form answers by its id",
  request: {
    params: updateFormSchema.shape.params,
    body: {
      content: {
        "application/json": { schema: updateFormBodySchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: Form,
      description: "Form updated successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Form not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating the form.",
      statusCode: 500,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

// Debug middleware to log raw request body
const debugRequestBody = (req: Request, res: Response, next: NextFunction) => {
  console.debug("=== BACKEND ROUTER: Raw Request ===");
  console.debug("Method:", req.method);
  console.debug("URL:", req.url);
  console.debug("Content-Type:", req.headers["content-type"]);
  console.debug("Raw req.body:", JSON.stringify(req.body, null, 2));
  console.debug("===================================");
  next();
};

router.put("/form/:formId", debugRequestBody, validateRequest(updateFormSchema), formController.updateForm);

// Register the path for deleting a form
formRegistry.registerPath({
  method: "delete",
  path: "/form/{formId}",
  tags: ["form"],
  operationId: "deleteForm",
  description: "Delete a form",
  summary: "Delete a form",
  request: { params: z.object({ formId: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Form deleted successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Form not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while deleting the form.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

router.delete("/form/:formId", validateRequest(formIdSchema), formController.deleteForm);

// Schema for soft delete request
const softDeleteFormSchema = z.object({
  params: z.object({
    formId: commonValidations.id,
  }),
  body: z.object({
    deletionReason: z.string().min(1, "Deletion reason is required"),
  }),
});

// Register path for soft deleting a form
formRegistry.registerPath({
  method: "post",
  path: "/form/{formId}/soft-delete",
  tags: ["form"],
  operationId: "softDeleteForm",
  description: "Soft delete a form (requires doctor role or higher)",
  summary: "Soft delete a form",
  request: {
    params: z.object({
      formId: commonValidations.id,
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            deletionReason: z.string().min(1, "Deletion reason is required"),
          }),
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: Form,
      description: "Form soft deleted successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Form not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Deletion reason is required",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while soft deleting the form.",
      statusCode: 500,
    },
  ]),
});

router.post(
  "/form/:formId/soft-delete",
  AclMiddleware("form:soft-delete"),
  validateRequest(softDeleteFormSchema),
  formController.softDeleteForm
);

// Register path for restoring a soft deleted form
formRegistry.registerPath({
  method: "post",
  path: "/form/{formId}/restore",
  tags: ["form"],
  operationId: "restoreForm",
  description: "Restore a soft deleted form (requires doctor role or higher)",
  summary: "Restore a soft deleted form",
  request: {
    params: z.object({
      formId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: Form,
      description: "Form restored successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Form not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while restoring the form.",
      statusCode: 500,
    },
  ]),
});

router.post(
  "/form/:formId/restore",
  AclMiddleware("form:restore"),
  validateRequest(formIdSchema),
  formController.restoreForm
);

// ****************************************************
// Form Versioning Routes (admin/doctor only)
// ****************************************************

// Get version history for a form
formRegistry.registerPath({
  method: "get",
  path: "/form/{formId}/versions",
  tags: ["form"],
  operationId: "getVersionHistory",
  summary: "Get version history for a form (admin/doctor only)",
  description: "Retrieves all versions of a form with metadata. Requires admin or doctor role.",
  request: { params: formIdSchema.shape.params },
  responses: createApiResponses([
    {
      schema: z.array(z.object({
        _id: z.string(),
        formId: z.string(),
        version: z.number(),
        changedBy: z.string(),
        changedAt: z.string(),
        changeNotes: z.string(),
        isRestoration: z.boolean(),
        restoredFromVersion: z.number().nullable().optional(),
      })),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
  ]),
});

router.get("/form/:formId/versions", formVersionController.getVersionHistory);

// Get a specific version
formRegistry.registerPath({
  method: "get",
  path: "/form/{formId}/version/{versionNumber}",
  tags: ["form"],
  operationId: "getVersion",
  summary: "Get a specific version (admin/doctor only)",
  description: "Retrieves full data for a specific version. Requires admin or doctor role.",
  request: { 
    params: z.object({
      formId: z.string(),
      versionNumber: z.string(),
    }),
  },
  responses: createApiResponses([
    {
      schema: z.object({
        _id: z.string(),
        formId: z.string(),
        version: z.number(),
        rawData: PatientFormDataSchema,
        previousRawData: PatientFormDataSchema.nullable().optional(),
        changedBy: z.string(),
        changedAt: z.string(),
        changeNotes: z.string(),
        isRestoration: z.boolean(),
        restoredFromVersion: z.number().nullable().optional(),
      }),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Version not found",
      statusCode: 404,
    },
  ]),
});

router.get("/form/:formId/version/:versionNumber", formVersionController.getVersion);

// Compare two versions (diff)
formRegistry.registerPath({
  method: "get",
  path: "/form/{formId}/diff",
  tags: ["form"],
  operationId: "compareVersions",
  summary: "Compare two versions (admin/doctor only)",
  description: "Compare two versions and get diff data. Query params: v1 and v2 as version numbers.",
  request: { 
    params: formIdSchema.shape.params,
    query: z.object({
      v1: z.string(),
      v2: z.string(),
    }),
  },
  responses: createApiResponses([
    {
      schema: z.object({
        formId: z.string(),
        v1: z.object({
          version: z.number(),
          changedBy: z.string(),
          changedAt: z.date(),
          changeNotes: z.string(),
          rawData: PatientFormDataSchema,
        }),
        v2: z.object({
          version: z.number(),
          changedBy: z.string(),
          changedAt: z.date(),
          changeNotes: z.string(),
          rawData: PatientFormDataSchema,
        }),
      }),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Version not found",
      statusCode: 404,
    },
  ]),
});

router.get("/form/:formId/diff", formVersionController.compareVersions);

// Get change list between versions
formRegistry.registerPath({
  method: "get",
  path: "/form/{formId}/changes",
  tags: ["form"],
  operationId: "getChangeList",
  summary: "Get list of changes between versions (admin/doctor only)",
  description: "Get list of all changes between two versions. Query params: v1 and v2 as version numbers.",
  request: { 
    params: formIdSchema.shape.params,
    query: z.object({
      v1: z.string(),
      v2: z.string(),
    }),
  },
  responses: createApiResponses([
    {
      schema: z.array(z.object({
        version: z.number(),
        changedBy: z.string(),
        changedAt: z.date(),
        changeNotes: z.string(),
        isRestoration: z.boolean(),
        restoredFromVersion: z.number().nullable().optional(),
      })),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

router.get("/form/:formId/changes", formVersionController.getChangeList);

// Restore a version
formRegistry.registerPath({
  method: "post",
   path: "/form/{formId}/restore-version/{versionNumber}",
  tags: ["form"],
  operationId: "restoreVersion",
  summary: "Restore a previous version (admin/doctor only)",
  description: "Restores a form to a previous version. Creates a new version with the old data.",
  request: { 
    params: z.object({
      formId: z.string(),
      versionNumber: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            changeNotes: z.string().optional(),
          }).optional(),
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: Form,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Version not found",
      statusCode: 404,
    },
  ]),
});

router.post("/form/:formId/restore-version/:versionNumber", formVersionController.restoreVersion);

export { router as formRouter };
