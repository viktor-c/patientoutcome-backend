import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { Router } from "express";
import { z } from "zod";
import { codeController } from "./codeController";
import { ActivateCodeSchema, CodeSchema, CreateCodeSchema, DeleteCodeSchema, GetCodeSchema } from "./codeModel";

// Initialize OpenAPI registry
export const codeRegistry = new OpenAPIRegistry();
export const formAccessCodeRouter: Router = Router();

// Register the Code schema
codeRegistry.register("Code", CodeSchema);

// Route to find all codes
codeRegistry.registerPath({
  method: "get",
  path: "/form-access-code",
  tags: ["Code"],
  operationId: "findAllCodes",
  summary: "Retrieve all codes",
  description: "Retrieve all codes from the database.",
  responses: createApiResponses([
    { schema: z.array(CodeSchema), description: "Codes retrieved successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "An error occurred", statusCode: 500 },
  ]),
});
formAccessCodeRouter.get("/", codeController.findAllCodes.bind(codeController));

// Route to find all available codes
codeRegistry.registerPath({
  method: "get",
  path: "/form-access-code/all-available-codes",
  tags: ["Code"],
  operationId: "getAllAvailableCodes",
  summary: "Get all available codes",
  description: "Retrieve all available (non-activated) codes from the database.",
  responses: createApiResponses([
    { schema: z.array(CodeSchema), description: "Available codes retrieved successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "An error occurred", statusCode: 500 },
  ]),
});
formAccessCodeRouter.get("/all-available-codes", codeController.getAllAvailableCodes);

// Route to activate a code
codeRegistry.registerPath({
  method: "put",
  path: "/form-access-code/activate/{internalCode}/consultation/{consultationId}",
  tags: ["Code"],
  operationId: "activateCode",
  summary: "Activate a code",
  description: "Activate a code by its internal code.",
  request: { params: ActivateCodeSchema },
  responses: createApiResponses([
    { schema: CodeSchema, description: "Code activated successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "Code not found", statusCode: 404 },
    { schema: z.object({ message: z.string() }), description: "Consultation not found", statusCode: 404 },
    { schema: z.object({ message: z.string() }), description: "Validation error", statusCode: 400 },
    { schema: z.object({ message: z.string() }), description: "Internal server error", statusCode: 500 },
    { schema: z.object({ message: z.string() }), description: "Code already activated", statusCode: 409 },
  ]),
});
formAccessCodeRouter.put(
  "/activate/:internalCode/consultation/:consultationId",
  validateRequest(ActivateCodeSchema),
  codeController.activateCode,
);

// Route to deactivate a code
codeRegistry.registerPath({
  method: "put",
  path: "/form-access-code/deactivate/{internalCode}",
  tags: ["Code"],
  operationId: "deactivateCode",
  summary: "Deactivate a code",
  description: "Deactivate a code by its internal code.",
  request: { params: z.object({ internalCode: z.string() }) },
  responses: createApiResponses([
    { schema: CodeSchema, description: "Code deactivated successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "Code not found", statusCode: 404 },
    { schema: z.object({ message: z.string() }), description: "Validation error", statusCode: 400 },
    { schema: z.object({ message: z.string() }), description: "Internal server error", statusCode: 500 },
  ]),
});
formAccessCodeRouter.put("/deactivate/:internalCode", validateRequest(GetCodeSchema), codeController.deactivateCode);

// Route to add a new code
codeRegistry.registerPath({
  method: "post",
  path: "/form-access-code",
  tags: ["Code"],
  operationId: "addCode",
  summary: "Add a new code",
  description: "Create a new code in the system.",
  request: { params: CreateCodeSchema.shape.params },
  responses: createApiResponses([
    { schema: CodeSchema, description: "Code created successfully", statusCode: 201 },
    { schema: z.object({ message: z.string() }), description: "Validation error", statusCode: 400 },
  ]),
});
formAccessCodeRouter.post("/", validateRequest(CreateCodeSchema), codeController.addCode);

// Route to delete a code by code, can be external or internal code
codeRegistry.registerPath({
  method: "delete",
  path: "/form-access-code/{code}",
  tags: ["Code"],
  operationId: "deleteCode",
  summary: "Delete a code",
  description: "Delete a code by its external code.",
  request: { params: DeleteCodeSchema },
  responses: createApiResponses([
    { schema: z.object({ message: z.string() }), description: "Code deleted successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "Code not found", statusCode: 404 },
  ]),
});
formAccessCodeRouter.delete("/:code", validateRequest(DeleteCodeSchema), codeController.deleteCode);

// Route to get a code by internalCode
codeRegistry.registerPath({
  method: "get",
  path: "/form-access-code/{internalCode}",
  tags: ["Code"],
  operationId: "getCodeById",
  summary: "Get a code by internalCode",
  description: "Retrieve a code by its internal UUID.",
  request: { params: GetCodeSchema.shape.params },
  responses: createApiResponses([
    { schema: CodeSchema, description: "Code retrieved successfully", statusCode: 200 },
    { schema: z.object({ message: z.string() }), description: "Code not found", statusCode: 404 },
  ]),
});
formAccessCodeRouter.get("/:internalCode", validateRequest(GetCodeSchema), codeController.getCodeById);

export default formAccessCodeRouter;
