/**
 * @file Form Template Router
 * @module api/formtemplate
 * @description Manages form template definitions (questionnaire structures). Templates define the questions, fields,
 * validation rules, and scoring logic for PROMs like MOXFQ, EQ-5D, etc. Supports versioning, activation/deactivation,
 * and retrieval of available templates for form assignment. Includes department-based access control.
 */

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { ValidationErrorsSchema } from "@/common/models/serviceResponse";
import { validateRequest } from "@/common/utils/httpHandlers";
import { formTemplateController } from "./formTemplateController";
import {
  CreateFormTemplateSchema,
  FormTemplateApiSchema,
  FormTemplateListSchema,
  GetFormTemplateSchema,
  GetFormTemplatesQuerySchema,
} from "./formTemplateModel";
import { DepartmentFormTemplateApiSchema } from "./departmentFormTemplateModel";

export const formTemplateRegistry = new OpenAPIRegistry();
export const formTemplateRouter: Router = express.Router();

/* Define schemas for OpenAPI */
formTemplateRegistry.register("FormTemplate", FormTemplateApiSchema);
formTemplateRegistry.register("FormTemplateList", FormTemplateListSchema);
formTemplateRegistry.register("DepartmentFormTemplate", DepartmentFormTemplateApiSchema);

// Register the path for getting all form templates with optional filters
formTemplateRegistry.registerPath({
  method: "get",
  path: "/formtemplate",
  tags: ["formtemplate"],
  operationId: "getFormTemplates",
  summary: "Get form templates with optional filters",
  description:
    "Get form templates with optional filtering. Regular users see only templates mapped to their departments. Admin/developer users see all templates. Supports filtering by ID(s) or department.",
  request: {
    query: GetFormTemplatesQuerySchema,
  },
  responses: createApiResponses([
    {
      schema: z.array(FormTemplateApiSchema),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving form templates.",
      statusCode: 500,
    },
  ]),
});

formTemplateRouter.get("/", formTemplateController.getFormTemplates);

