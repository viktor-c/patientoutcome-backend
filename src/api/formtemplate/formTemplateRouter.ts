import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import { formTemplateController } from "./formTemplateController";
import {
  CreateFormTemplateSchema,
  FormTemplate,
  FormTemplateListSchema,
  GetFormTemplateSchema,
} from "./formTemplateModel";

export const formTemplateRegistry = new OpenAPIRegistry();
export const formTemplateRouter: Router = express.Router();

/* Define schemas and paths to create openapi */
formTemplateRegistry.register("FormTemplate", FormTemplate);
formTemplateRegistry.register("FormTemplateList", FormTemplateListSchema);

// Register the path for creating a form template
formTemplateRegistry.registerPath({
  method: "post",
  path: "/formtemplate",
  tags: ["formtemplate"],
  operationId: "createFormTemplate",
  summary: "Create a new form template",
  description: "Create a new form template",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateFormTemplateSchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: FormTemplate,
      description: "Form template created successfully",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the form template.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

formTemplateRouter.post("/", validateRequest(CreateFormTemplateSchema), formTemplateController.createFormTemplate);

// Register the path for getting all form templates
formTemplateRegistry.registerPath({
  method: "get",
  path: "/formtemplate",
  tags: ["formtemplate"],
  operationId: "getFormTemplates",
  summary: "Get all form templates",
  description: "Get all form templates",
  responses: createApiResponses([
    {
      schema: z.array(FormTemplate),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving form templates.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

formTemplateRouter.get("/", formTemplateController.getFormTemplates);

// Register the path for getting a form template by ID
formTemplateRegistry.registerPath({
  method: "get",
  path: "/formtemplate/id/{templateId}",
  tags: ["formtemplate"],
  operationId: "getFormTemplateById",
  summary: "Get a form template by ID",
  description: "Get a form template by ID",
  request: { params: GetFormTemplateSchema.shape.params },
  responses: createApiResponses([
    {
      schema: FormTemplate,
      description: "Success",
      statusCode: 200,
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
      schema: z.object({ message: z.string() }),
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

/**
 * * Register the path for getting a succint list of form templates
 */
// Register the path for getting all form templates
formTemplateRegistry.registerPath({
  method: "get",
  path: "/formtemplate/shortlist",
  tags: ["formtemplate"],
  operationId: "getFormTemplatesShortlist",
  summary: "Get all form templates in a succint list",
  description: "Useful for displaying a list of form templates in the UI, without the full details.",
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
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

formTemplateRouter.get("/shortlist", formTemplateController.getFormTemplatesShortlist);

// Register the path for updating a form template
formTemplateRegistry.registerPath({
  method: "put",
  path: "/formtemplate/{templateId}",
  tags: ["formtemplate"],
  operationId: "updateFormTemplate",
  summary: "Update a form template",
  description: "Update a form template",
  request: {
    params: z.object({ templateId: z.string() }),
    body: {
      content: {
        "application/json": { schema: FormTemplate.partial() },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: FormTemplate,
      description: "Form template updated successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Form template not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating the form template.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

formTemplateRouter.put(
  "/:templateId",
  validateRequest(z.object({ params: z.object({ templateId: z.string() }), body: FormTemplate.partial() })),
  formTemplateController.updateFormTemplate,
);

// Register the path for deleting a form template
formTemplateRegistry.registerPath({
  method: "delete",
  path: "/formtemplate/{templateId}",
  tags: ["formtemplate"],
  operationId: "deleteFormTemplate",
  summary: "Delete a form template",
  description: "Delete a form template by ID",
  request: { params: z.object({ templateId: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Success",
      statusCode: 204,
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
      schema: z.object({ message: z.string() }),
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
