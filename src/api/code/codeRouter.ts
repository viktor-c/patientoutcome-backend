import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { commonValidations } from "@/common/utils/commonValidation";
import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { Router } from "express";
import { z } from "zod";
import { ConsultationWithFormsSchema } from "../consultation/consultationModel";
import { codeController } from "./codeController";
import {
  ActivateCodeSchema,
  CodeSchema,
  CreateCodeSchema,
  DeleteCodeSchema,
  ExternalCodeSchema,
  GetCodeSchema,
} from "./codeModel";

// Initialize OpenAPI registry
export const codeRegistry = new OpenAPIRegistry();
export const formAccessCodeRouter: Router = Router();

// Create the Code schema with populated consultation for OpenAPI (used by findAllCodes)
const CodeWithConsultationSchema = CodeSchema.extend({
  consultationId: ConsultationWithFormsSchema.optional(),
});

// Create the Code response schema for activate/deactivate operations
// These operations return a Code WITHOUT _id and with consultationId as a string (not populated)
const CodeResponseSchema = CodeSchema.omit({ _id: true }).extend({
  consultationId: z.string().optional(),
});

// Register the Code schema
codeRegistry.register("Code", CodeSchema);
codeRegistry.register("CodeWithConsultation", CodeWithConsultationSchema);
codeRegistry.register("CodeResponse", CodeResponseSchema);

