/**
 * @file Consultation Router
 * @module api/consultation
 * @description Manages patient consultations within cases. Each consultation represents a clinical visit and can have
 * multiple associated forms (PROMs). Supports scheduled and completed consultations, linking forms to specific
 * timepoints in the patient care pathway.
 */

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { commonValidations } from "@/common/utils/commonValidation";
import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { consultationController } from "./consultationController";
import {
  ConsultationSchema,
  ConsultationWithFormsSchema,
  CreateConsultationSchema,
  GetConsultationRequestSchema,
  UpdateConsultationSchema,
} from "./consultationModel";

import { dateSchema } from "../generalSchemas";

export const consultationRegistry = new OpenAPIRegistry();
export const consultationRouter: Router = express.Router();

consultationRegistry.register("Consultation", ConsultationSchema);
consultationRegistry.register("ConsultationWithForms", ConsultationWithFormsSchema);
const createConsultation = consultationRegistry.register("CreateConsultation", CreateConsultationSchema);
const updateConsultation = consultationRegistry.register("UpdateConsultation", UpdateConsultationSchema);
consultationRegistry.register("GetConsultation", GetConsultationRequestSchema);

// Register the path for creating a consultation
consultationRegistry.registerPath({
  method: "post",
  path: "/consultation/case/{caseId}",
  tags: ["consultation"],
  operationId: "createConsultation",
  summary: "Create a new consultation for a patient case",
  description: "Create a new consultation for a patient case",
  request: {
    params: z.object({ caseId: commonValidations.id }),
    body: {
      content: {
        "application/json": { schema: createConsultation },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: ConsultationWithFormsSchema,
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
  "/consultation/case/:caseId",
  validateRequest(
    z.object({
      body: CreateConsultationSchema,
      params: z.object({ caseId: commonValidations.id }),
    }),
  ),
  consultationController.createConsultation,
);

// Register the path for getting a consultation by ID
consultationRegistry.registerPath({
  method: "get",
  path: "/consultation/{consultationId}",
  tags: ["consultation"],
  operationId: "getConsultationById",
  summary: "Retrieve a consultation by ID for a patientId and caseId",
  description: "Retrieve a consultation by ID for a patientId and caseId",
  request: {
    params: z.object({
      consultationId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: ConsultationWithFormsSchema,
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

consultationRouter.get("/consultation/:consultationId", consultationController.getConsultationById);

// Register the path for getting all consultations for a given patientId and caseId
consultationRegistry.registerPath({
  method: "get",
  path: "/consultations/case/{caseId}",
  tags: ["consultation"],
  operationId: "getAllConsultations",
  summary: "Retrieve all consultations for a given caseId",
  description: "Retrieve all consultations for a given caseId",
  request: { params: z.object({ caseId: commonValidations.id }) },
  responses: createApiResponses([
    {
      schema: z.array(ConsultationWithFormsSchema),
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

consultationRouter.get("/consultations/case/:caseId", consultationController.getAllConsultations);

// Register the path for getting all consultations for a given day
consultationRegistry.registerPath({
  method: "get",
  path: "/consultations/from/{fromDate}/to/{toDate}",
  tags: ["consultation"],
  operationId: "getAllConsultationsOnDay",
  summary: "Retrieve all consultations on a given date",
  description: "Retrieve all consultations on a given date",
  request: { params: z.object({ fromDate: z.date(), toDate: z.date() }) },
  responses: createApiResponses([
    {
      schema: z.array(ConsultationWithFormsSchema),
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

consultationRouter.get(
  "/consultations/from/:fromDate/to/:toDate",
  validateRequest(
    z.object({
      params: z.object({ fromDate: dateSchema, toDate: dateSchema }),
    }),
  ),
  consultationController.getAllConsultationsOnDay,
);

// Register the path for updating a consultation by ID
consultationRegistry.registerPath({
  method: "put",
  path: "/consultation/{consultationId}",
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
      content: { "application/json": { schema: updateConsultation.partial() } },
    },
  },
  responses: createApiResponses([
    {
      schema: ConsultationWithFormsSchema,
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
  "/consultation/:consultationId",
  // validateRequest(z.object({ body: updateConsultation.partial() })),
  validateRequest(updateConsultation.partial()),
  consultationController.updateConsultation,
);

// Register the path for deleting a consultation by ID
consultationRegistry.registerPath({
  method: "delete",
  path: "/consultation/{consultationId}",
  tags: ["consultation"],
  operationId: "deleteConsultation",
  summary: "Delete a consultation by ID",
  description: "Delete a consultation by ID",
  request: {
    params: z.object({
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

consultationRouter.delete("/consultation/:consultationId", consultationController.deleteConsultation);

// Register the path for getting a consultation by form access code
consultationRegistry.registerPath({
  method: "get",
  path: "/consultation/code/{code}",
  tags: ["consultation"],
  operationId: "getConsultationByCode",
  summary: "Retrieve a consultation by form access code",
  description: "Retrieve a consultation by form access code",
  request: {
    params: z.object({
      code: z.string(),
    }),
  },
  responses: createApiResponses([
    {
      schema: ConsultationWithFormsSchema,
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
  "/consultation/code/:code",
  validateRequest(
    z.object({
      params: z.object({ code: z.string() }),
    }),
  ),
  consultationController.getConsultationByCode,
);
