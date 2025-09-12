import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { dateSchema } from "@/api/generalSchemas";
import { UserNoPasswordSchema } from "@/api/user/userModel";
import { commonValidations } from "@/common/utils/commonValidation";
import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { surgeryController } from "./surgeryController";
import { CreateSurgerySchema, SurgerySchema } from "./surgeryModel";

export const surgeryRegistry = new OpenAPIRegistry();
export const surgeryRouter: Router = express.Router({ mergeParams: true });

// Create the Surgery schema with populated fields for OpenAPI
const SurgeryWithUsersSchema = SurgerySchema.extend({
  surgeons: z.array(UserNoPasswordSchema),
});

/**
 * Register the Surgery schema
 */
surgeryRegistry.register("Surgery", SurgerySchema);
surgeryRegistry.register("SurgeryWithUsers", SurgeryWithUsersSchema);

/**
 * description: Get all surgeries
 */
surgeryRegistry.registerPath({
  method: "get",
  summary: "Get all surgeries",
  description: "Get all surgeries",
  operationId: "getAllSurgeries",
  path: "/surgeries",
  tags: ["surgery"],
  request: {},
  responses: createApiResponses([
    {
      schema: z.array(SurgeryWithUsersSchema),
      description: "Returns an array of surgeries",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving surgeries.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "No surgeries found",
      statusCode: 404,
    },
  ]),
});
surgeryRouter.get("/surgeries", surgeryController.getAllSurgeries);

/**
 * description: Get a surgery by ID
 */
