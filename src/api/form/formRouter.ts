import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { commonValidations } from "@/common/utils/commonValidation";
import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { Router } from "express";
import { z } from "zod";
import { formController } from "./formController";

const router = Router();
export const formRegistry = new OpenAPIRegistry();

const formIdSchema = z.object({
  params: z.object({
    formId: z.string(),
  }),
});

const createFormSchema = z.object({
  body: z.object({
    formData: z.object({}).passthrough(),
    score: z.number(),
  }),
});

const updateFormSchema = z.object({
  params: z.object({
    formId: z.string(),
  }),
  body: z.object({
    formData: z.object({}).passthrough().optional(),
    score: z.number().optional(),
  }),
});

// Register path for getting a form by patient ID, case ID, consultation ID and form Id
formRegistry.registerPath({
  method: "get",
  path: "/patient/{patientId}/case/{caseId}/consultation/{consultationId}/form/{formId}",
  tags: ["form"],
  operationId: "getFormByPatientCaseConsultationFormId",
  description: "Get a form by patient ID, case ID, consultation ID and form ID",
  summary: "Get a form by patient ID, case ID, consultation ID and form ID",
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
      consultationId: commonValidations.id,
      formId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: createFormSchema.shape.body,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the form.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

router.get(
  "/patient/:patientId/case/:caseId/consultation/:consultationId/form/:formId",
  formController.getFormByPatientCaseConsultationFormId,
);

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
        "application/json": { schema: createFormSchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: createFormSchema.shape.body,
      description: "Success",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the form.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
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
      schema: z.array(createFormSchema.shape.body),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving forms.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

router.get("/forms", formController.getForms);

// Register the path for getting a form by ID
formRegistry.registerPath({
  method: "get",
  path: "/form/{formId}",
  tags: ["form"],
  operationId: "getForm",
  description: "Get a form by ID",
  summary: "Get a form by ID",
  request: { params: formIdSchema.shape.params },
  responses: createApiResponses([
    {
      schema: createFormSchema.shape.body,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the form.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

router.get("/form/:formId", validateRequest(formIdSchema), formController.getForm);

// Register the path for updating a form
formRegistry.registerPath({
  method: "put",
  path: "/form/{formId}",
  tags: ["form"],
  operationId: "updateForm",
  description: "Update a form",
  summary: "Update a form",
  request: {
    params: z.object({ formId: z.string() }),
    body: {
      content: {
        "application/json": { schema: updateFormSchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: createFormSchema.shape.body,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating the form.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

router.put("/form/:formId", validateRequest(updateFormSchema), formController.updateForm);

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
      description: "Success",
      statusCode: 200,
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

export { router as formRouter };
