import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { patientCaseRouter } from "@/api/patient/case/patientCaseRouter"; // Import the patientCaseRouter
import { CreatePatientSchema, GetPatientSchema, PatientSchema, UpdatePatientSchema } from "@/api/patient/patientModel";
import { validateRequest } from "@/common/utils/httpHandlers";
import { patientController } from "./patientController";

// initialize the openapi registry
export const patientRegistry = new OpenAPIRegistry();
// create an express router
export const patientRouter: Router = express.Router();

/* Define schemas and paths to create openapi */
patientRegistry.register("Patient", PatientSchema);

// Register the path for getting all patients
patientRegistry.registerPath({
  method: "get",
  path: "/patient",
  tags: ["Patient"],
  responses: createApiResponse(z.array(PatientSchema), "Success"),
});

patientRouter.get("/", patientController.getPatients);

// Register the path for getting a patient by ID
patientRegistry.registerPath({
  method: "get",
  path: "/patient/{id}",
  tags: ["Patient"],
  request: { params: GetPatientSchema.shape.params },
  responses: createApiResponse(PatientSchema, "Success"),
});

patientRouter.get("/:id", validateRequest(GetPatientSchema), patientController.getPatient);

// Register the path for creating a patient
patientRegistry.registerPath({
  method: "post",
  path: "/patient",
  tags: ["Patient"],
  request: {
    body: {
      content: {
        "application/json": { schema: CreatePatientSchema.shape.body },
      },
    },
  },
  responses: createApiResponse(PatientSchema, "Success"),
});

patientRouter.post("/", validateRequest(CreatePatientSchema), patientController.createPatient);

// Register the path for updating a patient
patientRegistry.registerPath({
  method: "put",
  path: "/patient/{id}",
  tags: ["Patient"],
  request: {
    params: UpdatePatientSchema.shape.params,
    body: {
      content: {
        "application/json": { schema: UpdatePatientSchema.shape.body },
      },
    },
  },
  responses: createApiResponse(PatientSchema, "Success"),
});

patientRouter.put("/:id", validateRequest(UpdatePatientSchema), patientController.updatePatient);

// Register the path for deleting a patient
patientRegistry.registerPath({
  method: "delete",
  path: "/patient/{id}",
  tags: ["Patient"],
  request: { params: GetPatientSchema.shape.params },
  responses: {
    [204]: {
      description: "Patient deleted successfully",
    },
  },
});

patientRouter.delete("/:id", validateRequest(GetPatientSchema), patientController.deletePatient);

// Use the patientCaseRouter within the patientRouter
patientRouter.use("/:patientId/cases/", patientCaseRouter);
