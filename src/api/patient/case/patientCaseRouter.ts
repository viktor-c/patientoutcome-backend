import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { UserSchema } from "@/api/user/userModel";
import { commonValidations } from "@/common/utils/commonValidation";
import { StatusCodes } from "http-status-codes";
import { patientCaseController } from "./patientCaseController";
import { DiagnosisSchema, PatientCaseSchema } from "./patientCaseModel";

export const patientCaseRegistry = new OpenAPIRegistry();
export const patientCaseRouter: Router = express.Router({ mergeParams: true });

// Import the consultationRouter and add it to the patientCaseRouter
import { consultationRouter } from "./consultation/consultationRouter";
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
  path: "/patient/{patientId}/cases",
  tags: ["Patient Cases"],
  request: { params: z.object({ patientId: commonValidations.id }) },
  responses: createApiResponse(z.array(PatientCaseSchema), "Returns an array of patient cases"),
});
patientCaseRouter.get(
  "/",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id }) })),
  patientCaseController.getAllCases,
);

/**
 * description: Get a patient case by patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get a patient case by patientId and caseId",
  path: "/patient/{patientId/}cases/{caseId}",
  tags: ["Patient Cases"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponse(PatientCaseSchema, "Returns the patient case"),
});
patientCaseRouter.get(
  "/:caseId",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) })),
  patientCaseController.getCaseById,
);

/**
 * description: Create a patient case for patient with patientId
 */
patientCaseRegistry.registerPath({
  method: "post",
  summary: "Create a patient case for patient with patientId",
  path: "/patient/{patientId/}cases",
  tags: ["Patient Cases"],
  request: {
    params: z.object({ patientId: commonValidations.id }),
    body: {
      content: {
        "application/json": { schema: PatientCaseSchema.omit({ _id: true }) },
      },
    },
  },
  responses: createApiResponse(PatientCaseSchema, "Returns the created patient case"),
});
patientCaseRouter.post(
  "/",
  validateRequest(
    z.object({ body: PatientCaseSchema.omit({ _id: true }), params: z.object({ patientId: commonValidations.id }) }),
  ),
  patientCaseController.createCase,
);

/**
 * description: Update a patient case by patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "put",
  summary: "Update a patient case by patientId and caseId",
  path: "/patient/{patientId}/cases/{caseId}",
  tags: ["Patient Cases"],
  request: {
    params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
    body: {
      content: {
        "application/json": { schema: PatientCaseSchema.partial() },
      },
    },
  },
  responses: createApiResponse(PatientCaseSchema, "Returns the updated patient case"),
});
patientCaseRouter.put(
  "/:caseId",
  validateRequest(
    z.object({
      params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
      body: PatientCaseSchema.partial(),
    }),
  ),
  patientCaseController.updateCase,
);

/**
 * description: delete a patient case by patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "delete",
  summary: "Delete a patient case by patientId and caseId",
  path: "/patient/{patientId}/cases/{caseId}",
  tags: ["Patient Cases"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponse(
    z.null(),
    "When patient case is deleted successfully, returns null",
    StatusCodes.NO_CONTENT,
  ),
});
patientCaseRouter.delete(
  "/:caseId",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) })),
  patientCaseController.deleteCaseById,
);

// Extra endpoints
/**
 * description: Get all notes for a patient case by patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all notes for a patient case by patientId and caseId",
  path: "/patient/{patientId}/cases/{caseId}/notes/",
  tags: ["Patient Cases"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponse(z.array(PatientCaseSchema.shape.notes.element), "Returns an array of notes"),
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
  path: "/patient/{patientId}/cases/{caseId}/notes/",
  tags: ["Patient Cases"],
  request: {
    params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
    body: {
      content: {
        "application/json": { schema: PatientCaseSchema.shape.notes.element.omit({ _id: true }) },
      },
    },
  },
  responses: createApiResponse(PatientCaseSchema, "On success returns the updated case"),
});
patientCaseRouter.post(
  "/:caseId/notes/",
  validateRequest(
    z.object({
      params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
      body: PatientCaseSchema.shape.notes.element.omit({ _id: true }),
    }),
  ),
  patientCaseController.addNoteToCase,
);

/**
 * description: Delete a note from a patient case by patientId, caseId and noteId
 */
patientCaseRegistry.registerPath({
  method: "delete",
  summary: "Delete a note from a patient case by patientId, caseId and noteId",
  path: "/patient/{patientId}/cases/{caseId}/notes/{noteId}",
  tags: ["Patient Cases"],
  request: {
    params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id, noteId: commonValidations.id }),
  },
  responses: createApiResponse(z.null(), "On success returns null", StatusCodes.NO_CONTENT),
});
patientCaseRouter.delete(
  "/:caseId/notes/:noteId",
  validateRequest(
    z.object({
      params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id, noteId: commonValidations.id }),
    }),
  ),
  patientCaseController.deleteNoteFromCase,
);

/**
 * description: Get all cases with a specific diagnosis
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all case diagnosis for patient with patientId and caseId",
  path: "/patient/{patientId}/cases/{caseId}/diagnosis/",
  tags: ["Patient Cases"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponse(z.array(DiagnosisSchema), "Returns an array of diagnosis for the given case"),
});
patientCaseRouter.get(
  "/:caseId/diagnosis/",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) })),
  patientCaseController.getDiagnosis,
);

/**
 * description: Get all diagnosisICD10 for patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all diagnosisICD10 for patientId and caseId",
  path: "/patient/{patientId}/cases/{caseId}/diagnosisICD10",
  tags: ["Patient Cases"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponse(z.array(DiagnosisSchema), "Returns an array of diagnosisICD10 for the given case"),
});
patientCaseRouter.get(
  "/:caseId/diagnosisICD10",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) })),
  patientCaseController.getDiagnosisICD10,
);

/**
 * description: Get all surgeons for patient with patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all surgeons for patient with patientId and caseId",
  path: "/patient/{patientId}/cases/{caseId}/surgeons",
  tags: ["Patient Cases"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponse(z.array(UserSchema), "Returns an array of surgeons for the given case"),
});
patientCaseRouter.get(
  "/:caseId/surgeons",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) })),
  patientCaseController.getSurgeons,
);

/**
 * description: Get all supervisors for patientId and caseId
 */
patientCaseRegistry.registerPath({
  method: "get",
  summary: "Get all supervisors for patientId and caseId",
  path: "/patient/{patientId}/cases/{caseId}/supervisors",
  tags: ["Patient Cases"],
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: createApiResponse(z.array(UserSchema), "Returns an array of supervisors for the given case"),
});
patientCaseRouter.get(
  "/:caseId/supervisors",
  validateRequest(z.object({ params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) })),
  patientCaseController.getSupervisors,
);