// Register the path for getting a shortlist of form templates
formTemplateRegistry.registerPath({
  method: "get",
  path: "/formtemplate/shortlist",
  tags: ["formtemplate"],
  operationId: "getFormTemplatesShortlist",
  summary: "Get all form templates in a succinct list",
  description:
    "Useful for displaying a list of form templates in the UI, without the full details. Returns only templates accessible to the user based on department mappings.",
  responses: createApiResponses([
    {
      schema: FormTemplateListSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving form templates.",
      statusCode: 500,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

formTemplateRouter.get("/shortlist", formTemplateController.getFormTemplatesShortlist);

// Register the path for getting a form template by ID
formTemplateRegistry.registerPath({
  method: "get",
  path: "/formtemplate/id/{templateId}",
  tags: ["formtemplate"],
  operationId: "getFormTemplateById",
  summary: "Get a form template by ID",
  description: "Get a form template by ID with access control based on department mappings.",
  request: { params: GetFormTemplateSchema.shape.params },
  responses: createApiResponses([
    {
      schema: FormTemplateApiSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Form template not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the form template.",
      statusCode: 500,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

formTemplateRouter.get(
  "/id/:templateId",
  validateRequest(GetFormTemplateSchema),
  formTemplateController.getFormTemplateById,
);

// Register the path for creating a form template (admin/developer only)
formTemplateRegistry.registerPath({
  method: "post",
  path: "/formtemplate",
  tags: ["formtemplate"],
  operationId: "createFormTemplate",
  summary: "Create a new form template (admin/developer only)",
  description:
    "Create a new form template. Restricted to admin and developer roles. Frontend can provide _id for consistency.",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateFormTemplateSchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: FormTemplateApiSchema,
      description: "Form template created successfully",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the form template.",
      statusCode: 500,
    },
  ]),
});

formTemplateRouter.post("/", validateRequest(CreateFormTemplateSchema), formTemplateController.createFormTemplate);

// Register the path for updating a form template (admin/developer only)
formTemplateRegistry.registerPath({
  method: "put",
  path: "/formtemplate/{templateId}",
  tags: ["formtemplate"],
  operationId: "updateFormTemplate",
  summary: "Update a form template (admin/developer only)",
  description: "Update a form template. Restricted to admin and developer roles.",
  request: {
    params: z.object({ templateId: z.string() }),
    body: {
      content: {
        "application/json": { schema: FormTemplateApiSchema.partial() },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: FormTemplateApiSchema,
      description: "Form template updated successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Form template not found",
      statusCode: 404,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating the form template.",
      statusCode: 500,
    },
  ]),
});

formTemplateRouter.put(
  "/:templateId",
  validateRequest(z.object({ params: z.object({ templateId: z.string() }), body: FormTemplateApiSchema.partial() })),
  formTemplateController.updateFormTemplate,
);

// Register the path for deleting a form template (admin/developer only)
formTemplateRegistry.registerPath({
  method: "delete",
  path: "/formtemplate/{templateId}",
  tags: ["formtemplate"],
  operationId: "deleteFormTemplate",
  summary: "Delete a form template (admin/developer only)",
  description: "Delete a form template by ID. Restricted to admin and developer roles.",
  request: { params: z.object({ templateId: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Success",
      statusCode: 204,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Form template not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while deleting the form template.",
      statusCode: 500,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

formTemplateRouter.delete(
  "/:templateId",
  validateRequest(z.object({ params: z.object({ templateId: z.string() }) })),
  formTemplateController.deleteFormTemplate,
);

// =====================================================================
// Department Mapping Routes (admin/developer only)
// =====================================================================

// Get department mapping
formTemplateRegistry.registerPath({
  method: "get",
  path: "/formtemplate/department/{departmentId}/mapping",
  tags: ["formtemplate"],
  operationId: "getDepartmentMapping",
  summary: "Get department-formtemplate mapping (admin/developer only)",
  description: "Retrieves form template IDs mapped to a specific department. Restricted to admin and developer roles.",
  request: { params: z.object({ departmentId: z.string() }) },
  responses: createApiResponses([
    {
      schema: DepartmentFormTemplateApiSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Department mapping not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the mapping.",
      statusCode: 500,
    },
  ]),
});

formTemplateRouter.get("/department/:departmentId/mapping", formTemplateController.getDepartmentMapping);

// Set department mapping (replace)
formTemplateRegistry.registerPath({
  method: "put",
  path: "/formtemplate/department/{departmentId}/mapping",
  tags: ["formtemplate"],
  operationId: "setDepartmentMapping",
  summary: "Set department-formtemplate mapping (admin/developer only)",
  description:
    "Replaces the existing mapping with new template IDs. Restricted to admin and developer roles.",
  request: {
    params: z.object({ departmentId: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            formTemplateIds: z.array(z.string()),
          }),
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: DepartmentFormTemplateApiSchema,
      description: "Mapping updated successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while setting the mapping.",
      statusCode: 500,
    },
  ]),
});

formTemplateRouter.put("/department/:departmentId/mapping", formTemplateController.setDepartmentMapping);

// Add templates to department
formTemplateRegistry.registerPath({
  method: "post",
  path: "/formtemplate/department/{departmentId}/templates",
  tags: ["formtemplate"],
  operationId: "addTemplatesToDepartment",
  summary: "Add templates to department (admin/developer only)",
  description: "Adds template IDs to existing department mapping. Restricted to admin and developer roles.",
  request: {
    params: z.object({ departmentId: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            formTemplateIds: z.array(z.string()),
          }),
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: DepartmentFormTemplateApiSchema,
      description: "Templates added successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Department mapping not found",
      statusCode: 404,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while adding templates.",
      statusCode: 500,
    },
  ]),
});

formTemplateRouter.post("/department/:departmentId/templates", formTemplateController.addTemplatesToDepartment);

// Remove templates from department
formTemplateRegistry.registerPath({
  method: "delete",
  path: "/formtemplate/department/{departmentId}/templates",
  tags: ["formtemplate"],
  operationId: "removeTemplatesFromDepartment",
  summary: "Remove templates from department (admin/developer only)",
  description: "Removes template IDs from department mapping. Restricted to admin and developer roles.",
  request: {
    params: z.object({ departmentId: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            formTemplateIds: z.array(z.string()),
          }),
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: DepartmentFormTemplateApiSchema,
      description: "Templates removed successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Department mapping not found",
      statusCode: 404,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while removing templates.",
      statusCode: 500,
    },
  ]),
});

formTemplateRouter.delete("/department/:departmentId/templates", formTemplateController.removeTemplatesFromDepartment);

// Delete department mapping
formTemplateRegistry.registerPath({
  method: "delete",
  path: "/formtemplate/department/{departmentId}/mapping",
  tags: ["formtemplate"],
  operationId: "deleteDepartmentMapping",
  summary: "Delete department mapping (admin/developer only)",
  description: "Removes all template mappings for a department. Restricted to admin and developer roles.",
  request: { params: z.object({ departmentId: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Mapping deleted successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Department mapping not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while deleting the mapping.",
      statusCode: 500,
    },
  ]),
});

formTemplateRouter.delete("/department/:departmentId/mapping", formTemplateController.deleteDepartmentMapping);
