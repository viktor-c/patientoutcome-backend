import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponse, createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { UserSchema } from "@/api/user/userModel";
import { commonValidations } from "@/common/utils/commonValidation";
import { StatusCodes } from "http-status-codes";
import { patientCaseController } from "./patientCaseController";
import { DiagnosisSchema, PatientCaseSchema } from "./patientCaseModel";

export const patientCaseRegistry = new OpenAPIRegistry();
export const patientCaseRouter: Router = express.Router({ mergeParams: true });

// Import the consultationRouter and add it to the patientCaseRouter
import { consultationRouter } from "@/api/patient/consultation/consultationRouter";
// Register the consultation router
patientCaseRouter.use("/:caseId/consultations/", consultationRouter);

/**
 * Register the PatientCase schema
 */
patientCaseRegistry.register("PatientCase", PatientCaseSchema);

/**
 * description: Get all patient cases for patient with patientId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all patient cases for patient with patientId",
  description: "Get all patient cases for patient with patientId",
  operationId: "getAllPatientCases",
  path: "/patient/{patientId}/cases",
  tags: ["patient case"],
  request: { params: z.object({ patientId: commonValidations.id }) },
  responses: createApiResponses([
    {
      schema: z.array(PatientCaseSchema),
      description: "Returns an array of patient cases",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving patient cases.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
patientCaseRouter.get(
  "/",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id }) })),
  patientCaseController.getAllPatientCases,
);

/**
 * description: Get a patient case by patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get a patient case by patientId and caseId",
  description: "Get a patient case by patientId and caseId",
  operationId: "getPatientCaseById",
  path: "/patient/{patientId}/cases/{caseId}",
  tags: ["patient case"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponses([
    {
      schema: PatientCaseSchema,
      description: "Returns the patient case",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient case not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the patient case.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
patientCaseRouter.get(
  "/:caseId",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) })),
  patientCaseController.getPatientCaseById,
);

/**
 * description: Create a patient case for patient with patientId
 */
patientCaseRegistry.registerPath({
  method: "post",
  summary: "Create a patient case for patient with patientId",
  description: "Create a patient case for patient with patientId",
  operationId: "createPatientCase",
  path: "/patient/{patientId}/cases",
  tags: ["patient case"],
  request: {
    params: z.object({ patientId: commonValidations.id }),
    body: {
      content: {
        "application/json": { schema: PatientCaseSchema.omit({ _id: true }) },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: PatientCaseSchema,
      description: "Returns the created patient case",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the patient case.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient case with the same external ID already exists",
      statusCode: 409,
    },
  ]),
});
patientCaseRouter.post(
  "/",
  validateRequest(
    z.object({ body: PatientCaseSchema.omit({ _id: true }), params: z.object({ patientId: commonValidations.id }) }),
  ),
  patientCaseController.createPatientCase,
);

/**
 * description: Update a patient case by patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "put",
  summary: "Update a patient case by patientId and caseId",
  description: "Update a patient case by patientId and caseId",
  operationId: "updatePatientCaseById",
  path: "/patient/{patientId}/cases/{caseId}",
  tags: ["patient case"],
  request: {
    params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
    body: {
      content: {
        "application/json": { schema: PatientCaseSchema.partial() },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: PatientCaseSchema,
      description: "Returns the updated patient case",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient case not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating the patient case.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient case with the same external ID already exists",
      statusCode: 409,
    },
  ]),
});
patientCaseRouter.put(
  "/:caseId",
  validateRequest(
    z.object({
      params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
      body: PatientCaseSchema.partial(),
    }),
  ),
  patientCaseController.updatePatientCaseById,
);

/**
 * description: delete a patient case by patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "delete",
  summary: "Delete a patient case by patientId and caseId",
  description: "Delete a patient case by patientId and caseId",
  operationId: "deletePatientCaseById",
  path: "/patient/{patientId}/cases/{caseId}",
  tags: ["patient case"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponses([
    {
      schema: z.null(),
      description: "When patient case is deleted successfully, returns null",
      statusCode: 204,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient case not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while deleting the patient case.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient not found",
      statusCode: 404,
    },
  ]),
});
patientCaseRouter.delete(
  "/:caseId",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) })),
  patientCaseController.deletePatientCaseById,
);

// Extra endpoints
/**
 * description: Get all notes for a patient case by patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all notes for a patient case by patientId and caseId",
  description: "Get all notes for a patient case by patientId and caseId",
  operationId: "getNotesByCaseId",
  path: "/patient/{patientId}/cases/{caseId}/notes/",
  tags: ["patient case"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponses([
    {
      schema: z.array(PatientCaseSchema.shape.notes.element),
      description: "Returns an array of notes for the given case",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient case not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving notes for the patient case.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient not found",
      statusCode: 404,
    },
  ]),
});
patientCaseRouter.get(
  "/:caseId/notes/",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) })),
  patientCaseController.getNotesByCaseId,
);

/**
 * description: Add a note to a patient case by patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "post",
  summary: "Add a note to a patient case by patientId and caseId.",
  description: "Add a note to a patient case by patientId and caseId.",
  operationId: "createPatientCaseNote",
  path: "/patient/{patientId}/cases/{caseId}/notes/",
  tags: ["patient case"],
  request: {
    params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
    body: {
      content: {
        "application/json": { schema: PatientCaseSchema.shape.notes.element.omit({ _id: true }) },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: PatientCaseSchema,
      description: "Returns the updated case",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient case not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while adding the note to the patient case.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient not found",
      statusCode: 404,
    },
  ]),
});
patientCaseRouter.post(
  "/:caseId/notes/",
  validateRequest(
    z.object({
      params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
      body: PatientCaseSchema.shape.notes.element.omit({ _id: true }),
    }),
  ),
  patientCaseController.createPatientCaseNote,
);

/**
 * description: Delete a note from a patient case by patientId, caseId and noteId
 */
