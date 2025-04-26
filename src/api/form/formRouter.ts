import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
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
  summary: "Get a form by patient ID, case ID, consultation ID and form ID",
  path: "/patient/{patientId}/case/{caseId}/consultation/{consultationId}/form/{formId}",
  tags: ["form"],
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
      consultationId: commonValidations.id,
      formId: commonValidations.id,
    }),
  },
  responses: createApiResponse(createFormSchema, "Success"),
});

router.get(
  "/patient/:patientId/case/:caseId/consultation/:consultationId/form/:formId",
  formController.getFormByPatientCaseConsultationFormId,
);

// Register the path for creating a form
formRegistry.registerPath({
  method: "post",
  summary: "Create a new form",
  path: "/form",
  tags: ["form"],
  request: {
    body: {
      content: {
        "application/json": { schema: createFormSchema },
      },
    },
  },
  responses: createApiResponse(createFormSchema, "Returns the created form"),
});

router.post("/form", validateRequest(createFormSchema), formController.createForm);

// Register the path for getting all forms
formRegistry.registerPath({
  method: "get",
  summary: "Get all forms",
  path: "/forms",
  tags: ["form"],
  responses: createApiResponse(z.array(createFormSchema.shape.body), "Success"),
});

router.get("/forms", formController.getForms);

// Register the path for getting a form by ID
formRegistry.registerPath({
  method: "get",
  summary: "Get a form by ID",
  path: "/form/{formId}",
  tags: ["form"],
  request: { params: formIdSchema.shape.params },
  responses: createApiResponse(createFormSchema.shape.body, "Success"),
});

router.get("/form/:formId", validateRequest(formIdSchema), formController.getForm);

// Register the path for updating a form
formRegistry.registerPath({
  method: "put",
  summary: "Update a form",
  path: "/form/{formId}",
  tags: ["form"],
  request: {
    params: z.object({ formId: z.string() }),
    body: {
      content: {
        "application/json": { schema: updateFormSchema },
      },
    },
  },
  responses: createApiResponse(updateFormSchema, "Success"),
});

router.put("/form/:formId", validateRequest(updateFormSchema), formController.updateForm);

// Register the path for deleting a form
formRegistry.registerPath({
  method: "delete",
  summary: "Delete a form",
  path: "/form/{formId}",
  tags: ["form"],
  request: { params: z.object({ formId: z.string() }) },
  responses: {
    [204]: {
      description: "Form deleted successfully",
    },
  },
});

router.delete("/form/:formId", validateRequest(formIdSchema), formController.deleteForm);

export { router as formRouter };
