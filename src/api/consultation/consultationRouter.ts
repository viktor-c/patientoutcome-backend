import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { commonValidations } from "@/common/utils/commonValidation";
import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { consultationController } from "./consultationController";
import {
  ConsultationSchema,
  CreateConsultationSchema,
  GetConsultationSchema,
  UpdateConsultationSchema,
} from "./consultationModel";

export const consultationRegistry = new OpenAPIRegistry();
export const consultationRouter: Router = express.Router();

consultationRegistry.register("Consultation", ConsultationSchema);
const createConsultation = consultationRegistry.register("CreateConsultation", CreateConsultationSchema);
consultationRegistry.register("UpdateConsultation", UpdateConsultationSchema);
consultationRegistry.register("GetConsultation", GetConsultationSchema);

// Register the path for creating a consultation
consultationRegistry.registerPath({
  method: "post",
  path: "/patient/{patientId}/case/{caseId}/consultation",
  tags: ["consultation"],
  operationId: "createConsultation",
  summary: "Create a new consultation for a patient case",
  description: "Create a new consultation for a patient case",
  request: {
    params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
    body: {
      content: {
        "application/json": { schema: createConsultation },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: ConsultationSchema,
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
  "/patient/:patientId/case/:caseId/consultation",
  validateRequest(
    z.object({
      body: CreateConsultationSchema,
      params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
    }),
  ),
  consultationController.createConsultation,
);

// Register the path for getting a consultation by ID
consultationRegistry.registerPath({
  method: "get",
  path: "/patient/{patientId}/case/{caseId}/consultation/{consultationId}",
  tags: ["consultation"],
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
      schema: ConsultationSchema,
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

consultationRouter.get(
  "/patient/:patientId/case/:caseId/consultation/:consultationId",
  consultationController.getConsultationById,
);

// Register the path for getting all consultations for a given patientId and caseId
consultationRegistry.registerPath({
  method: "get",
  path: "/patient/{patientId}/case/{caseId}/consultations",
  tags: ["consultation"],
  operationId: "getAllConsultations",
  summary: "Retrieve all consultations for a given patientId and caseId",
  description: "Retrieve all consultations for a given patientId and caseId",
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponses([
    {
      schema: z.array(ConsultationSchema),
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

consultationRouter.get("/patient/:patientId/case/:caseId/consultations", consultationController.getAllConsultations);

// Register the path for updating a consultation by ID
consultationRegistry.registerPath({
  method: "put",
  path: "/patient/{patientId}/case/{caseId}/consultation/{consultationId}",
  tags: ["consultation"],
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
          schema: ConsultationSchema.partial(),
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: ConsultationSchema,
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
  "/patient/:patientId/case/:caseId/consultation/:consultationId",
  validateRequest(z.object({ body: ConsultationSchema.partial() })),
  consultationController.updateConsultation,
);

// Register the path for deleting a consultation by ID
consultationRegistry.registerPath({
  method: "delete",
  path: "/patient/{patientId}/case/{caseId}/consultation/{consultationId}",
  tags: ["consultation"],
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

consultationRouter.delete(
  "/patient/:patientId/case/:caseId/consultation/:consultationId",
  consultationController.deleteConsultation,
);