patientCaseRegistry.registerPath({
  method: "delete",
  summary: "Delete a note from a patient case by patientId, caseId and noteId",
  description: "Delete a note from a patient case by patientId, caseId and noteId",
  operationId: "deletePatientCaseNoteById",
  path: "/patient/{patientId}/cases/{caseId}/notes/{noteId}",
  tags: ["patient case"],
  request: {
    params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id, noteId: commonValidations.id }),
  },
  responses: createApiResponses([
    {
      schema: z.null(),
      description: "On success returns null",
      statusCode: 204,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient case not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while deleting the note from the patient case.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Note not found",
      statusCode: 404,
    },
  ]),
});
patientCaseRouter.delete(
  "/:caseId/notes/:noteId",
  validateRequest(
    z.object({
      params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id, noteId: commonValidations.id }),
    }),
  ),
  patientCaseController.deletePatientCaseNoteById,
);

/**
 * description: Get all cases with a specific diagnosis
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all cases with a specific diagnosis",
  description: "Get all cases with a specific diagnosis",
  operationId: "getCasesByDiagnosis",
  path: "/diagnosis/{diagnosis}",
  tags: ["query"],
  request: { params: z.object({ diagnosis: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.array(PatientCaseSchema),
      description: "Returns an array of cases with a given diagnosis",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving cases with the given diagnosis.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Diagnosis not found",
      statusCode: 404,
    },
  ]),
});
patientCaseRouter.get(
  "/diagnosis/:diagnosis",
  validateRequest(z.object({ params: z.object({ diagnosis: z.string() }) })),
  patientCaseController.getCasesByDiagnosis,
);

/**
 * description: Get all cases with a diagnosisICD10
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all cases with a diagnosisICD10",
  description: "Get all cases with a diagnosisICD10",
  operationId: "getCasesByDiagnosisICD10",
  path: "/diagnosisICD10/{diagnosisICD10}",
  tags: ["query"],
  request: { params: z.object({ diagnosisICD10: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.array(PatientCaseSchema),
      description: "Returns an array of cases with a given diagnosisICD10",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving cases with the given diagnosisICD10.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "DiagnosisICD10 not found",
      statusCode: 404,
    },
  ]),
});
patientCaseRouter.get(
  "/diagnosisICD10/:diagnosisICD10",
  validateRequest(z.object({ params: z.object({ diagnosisICD10: z.string() }) })),
  patientCaseController.getCasesByDiagnosisICD10,
);

/**
 * description: Get all surgeons for case with patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all surgeons for case with patientId and caseId",
  description: "Get all surgeons for case with patientId and caseId",
  operationId: "getSurgeonsByCaseId",
  path: "/patient/{patientId}/cases/{caseId}/surgeons",
  tags: ["patient case"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponses([
    {
      schema: z.array(UserSchema),
      description: "Returns an array of surgeons for the given case",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient case not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving surgeons for the patient case.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgeon not found",
      statusCode: 404,
    },
  ]),
});
patientCaseRouter.get(
  "/:caseId/surgeons",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) })),
  patientCaseController.getSurgeonsByCaseId,
);

/**
 * description: Get all supervisors for patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all supervisors for patientId and caseId",
  description: "Get all supervisors for patientId and caseId",
  operationId: "getSupervisorsByCaseId",
  path: "/patient/{patientId}/cases/{caseId}/supervisors",
  tags: ["patient case"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponses([
    {
      schema: z.array(UserSchema),
      description: "Returns an array of supervisors for the given case",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient case not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving supervisors for the patient case.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient not found",
      statusCode: 404,
    },
  ]),
});
patientCaseRouter.get(
  "/:caseId/supervisors",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) })),
  patientCaseController.getSupervisorsByCaseId,
);