surgeryRegistry.registerPath({
  method: "get",
  summary: "Get a surgery by ID",
  description: "Get a surgery by ID",
  operationId: "getSurgeryById",
  path: "/surgery/{surgeryId}",
  tags: ["surgery"],
  request: {
    params: z.object({
      surgeryId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: SurgeryWithUsersSchema,
      description: "Returns the surgery",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgery not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the surgery.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.get(
  "/surgery/:surgeryId",
  validateRequest(
    z.object({
      params: z.object({
        surgeryId: commonValidations.id,
      }),
    }),
  ),
  surgeryController.getSurgeryById,
);

/**
 * description: Get surgeries by patient case ID
 */
surgeryRegistry.registerPath({
  method: "get",
  summary: "Get surgeries by patient case ID",
  description: "Get surgeries by patient case ID",
  operationId: "getSurgeriesByPatientCaseId",
  path: "/surgeries/case/{patientCaseId}",
  tags: ["surgery"],
  request: {
    params: z.object({
      patientCaseId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: z.array(SurgeryWithUsersSchema),
      description: "Returns an array of surgeries for the given patient case",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "No surgeries found for this patient case",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving surgeries.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.get(
  "/surgeries/case/:patientCaseId",
  validateRequest(
    z.object({
      params: z.object({
        patientCaseId: commonValidations.id,
      }),
    }),
  ),
  surgeryController.getSurgeriesByPatientCaseId,
);

/**
 * description: Search surgeries by external ID
 */
surgeryRegistry.registerPath({
  method: "get",
  summary: "Search surgeries by external ID",
  description: "Search surgeries by partial external ID",
  operationId: "searchSurgeriesByExternalId",
  path: "/surgeries/searchById/{searchQuery}",
  tags: ["surgery"],
  request: { params: z.object({ searchQuery: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.array(SurgeryWithUsersSchema),
      description: "Returns a list of surgeries whose IDs match the given query",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgeries not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving surgeries.",
      statusCode: 500,
    },
  ]),
});
surgeryRouter.get(
  "/surgeries/searchById/:searchQuery",
  validateRequest(z.object({ params: z.object({ searchQuery: z.string() }) })),
  surgeryController.searchSurgeriesByExternalId,
);

/**
 * description: Create a surgery
 */
const CreateSurgeryNoIdSchema = surgeryRegistry.register(
  "CreateSurgerySchema",
  CreateSurgerySchema.omit({ _id: true }),
);

surgeryRegistry.registerPath({
  method: "post",
  summary: "Create a surgery",
  description: "Create a surgery",
  operationId: "createSurgery",
  path: "/surgery",
  tags: ["surgery"],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateSurgeryNoIdSchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: SurgeryWithUsersSchema,
      description: "Returns the created surgery",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the surgery.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.post(
  "/surgery",
  validateRequest(
    z.object({
      body: CreateSurgerySchema.omit({ _id: true }),
    }),
  ),
  surgeryController.createSurgery,
);

/**
 * description: Update a surgery by ID
 */
surgeryRegistry.registerPath({
  method: "put",
  summary: "Update a surgery by ID",
  description: "Update a surgery by ID",
  operationId: "updateSurgeryById",
  path: "/surgery/{surgeryId}",
  tags: ["surgery"],
  request: {
    params: z.object({
      surgeryId: commonValidations.id,
    }),
    body: {
      content: {
        "application/json": { schema: CreateSurgerySchema.partial() },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: SurgeryWithUsersSchema,
      description: "Returns the updated surgery",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgery not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating the surgery.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.put(
  "/surgery/:surgeryId",
  validateRequest(
    z.object({
      params: z.object({
        surgeryId: commonValidations.id,
      }),
      body: CreateSurgerySchema.partial(),
    }),
  ),
  surgeryController.updateSurgeryById,
);

/**
 * description: Delete a surgery by ID
 */
surgeryRegistry.registerPath({
  method: "delete",
  summary: "Delete a surgery by ID",
  description: "Delete a surgery by ID",
  operationId: "deleteSurgeryById",
  path: "/surgery/{surgeryId}",
  tags: ["surgery"],
  request: {
    params: z.object({
      surgeryId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: z.null(),
      description: "When surgery is deleted successfully, returns null",
      statusCode: 204,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgery not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while deleting the surgery.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.delete(
  "/surgery/:surgeryId",
  validateRequest(
    z.object({
      params: z.object({
        surgeryId: commonValidations.id,
      }),
    }),
  ),
  surgeryController.deleteSurgeryById,
);

/**
 * description: Get surgeries by diagnosis
 */
surgeryRegistry.registerPath({
  method: "get",
  summary: "Get surgeries by diagnosis",
  description: "Get surgeries by diagnosis",
  operationId: "getSurgeriesByDiagnosis",
  path: "/surgeries/diagnosis/{diagnosis}",
  tags: ["surgery"],
  request: { params: z.object({ diagnosis: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.array(SurgeryWithUsersSchema),
      description: "Returns an array of surgeries with the given diagnosis",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgeries not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving surgeries.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.get(
  "/surgeries/diagnosis/:diagnosis",
  validateRequest(z.object({ params: z.object({ diagnosis: z.string() }) })),
  surgeryController.getSurgeriesByDiagnosis,
);

/**
 * description: Get surgeries by diagnosis ICD10
 */
surgeryRegistry.registerPath({
  method: "get",
  summary: "Get surgeries by diagnosis ICD10",
  description: "Get surgeries by diagnosis ICD10",
  operationId: "getSurgeriesByDiagnosisICD10",
  path: "/surgeries/diagnosisICD10/{diagnosisICD10}",
  tags: ["surgery"],
  request: { params: z.object({ diagnosisICD10: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.array(SurgeryWithUsersSchema),
      description: "Returns an array of surgeries with the given diagnosis ICD10",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgeries not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving surgeries.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.get(
  "/surgeries/diagnosisICD10/:diagnosisICD10",
  validateRequest(z.object({ params: z.object({ diagnosisICD10: z.string() }) })),
  surgeryController.getSurgeriesByDiagnosisICD10,
);

/**
 * description: Get surgeries by surgeon
 */
surgeryRegistry.registerPath({
  method: "get",
  summary: "Get surgeries by surgeon",
  description: "Get surgeries by surgeon",
  operationId: "getSurgeriesBySurgeon",
  path: "/surgeries/surgeon/{surgeonId}",
  tags: ["surgery"],
  request: { params: z.object({ surgeonId: commonValidations.id }) },
  responses: createApiResponses([
    {
      schema: z.array(SurgeryWithUsersSchema),
      description: "Returns an array of surgeries performed by the given surgeon",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgeries not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving surgeries.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.get(
  "/surgeries/surgeon/:surgeonId",
  validateRequest(z.object({ params: z.object({ surgeonId: commonValidations.id }) })),
  surgeryController.getSurgeriesBySurgeon,
);

/**
 * description: Get surgeons by surgery ID
 */
surgeryRegistry.registerPath({
  method: "get",
  summary: "Get surgeons by surgery ID",
  description: "Get surgeons by surgery ID",
  operationId: "getSurgeonsBySurgeryId",
  path: "/surgery/{surgeryId}/surgeons",
  tags: ["surgery"],
  request: {
    params: z.object({
      surgeryId: commonValidations.id,
    }),
  },
  responses: createApiResponses([
    {
      schema: z.array(UserNoPasswordSchema),
      description: "Returns an array of surgeons for the given surgery",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgery not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving surgeons for the surgery.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.get(
  "/surgery/:surgeryId/surgeons",
  validateRequest(
    z.object({
      params: z.object({
        surgeryId: commonValidations.id,
      }),
    }),
  ),
  surgeryController.getSurgeonsBySurgeryId,
);

/**
 * description: Get surgeries by date range
 */
surgeryRegistry.registerPath({
  method: "get",
  summary: "Get surgeries by date range",
  description: "Get surgeries by date range",
  operationId: "getSurgeriesByDateRange",
  path: "/surgeries/from/{startDate}/to/{endDate}",
  tags: ["surgery"],
  request: {
    params: z.object({
      startDate: z.date({ required_error: "startDate is required" }),
      endDate: z.date({ required_error: "endDate is required" }),
    }),
  },
  responses: createApiResponses([
    {
      schema: z.array(SurgeryWithUsersSchema),
      description: "Returns an array of surgeries within the given date range",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgeries not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving surgeries.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.get(
  "/surgeries/from/:startDate/to/:endDate",
  validateRequest(
    z.object({
      params: z.object({ startDate: dateSchema, endDate: dateSchema }),
    }),
  ),
  surgeryController.getSurgeriesByDateRange,
);

/**
 * description: Get surgeries by side
 */
surgeryRegistry.registerPath({
  method: "get",
  summary: "Get surgeries by side",
  description: "Get surgeries by side",
  operationId: "getSurgeriesBySide",
  path: "/surgeries/side/{side}",
  tags: ["surgery"],
  request: {
    params: z.object({
      side: z.enum(["left", "right", "none"]),
    }),
  },
  responses: createApiResponses([
    {
      schema: z.array(SurgeryWithUsersSchema),
      description: "Returns an array of surgeries on the given side",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgeries not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving surgeries.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.get(
  "/surgeries/side/:side",
  validateRequest(
    z.object({
      params: z.object({ side: z.enum(["left", "right", "none"]) }),
    }),
  ),
  surgeryController.getSurgeriesBySide,
);

/**
 * description: Get surgeries by therapy
 */
surgeryRegistry.registerPath({
  method: "get",
  summary: "Get surgeries by therapy",
  description: "Get surgeries by therapy",
  operationId: "getSurgeriesByTherapy",
  path: "/surgeries/therapy/{therapy}",
  tags: ["surgery"],
  request: { params: z.object({ therapy: z.string() }) },
  responses: createApiResponses([
    {
      schema: z.array(SurgeryWithUsersSchema),
      description: "Returns an array of surgeries with the given therapy",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Surgeries not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving surgeries.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});
surgeryRouter.get(
  "/surgeries/therapy/:therapy",
  validateRequest(z.object({ params: z.object({ therapy: z.string() }) })),
  surgeryController.getSurgeriesByTherapy,
);
