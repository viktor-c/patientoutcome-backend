import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { commonValidations } from "@/common/utils/commonValidation";
import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { consultationController } from "./consultationController";
import { PatientCaseConsultationSchema } from "./consultationModel";

export const patientCaseConsultationRegistry = new OpenAPIRegistry();
export const consultationRouter: Router = express.Router();

patientCaseConsultationRegistry.register("PatientCaseConsultation", PatientCaseConsultationSchema);

// Register the path for creating a consultation
patientCaseConsultationRegistry.registerPath({
  method: "post",
  path: "/patient/{patientId}/cases/{caseId}/consultation",
  tags: ["patient case consultation"],
  operationId: "createConsultation",
  summary: "Create a new consultation for a patient case",
  description: "Create a new consultation for a patient case",
  request: {
    params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
    body: {
      content: {
        "application/json": { schema: PatientCaseConsultationSchema.omit({ _id: true, __v: true }) },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: PatientCaseConsultationSchema,
      description: "Consultation created successfully",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the consultation.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

consultationRouter.post(
  "/",
  validateRequest(z.object({ body: PatientCaseConsultationSchema })),
  consultationController.createConsultation,
);

// Register the path for getting a consultation by ID
patientCaseConsultationRegistry.registerPath({
  method: "get",
  path: "/patient/{patientId}/cases/{caseId}/consultation/{consultationId}",
  tags: ["patient case consultation"],
  operationId: "getConsultationById",
  summary: "Retrieve a consultation by ID for a patientId and caseId",
  description: "Retrieve a consultation by ID for a patientId and caseId",
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
      consultationId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: PatientCaseConsultationSchema,
      description: "Consultation retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Consultation not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the consultation.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

consultationRouter.get("/:consultationId", consultationController.getConsultationById);

// Register the path for getting all consultations for a given patientId and caseId
patientCaseConsultationRegistry.registerPath({
  method: "get",
  path: "/patient/{patientId}/cases/{caseId}/consultations",
  tags: ["patient case consultation"],
  operationId: "getAllConsultations",
  summary: "Retrieve all consultations for a given patientId and caseId",
  description: "Retrieve all consultations for a given patientId and caseId",
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponses([
    {
      schema: z.array(PatientCaseConsultationSchema),
      description: "Consultations retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the consultations.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

consultationRouter.get("/", consultationController.getAllConsultations);

// Register the path for updating a consultation by ID
patientCaseConsultationRegistry.registerPath({
  method: "put",
  path: "/patient/{patientId}/cases/{caseId}/consultation/{consultationId}",
  tags: ["patient case consultation"],
  operationId: "updateConsultation",
  summary: "Update a consultation by ID for a patient case",
  description: "Update a consultation by ID for a patient case",
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
      consultationId: commonValidations.id,
    }),
    body: {
      content: {
        "application/json": {
          schema: PatientCaseConsultationSchema.partial(),
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: PatientCaseConsultationSchema,
      description: "Consultation updated successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Consultation not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating the consultation.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

consultationRouter.put(
  "/:consultationId",
  validateRequest(z.object({ body: PatientCaseConsultationSchema.partial() })),
  consultationController.updateConsultation,
);

// Register the path for deleting a consultation by ID
patientCaseConsultationRegistry.registerPath({
  method: "delete",
  path: "/patient/{patientId}/cases/{caseId}/consultation/{consultationId}",
  tags: ["patient case consultation"],
  operationId: "deleteConsultation",
  summary: "Delete a consultation by ID for a patient case",
  description: "Delete a consultation by ID for a patient case",
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
      consultationId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Consultation deleted successfully",
      statusCode: 204,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Consultation not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while deleting the consultation.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

consultationRouter.delete("/:consultationId", consultationController.deleteConsultation);

// Default handler for all other routes
consultationRouter.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});
