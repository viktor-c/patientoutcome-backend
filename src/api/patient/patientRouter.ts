import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { PatientCaseSchema } from "@/api/case/patientCaseModel";
import {
  CreatePatientSchema,
  GetPatientByExternalIdSchema,
  GetPatientSchema,
  PatientSchema,
  UpdatePatientSchema,
} from "@/api/patient/patientModel";
import { validateRequest } from "@/common/utils/httpHandlers";
import { patientController } from "./patientController";

// initialize the openapi registry
export const patientRegistry = new OpenAPIRegistry();
// create an express router
export const patientRouter: Router = express.Router();

// Create the Patient schema with populated cases for OpenAPI
const PatientWithCasesSchema = PatientSchema.extend({
  cases: z.array(PatientCaseSchema).optional(),
});

/* Define schemas and paths to create openapi */
patientRegistry.register("Patient", PatientSchema);
patientRegistry.register("PatientWithCases", PatientWithCasesSchema);

// Register the path for getting all patients
patientRegistry.registerPath({
  method: "get",
  path: "/patient",
  tags: ["Patient"],
  operationId: "getPatients",
  summary: "Get all patients",
  description: "Get all patients",
  responses: createApiResponses([
    {
      schema: z.array(PatientWithCasesSchema),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving patients.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

patientRouter.get("/", patientController.getPatients);

// Register the path for getting a patient by ID
patientRegistry.registerPath({
  method: "get",
  path: "/patient/{id}",
  tags: ["Patient"],
  operationId: "getPatientById",
  summary: "Get a patient by ID",
  description: "Get a patient by ID",
  request: { params: GetPatientSchema.shape.params },
  responses: createApiResponses([
    {
      schema: PatientWithCasesSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient not found",
      statusCode: 404,
    },
  ]),
});

patientRouter.get("/:id", validateRequest(GetPatientSchema), patientController.getPatient);

// Register the path for getting patients by external ID,
// useful when searching for a patient from the frontend, when you do not have the id of a patient
patientRegistry.registerPath({
  method: "get",
  path: "/patient/externalId/{id}",
  tags: ["Patient"],
  operationId: "getPatientByExternalId",
  summary: "Get patient by externalPatientId",
  description:
    "Get patient by externalPatientId, useful when searching for a patient from the frontend, when you do not have the id of a patient",
  request: { params: GetPatientByExternalIdSchema.shape.params },
  responses: createApiResponses([
    {
      schema: PatientWithCasesSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "No patient found with the given external ID",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving patients by external ID.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
patientRouter.get(
  "/externalId/:id",
  validateRequest(GetPatientByExternalIdSchema),
  patientController.getPatientByExternalId,
);

// Register the path for creating a patient
patientRegistry.registerPath({
  method: "post",
  path: "/patient",
  tags: ["Patient"],
  operationId: "createPatient",
  summary: "Create a new patient",
  description:
    "Create a new patient with the provided details. </br>'externalPatientId' must be unique, if not it will return a 409 error.",
  request: {
    body: {
      content: {
        "application/json": { schema: CreatePatientSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: PatientWithCasesSchema,
      description: "Success",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient with the same external ID already exists",
      statusCode: 409,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the patient",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

patientRouter.post("/", validateRequest(CreatePatientSchema), patientController.createPatient);

// Register the path for updating a patient
patientRegistry.registerPath({
  method: "put",
  path: "/patient/{id}",
  tags: ["Patient"],
  operationId: "updatePatient",
  summary: "Update a patient",
  description: "Update a patient with the provided details.",
  request: {
    params: UpdatePatientSchema.shape.params,
    body: {
      content: {
        "application/json": { schema: UpdatePatientSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: PatientWithCasesSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating the patient",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

patientRouter.put("/:id", validateRequest(UpdatePatientSchema), patientController.updatePatient);

// Register the path for deleting a patient
patientRegistry.registerPath({
  method: "delete",
  path: "/patient/{id}",
  tags: ["Patient"],
  operationId: "deletePatient",
  request: { params: GetPatientSchema.shape.params },
  summary: "Delete a patient",
  description: "Delete a patient by ID",
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Success",
      statusCode: 204,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while deleting the patient",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

patientRouter.delete("/:id", validateRequest(GetPatientSchema), patientController.deletePatient);
