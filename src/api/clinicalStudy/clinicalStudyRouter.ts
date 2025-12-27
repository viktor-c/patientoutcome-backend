/**
 * @file Clinical Study Router
 * @module api/clinicalStudy
 * @description Manages clinical research studies. Tracks study metadata, assigned study nurses, supervisors, and
 * associated diagnoses. Enables filtering studies by nurse ID, supervisor ID, or diagnosis code for research
 * management and patient enrollment.
 */

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { UserNoPasswordSchema } from "@/api/user/userModel";
import { validateRequest } from "@/common/utils/httpHandlers";
import { clinicalStudyController } from "./clinicalStudyController";
// ********************** specific imports for clinicalstudy ************************
import {
  ClinicalStudySchema,
  GetClinicalStudyByDiagnosisSchema,
  GetClinicalStudyByNurseIdSchema,
  GetClinicalStudyBySupervisorIdSchema,
  GetClinicalStudySchema,
  UpdateClinicalStudySchema,
} from "./clinicalStudyModel";

// initialize the openapi registry
export const clinicalStudyRegistry = new OpenAPIRegistry();
// create an express router
export const clinicalStudyRouter: Router = express.Router();

// Create the ClinicalStudy schema with populated users for OpenAPI
const ClinicalStudyWithUsersSchema = ClinicalStudySchema.extend({
  studyNurses: z.array(UserNoPasswordSchema),
  supervisors: z.array(UserNoPasswordSchema),
});

/* Define schemas and paths to create openapi - only in non-test environment */
if (process.env.NODE_ENV !== "test") {
  clinicalStudyRegistry.register("ClinicalStudy", ClinicalStudySchema);
  clinicalStudyRegistry.register("ClinicalStudyWithUsers", ClinicalStudyWithUsersSchema);
}

// Register the path for creating a clinical study
clinicalStudyRegistry.registerPath({
  method: "post",
  path: "/clinicalstudy",
  tags: ["ClinicalStudy"],
  operationId: "createClinicalStudy",
  summary: "Create a new clinical study",
  description: "Create a new clinical study",
  request: {
    body: {
      content: {
        "application/json": { schema: ClinicalStudySchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: ClinicalStudyWithUsersSchema,
      description: "Success",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the clinical study",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

clinicalStudyRouter.post("/", validateRequest(ClinicalStudySchema), clinicalStudyController.createClinicalStudy);

// Register the path for getting all clinical studies
clinicalStudyRegistry.registerPath({
  method: "get",
  path: "/clinicalstudy",
  tags: ["ClinicalStudy"],
  operationId: "getClinicalStudies",
  summary: "Get all clinical studies",
  description: "Get all clinical studies",
  responses: createApiResponses([
    {
      schema: z.array(ClinicalStudyWithUsersSchema),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving clinical studies.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

clinicalStudyRouter.get("/", clinicalStudyController.getClinicalStudies);

// Register the path for getting a clinical study by ID
clinicalStudyRegistry.registerPath({
  method: "get",
  path: "/clinicalstudy/{id}",
  tags: ["ClinicalStudy"],
  operationId: "getClinicalStudyById",
  summary: "Get a clinical study by ID",
  description: "Get a clinical study by ID",
  request: { params: GetClinicalStudySchema.shape.params },
  responses: createApiResponses([
    {
      schema: ClinicalStudyWithUsersSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Clinical study not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

clinicalStudyRouter.get("/:id", validateRequest(GetClinicalStudySchema), clinicalStudyController.getClinicalStudyById);

// Register the path for updating a clinical study
clinicalStudyRegistry.registerPath({
  method: "put",
  path: "/clinicalstudy/{id}",
  tags: ["ClinicalStudy"],
  operationId: "updateClinicalStudy",
  summary: "Update a clinical study by ID",
  description: "Update a clinical study by ID",
  request: {
    params: UpdateClinicalStudySchema.shape.params,
    body: {
      content: {
        "application/json": { schema: UpdateClinicalStudySchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: ClinicalStudyWithUsersSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Clinical study not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating the clinical study",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

clinicalStudyRouter.put(
  "/:id",
  validateRequest(z.object({ id: z.string() })),
  clinicalStudyController.updateClinicalStudy,
);

// Register the path for deleting a clinical study
clinicalStudyRegistry.registerPath({
  method: "delete",
  path: "/clinicalstudy/{id}",
  tags: ["ClinicalStudy"],
  operationId: "deleteClinicalStudy",
  summary: "Delete a clinical study by ID",
  description: "Delete a clinical study by ID",
  request: { params: GetClinicalStudySchema.shape.params },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Success",
      statusCode: 204,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Clinical study not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while deleting the clinical study",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

clinicalStudyRouter.delete(
  "/:id",
  validateRequest(GetClinicalStudySchema),
  clinicalStudyController.deleteClinicalStudy,
);

// Register the path for getting clinical studies by supervisor ID
clinicalStudyRegistry.registerPath({
  method: "get",
  path: "/clinicalstudy/supervisor/{supervisorId}",
  tags: ["ClinicalStudy"],
  operationId: "getClinicalStudiesBySupervisorId",
  summary: "Get clinical studies by supervisor ID",
  description: "Get clinical studies by supervisor ID",
  request: { params: GetClinicalStudyBySupervisorIdSchema.shape.params },
  responses: createApiResponses([
    {
      schema: z.array(ClinicalStudyWithUsersSchema),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Clinical study not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving clinical studies.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

clinicalStudyRouter.get(
  "/supervisor/:supervisorId",
  validateRequest(GetClinicalStudyBySupervisorIdSchema),
  clinicalStudyController.getClinicalStudiesBySupervisor,
);

// Register the path for getting clinical studies by study nurse ID
clinicalStudyRegistry.registerPath({
  method: "get",
  path: "/clinicalstudy/studynurse/{studyNurseId}",
  tags: ["ClinicalStudy"],
  operationId: "getClinicalStudiesByStudyNurseId",
  summary: "Get clinical studies by study nurse ID",
  description: "Get clinical studies by study nurse ID",
  request: { params: GetClinicalStudyByNurseIdSchema.shape.params },
  responses: createApiResponses([
    {
      schema: z.array(ClinicalStudyWithUsersSchema),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Clinical study not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving clinical studies.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

clinicalStudyRouter.get(
  "/studynurse/:studyNurseId",
  validateRequest(GetClinicalStudyByNurseIdSchema),
  clinicalStudyController.getClinicalStudiesByStudyNurse,
);

// Register the path for getting clinical studies by diagnosis
clinicalStudyRegistry.registerPath({
  method: "get",
  path: "/clinicalstudy/diagnosis/{diagnosis}",
  tags: ["ClinicalStudy"],
  operationId: "getClinicalStudiesByDiagnosis",
  summary: "Get clinical studies by diagnosis",
  description: "Get clinical studies by diagnosis",
  request: { params: GetClinicalStudyByDiagnosisSchema.shape.params },
  responses: createApiResponses([
    {
      schema: z.array(ClinicalStudyWithUsersSchema),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Clinical study not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving clinical studies.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

clinicalStudyRouter.get(
  "/diagnosis/:diagnosis",
  validateRequest(GetClinicalStudyByDiagnosisSchema),
  clinicalStudyController.getClinicalStudiesByDiagnosis,
);
