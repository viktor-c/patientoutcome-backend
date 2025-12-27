/**
 * @file Patient Case Router
 * @module api/case
 * @description Manages patient cases which represent clinical episodes of care. Each case links a patient to surgeries,
 * consultations, supervisors, and diagnoses. Provides comprehensive CRUD operations, search functionality, and case
 * statistics tracking for patient outcome management.
 */

import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { ConsultationWithFormsSchema } from "@/api/consultation/consultationModel";
import { PatientSchema } from "@/api/patient/patientModel";
import { SurgerySchema } from "@/api/surgery/surgeryModel";
import { UserNoPasswordSchema } from "@/api/user/userModel";
import { ValidationErrorsSchema } from "@/common/models/serviceResponse";
import { commonValidations } from "@/common/utils/commonValidation";
import { StatusCodes } from "http-status-codes";
import { patientCaseController } from "./patientCaseController";
import { CreatePatientCaseSchema, DiagnosisSchema, PatientCaseSchema } from "./patientCaseModel";

import { CreateNoteSchema, NoteSchema } from "@/api/generalSchemas";
import { PatientCaseSearchResultSchema } from "./patientCaseModel";

export const patientCaseRegistry = new OpenAPIRegistry();
export const caseRouter: Router = express.Router({ mergeParams: true });

// Create the PatientCase schema with populated fields for OpenAPI
const SurgeryWithUsersSchema = SurgerySchema.extend({
  surgeons: z.array(UserNoPasswordSchema),
});

const PatientCaseWithPopulatedFieldsSchema = PatientCaseSchema.extend({
  patient: PatientSchema,
  surgeries: z.array(SurgeryWithUsersSchema),
  supervisors: z.array(UserNoPasswordSchema),
  consultations: z.array(ConsultationWithFormsSchema).optional(),
});

/**
 * Register the PatientCase schema
 */
patientCaseRegistry.register("PatientCase", PatientCaseSchema);
patientCaseRegistry.register("PatientCaseWithPopulatedFields", PatientCaseWithPopulatedFieldsSchema);

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
      schema: z.array(PatientCaseWithPopulatedFieldsSchema),
      description: "Returns an array of patient cases",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving patient cases.",
      statusCode: 500,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
caseRouter.get(
  "/patient/:patientId/cases",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id }) })),
  patientCaseController.getAllPatientCases,
);

/**
 * description: Get a patient case by patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get a patient case by caseId",
  description: "Get a patient case by caseId",
  operationId: "getPatientCaseById",
  path: "/case/id/{caseId}",
  tags: ["patient case"],
  request: {
    params: z.object({
      caseId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: PatientCaseWithPopulatedFieldsSchema,
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
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
caseRouter.get(
  "/case/id/:caseId",
  validateRequest(
    z.object({
      params: z.object({
        caseId: commonValidations.id,
      }),
    }),
  ),
  patientCaseController.getPatientCaseById,
);

/**
 * description: Search for cases by parts of an id
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Search patient cases by external id",
  description:
    "Search patient cases by partial external id - returns lightweight results with only IDs to minimize traffic",
  operationId: "searchCasesByExternalId",
  path: "/cases/searchById/{searchQuery}",
  tags: ["patient case"],
  request: { params: z.object({ searchQuery: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.array(PatientCaseSearchResultSchema),
      description: "Returns a list of case IDs and external IDs matching the search query",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Patient cases not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the patient case.",
      statusCode: 500,
    },
  ]),
});
caseRouter.get(
  "/cases/searchById/:searchQuery",
  validateRequest(z.object({ params: z.object({ searchQuery: z.string() }) })),
  patientCaseController.searchCasesByExternalId,
);

/**
 * description: Create a patient case for patient with patientId
 */

const CaseNoIdSchema = patientCaseRegistry.register("CreateCaseSchema", CreatePatientCaseSchema.omit({ _id: true }));

