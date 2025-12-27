/**
 * @file Blueprint Router
 * @module api/blueprint
 * @description Manages blueprint templates for patient cases, consultations, and other entities. Blueprints define
 * structured workflows and data requirements (e.g., pre-op, post-op protocols) that can be applied when creating
 * new clinical records. Supports CRUD operations with pagination and filtering.
 */

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { ValidationErrorsSchema } from "@/common/models/serviceResponse";
import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { blueprintController } from "./blueprintController";
import {
  BlueprintListSchema,
  BlueprintSchema,
  CreateBlueprintRequestSchema,
  CreateBlueprintSchema,
  DeleteBlueprintSchema,
  GetBlueprintSchema,
  GetBlueprintsQuerySchema,
  SearchBlueprintsQuerySchema,
  UpdateBlueprintRequestSchema,
  UpdateBlueprintSchema,
} from "./blueprintModel";

export const blueprintRegistry = new OpenAPIRegistry();
export const blueprintRouter: Router = express.Router();

// Register schemas for OpenAPI
blueprintRegistry.register("Blueprint", BlueprintSchema);
blueprintRegistry.register("BlueprintList", BlueprintListSchema);
blueprintRegistry.register("CreateBlueprint", CreateBlueprintSchema);
blueprintRegistry.register("UpdateBlueprint", UpdateBlueprintSchema);

// GET /blueprints - Get all blueprints with pagination
blueprintRegistry.registerPath({
  method: "get",
  path: "/blueprints",
  tags: ["Blueprint"],
  operationId: "getBlueprints",
  summary: "Get all blueprints",
  description: "Retrieve a paginated list of all blueprints with optional filtering by blueprintFor type.",
  request: {
    query: GetBlueprintsQuerySchema.shape.query,
  },
  responses: createApiResponses([
    {
      schema: BlueprintListSchema,
      description: "Blueprints retrieved successfully",
      statusCode: 200,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving blueprints.",
      statusCode: 500,
    },
  ]),
});

blueprintRouter.get("/", validateRequest(GetBlueprintsQuerySchema), blueprintController.getBlueprints);

// GET /blueprints/search - Search blueprints
blueprintRegistry.registerPath({
  method: "get",
  path: "/blueprints/search",
  tags: ["Blueprint"],
  operationId: "searchBlueprints",
  summary: "Search blueprints",
  description: "Search blueprints by title, description, tags, and optionally filter by blueprintFor type.",
  request: {
    query: SearchBlueprintsQuerySchema.shape.query,
  },
  responses: createApiResponses([
    {
      schema: BlueprintListSchema,
      description: "Search results retrieved successfully",
      statusCode: 200,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while searching blueprints.",
      statusCode: 500,
    },
  ]),
});

blueprintRouter.get("/search", validateRequest(SearchBlueprintsQuerySchema), blueprintController.searchBlueprints);

// GET /blueprints/:id - Get blueprint by ID
blueprintRegistry.registerPath({
  method: "get",
  path: "/blueprints/{id}",
  tags: ["Blueprint"],
  operationId: "getBlueprintById",
  summary: "Get blueprint by ID",
  description: "Retrieve a specific blueprint by its unique identifier.",
  request: {
    params: GetBlueprintSchema.shape.params,
  },
  responses: createApiResponses([
    {
      schema: BlueprintSchema,
      description: "Blueprint retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Blueprint not found",
      statusCode: 404,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the blueprint.",
      statusCode: 500,
    },
  ]),
});

blueprintRouter.get("/:id", validateRequest(GetBlueprintSchema), blueprintController.getBlueprintById);

// POST /blueprints - Create new blueprint
blueprintRegistry.registerPath({
  method: "post",
  path: "/blueprints",
  tags: ["Blueprint"],
  operationId: "createBlueprint",
  summary: "Create a new blueprint",
  description: "Create a new blueprint template for cases, consultations, or surgeries.",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateBlueprintSchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: BlueprintSchema,
      description: "Blueprint created successfully",
      statusCode: 201,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "User authentication required",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the blueprint.",
      statusCode: 500,
    },
  ]),
});

blueprintRouter.post("/", validateRequest(CreateBlueprintRequestSchema), blueprintController.createBlueprint);

// PUT /blueprints/:id - Update blueprint
blueprintRegistry.registerPath({
  method: "put",
  path: "/blueprints/{id}",
  tags: ["Blueprint"],
  operationId: "updateBlueprint",
  summary: "Update an existing blueprint",
  description: "Update an existing blueprint by its unique identifier.",
  request: {
    params: UpdateBlueprintRequestSchema.shape.params,
    body: {
      content: {
        "application/json": { schema: UpdateBlueprintSchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: BlueprintSchema,
      description: "Blueprint updated successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Blueprint not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "User authentication required",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating the blueprint.",
      statusCode: 500,
    },
  ]),
});

blueprintRouter.put("/:id", validateRequest(UpdateBlueprintRequestSchema), blueprintController.updateBlueprint);

// DELETE /blueprints/:id - Delete blueprint
blueprintRegistry.registerPath({
  method: "delete",
  path: "/blueprints/{id}",
  tags: ["Blueprint"],
  operationId: "deleteBlueprint",
  summary: "Delete a blueprint",
  description: "Delete an existing blueprint by its unique identifier.",
  request: {
    params: DeleteBlueprintSchema.shape.params,
  },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Blueprint deleted successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Blueprint not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while deleting the blueprint.",
      statusCode: 500,
    },
  ]),
});

blueprintRouter.delete("/:id", validateRequest(DeleteBlueprintSchema), blueprintController.deleteBlueprint);

export default blueprintRouter;