// Route to find all codes
codeRegistry.registerPath({
  method: "get",
  path: "/form-access-code/all",
  tags: ["Code"],
  operationId: "findAllCodes",
  summary: "Retrieve all codes",
  description: "Retrieve all codes from the database.",
  responses: createApiResponses([
    { schema: z.array(CodeWithConsultationSchema), description: "Codes retrieved successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "An error occurred", statusCode: 500 },
  ]),
});
formAccessCodeRouter.get("/all", codeController.findAllCodes.bind(codeController));

// Route to find all available codes
codeRegistry.registerPath({
  method: "get",
  path: "/form-access-code/all-available",
  tags: ["Code"],
  operationId: "getAllAvailableCodes",
  summary: "Get all available codes",
  description: "Retrieve all available (non-activated) codes from the database.",
  responses: createApiResponses([
    {
      schema: z.array(CodeWithConsultationSchema),
      description: "Available codes retrieved successfully",
      statusCode: 200,
    },
    { schema: z.object({ message: z.string() }), description: "An error occurred", statusCode: 500 },
  ]),
});
formAccessCodeRouter.get("/all-available", codeController.getAllAvailableCodes);

// Route to activate a code by its code and link it to a consultation id
codeRegistry.registerPath({
  method: "put",
  path: "/form-access-code/activate/{code}/consultation/{consultationId}",
  tags: ["Code"],
  operationId: "activateCode",
  summary: "Activate a code",
  description: "Activate a code by its code.",
  request: { params: ActivateCodeSchema.shape.params },
  responses: createApiResponses([
    { schema: CodeResponseSchema, description: "Code activated successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "Code not found", statusCode: 404 },
    { schema: z.object({ message: z.string() }), description: "Consultation not found", statusCode: 404 },
    { schema: z.object({ message: z.string() }), description: "Validation error", statusCode: 400 },
    { schema: z.object({ message: z.string() }), description: "Internal server error", statusCode: 500 },
    { schema: z.object({ message: z.string() }), description: "Code already activated", statusCode: 409 },
  ]),
});
formAccessCodeRouter.put(
  "/activate/:code/consultation/:consultationId",
  validateRequest(ActivateCodeSchema),
  codeController.activateCode,
);

// Route to deactivate a code
codeRegistry.registerPath({
  method: "put",
  path: "/form-access-code/deactivate/{code}",
  tags: ["Code"],
  operationId: "deactivateCode",
  summary: "Deactivate a code",
  description: "Deactivate a code by its code.",
  request: { params: GetCodeSchema.shape.params },
  responses: createApiResponses([
    { schema: CodeResponseSchema, description: "Code deactivated successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "Code not found", statusCode: 404 },
    { schema: z.object({ message: z.string() }), description: "Validation error", statusCode: 400 },
    { schema: z.object({ message: z.string() }), description: "Internal server error", statusCode: 500 },
  ]),
});
formAccessCodeRouter.put("/deactivate/:code", validateRequest(GetCodeSchema), codeController.deactivateCode);

// Route to add new codes
codeRegistry.registerPath({
  method: "post",
  path: "/form-access-code/addCodes/{numberOfCodes}",
  tags: ["Code"],
  operationId: "addCodes",
  summary: "Get new form access codes",
  description: "The backend creates a number of new codes and returns them",
  request: { params: CreateCodeSchema.shape.params },
  responses: createApiResponses([
    { schema: z.array(CodeWithConsultationSchema), description: "Code created successfully", statusCode: 201 },
    { schema: z.object({ message: z.string() }), description: "Validation error", statusCode: 400 },
  ]),
});
formAccessCodeRouter.post("/addCodes/:numberOfCodes", validateRequest(CreateCodeSchema), codeController.addCodes);

// Route to delete a code by code, can be code or internal code
codeRegistry.registerPath({
  method: "delete",
  path: "/form-access-code/{code}",
  tags: ["Code"],
  operationId: "deleteCode",
  summary: "Delete a code",
  description: "Delete a code by its code.",
  request: { params: DeleteCodeSchema },
  responses: createApiResponses([
    { schema: z.object({ message: z.string() }), description: "Code deleted successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "Code not found", statusCode: 404 },
  ]),
});
formAccessCodeRouter.delete(
  "/:code",
  validateRequest(z.object({ params: DeleteCodeSchema })),
  codeController.deleteCode,
);

// Route to check if code is valid
codeRegistry.registerPath({
  method: "get",
  path: "/form-access-code/validate/{code}",
  tags: ["Code"],
  operationId: "isValidCode",
  summary: "Check if code is valid",
  description: "Check if a code is valid and not already used.",
  request: { params: ExternalCodeSchema.shape.params },
  responses: createApiResponses([
    { schema: z.object({ message: z.string() }), description: "Code is valid", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "Code invalid", statusCode: 404 },
    { schema: z.object({ message: z.string() }), description: "Code not found", statusCode: 400 },
    { schema: z.object({ message: z.string() }), description: "Internal server error", statusCode: 500 },
  ]),
});
formAccessCodeRouter.get("/validate/:code", validateRequest(ExternalCodeSchema), codeController.validateCode);

// Route to get a code by code
codeRegistry.registerPath({
  method: "get",
  path: "/form-access-code/{code}",
  tags: ["Code"],
  operationId: "getCode",
  summary: "Get detail for the given code",
  description: "Retrieve details for a code",
  request: { params: GetCodeSchema.shape.params },
  responses: createApiResponses([
    { schema: CodeWithConsultationSchema, description: "Code retrieved successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "Code not found", statusCode: 404 },
  ]),
});
formAccessCodeRouter.get("/:code", validateRequest(GetCodeSchema), codeController.getCode);

// Route to get a code by internalCode, which is the id
codeRegistry.registerPath({
  method: "get",
  path: "/form-access-code/byId/{id}",
  tags: ["Code"],
  operationId: "getCodeByInternalCode",
  summary: "Get a code by internalCode",
  description: "Retrieve a code by its internal code, same as the id of the code.",
  request: { params: z.object({ id: commonValidations.id }) },
  responses: createApiResponses([
    { schema: CodeWithConsultationSchema, description: "Code retrieved successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "Code not found", statusCode: 404 },
  ]),
});
formAccessCodeRouter.get(
  "/byId/:id",
  validateRequest(z.object({ params: z.object({ id: commonValidations.id }) })),
  codeController.getCodeById,
);

export default formAccessCodeRouter;