patientCaseRegistry.registerPath({
  method: "post",
  summary: "Create a patient case for patient with patientId",
  description: "Create a patient case for patient with patientId",
  operationId: "createPatientCase",
  path: "/patient/{patientId}/case",
  tags: ["patient case"],
  request: {
    params: z.object({ patientId: commonValidations.id }),
    body: {
      content: {
        "application/json": { schema: CaseNoIdSchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: PatientCaseWithPopulatedFieldsSchema,
      description: "Returns the created patient case",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the patient case.",
      statusCode: 500,
    },
    {
      schema: ValidationErrorsSchema,
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
caseRouter.post(
  "/patient/:patientId/case/",
  validateRequest(
    z.object({
      body: CreatePatientCaseSchema.omit({ _id: true }),
      params: z.object({ patientId: commonValidations.id }),
    }),
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
  path: "/patient/{patientId}/case/{caseId}",
  tags: ["patient case"],
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
    }),
    body: {
      content: {
        "application/json": { schema: CreatePatientCaseSchema.partial() },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: PatientCaseWithPopulatedFieldsSchema,
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
      schema: ValidationErrorsSchema,
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
caseRouter.put(
  "/patient/:patientId/case/:caseId",
  validateRequest(
    z.object({
      params: z.object({
        patientId: commonValidations.id,
        caseId: commonValidations.id,
      }),
      body: CreatePatientCaseSchema.partial(),
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
  path: "/patient/{patientId}/case/{caseId}",
  tags: ["patient case"],
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
    }),
  },
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
      schema: ValidationErrorsSchema,
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
caseRouter.delete(
  "/patient/:patientId/case/:caseId",
  validateRequest(
    z.object({
      params: z.object({
        patientId: commonValidations.id,
        caseId: commonValidations.id,
      }),
    }),
  ),
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
  path: "/patient/{patientId}/case/{caseId}/notes/",
  tags: ["patient case"],
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: z.array(NoteSchema),
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
      schema: ValidationErrorsSchema,
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
caseRouter.get(
  "/patient/:patientId/case/:caseId/notes/",
  validateRequest(
    z.object({
      params: z.object({
        patientId: commonValidations.id,
        caseId: commonValidations.id,
      }),
    }),
  ),
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
  path: "/patient/{patientId}/case/{caseId}/note/",
  tags: ["patient case"],
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
    }),
    body: {
      content: {
        "application/json": { schema: CreateNoteSchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: PatientCaseWithPopulatedFieldsSchema,
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
      schema: ValidationErrorsSchema,
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
caseRouter.post(
  "/patient/:patientId/case/:caseId/note",
  validateRequest(
    z.object({
      params: z.object({
        patientId: commonValidations.id,
        caseId: commonValidations.id,
      }),
      body: CreateNoteSchema,
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
  path: "/patient/{patientId}/case/{caseId}/note/{noteId}",
  tags: ["patient case"],
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
      noteId: commonValidations.id,
    }),
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
      schema: ValidationErrorsSchema,
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
caseRouter.delete(
  "/patient/:patientId/case/:caseId/note/:noteId",
  validateRequest(
    z.object({
      params: z.object({
        patientId: commonValidations.id,
        caseId: commonValidations.id,
        noteId: commonValidations.id,
      }),
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
  path: "/diagnosis/{diagnosis}/cases",
  tags: ["query"],
  request: { params: z.object({ diagnosis: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.array(PatientCaseWithPopulatedFieldsSchema),
      description: "Returns an array of cases with a given diagnosis",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving cases with the given diagnosis.",
      statusCode: 500,
    },
    {
      schema: ValidationErrorsSchema,
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
caseRouter.get(
  "/diagnosis/:diagnosis/cases",
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
  path: "/diagnosisICD10/{diagnosisICD10}/cases",
  tags: ["query"],
  request: { params: z.object({ diagnosisICD10: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.array(PatientCaseWithPopulatedFieldsSchema),
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
caseRouter.get(
  "/diagnosisICD10/:diagnosisICD10/cases",
  validateRequest(z.object({ params: z.object({ diagnosisICD10: z.string() }) })),
  patientCaseController.getCasesByDiagnosisICD10,
);

/**
 * description: Get all supervisors for patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all supervisors for patientId and caseId",
  description: "Get all supervisors for patientId and caseId",
  operationId: "getSupervisorsByCaseId",
  path: "/patient/{patientId}/case/{caseId}/supervisors",
  tags: ["patient case"],
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: z.array(UserNoPasswordSchema),
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
caseRouter.get(
  "patient/:patiendId/case/:caseId/supervisors",
  validateRequest(
    z.object({
      params: z.object({
        patientId: commonValidations.id,
        caseId: commonValidations.id,
      }),
    }),
  ),
  patientCaseController.getSupervisorsByCaseId,
);
