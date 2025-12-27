/**
 * @file User Department Router
 * @module api/userDepartment
 * @description Manages organizational departments/centers within the healthcare institution. Users and patient cases
 * are assigned to departments for data organization and access control. Supports department CRUD operations and
 * hierarchical clinic structures.
 */

import { AclMiddleware } from "@/common/middleware/globalAclMiddleware";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import {
  CreateUserDepartmentSchema,
  DeleteUserDepartmentSchema,
  GetUserDepartmentSchema,
  UpdateUserDepartmentSchema,
  UserDepartmentSchema,
} from "@/api/userDepartment/userDepartmentModel";
import { ValidationErrorsSchema } from "@/common/models/serviceResponse";
import { validateRequest } from "@/common/utils/httpHandlers";
import { userDepartmentController } from "./userDepartmentController";

// Initialize the OpenAPI registry
export const userDepartmentRegistry = new OpenAPIRegistry();

// Create an express router
export const userDepartmentRouter: Router = express.Router();

// Register schemas
userDepartmentRegistry.register("UserDepartment", UserDepartmentSchema);
userDepartmentRegistry.register("UserDepartmentArray", z.array(UserDepartmentSchema));

// GET all departments (admin only)
userDepartmentRegistry.registerPath({
  method: "get",
  path: "/userDepartment",
  tags: ["UserDepartment"],
  operationId: "getAllDepartments",
  description: "Get all user departments",
  summary: "Get all departments (admin only)",
  responses: createApiResponses([
    {
      schema: z.array(UserDepartmentSchema),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "No departments found",
      statusCode: 404,
    },
  ]),
});

userDepartmentRouter.get(
  "/",
  AclMiddleware("userDepartment-get-all"),
  userDepartmentController.getAllDepartments,
);

// GET user's own department (all authenticated users)
userDepartmentRegistry.registerPath({
  method: "get",
  path: "/userDepartment/my-department",
  tags: ["UserDepartment"],
  operationId: "getUserDepartment",
  description: "Get current user's department information",
  summary: "Get my department",
  responses: createApiResponses([
    {
      schema: UserDepartmentSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Department not found",
      statusCode: 404,
    },
  ]),
});

userDepartmentRouter.get(
  "/my-department",
  AclMiddleware("userDepartment-get-own"),
  userDepartmentController.getUserDepartment,
);

// GET department by ID (admin only)
userDepartmentRegistry.registerPath({
  method: "get",
  path: "/userDepartment/{id}",
  tags: ["UserDepartment"],
  operationId: "getDepartmentById",
  description: "Get a department by ID",
  summary: "Get department by ID (admin only)",
  request: {
    params: GetUserDepartmentSchema.shape.params,
  },
  responses: createApiResponses([
    {
      schema: UserDepartmentSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Department not found",
      statusCode: 404,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

userDepartmentRouter.get(
  "/:id",
  AclMiddleware("userDepartment-get-by-id"),
  validateRequest(GetUserDepartmentSchema),
  userDepartmentController.getDepartmentById,
);

// POST new department (admin only)
userDepartmentRegistry.registerPath({
  method: "post",
  path: "/userDepartment",
  tags: ["UserDepartment"],
  operationId: "createUserDepartment",
  description: "Create a new user department",
  summary: "Create department (admin only)",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateUserDepartmentSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: UserDepartmentSchema,
      description: "Department created",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Department with this name already exists",
      statusCode: 409,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

userDepartmentRouter.post(
  "/",
  AclMiddleware("userDepartment-create"),
  validateRequest(CreateUserDepartmentSchema),
  userDepartmentController.createUserDepartment,
);

// PUT update department by ID (admin only)
userDepartmentRegistry.registerPath({
  method: "put",
  path: "/userDepartment/{id}",
  tags: ["UserDepartment"],
  operationId: "updateDepartmentById",
  description: "Update a department by ID",
  summary: "Update department (admin only)",
  request: {
    params: UpdateUserDepartmentSchema.shape.params,
    body: {
      content: {
        "application/json": { schema: UpdateUserDepartmentSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: UserDepartmentSchema,
      description: "Department updated",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Department not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Department with this name already exists",
      statusCode: 409,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

userDepartmentRouter.put(
  "/:id",
  AclMiddleware("userDepartment-update"),
  validateRequest(UpdateUserDepartmentSchema),
  userDepartmentController.updateDepartmentById,
);

// DELETE department by ID (admin only)
userDepartmentRegistry.registerPath({
  method: "delete",
  path: "/userDepartment/{id}",
  tags: ["UserDepartment"],
  operationId: "deleteDepartmentById",
  description: "Delete a department by ID",
  summary: "Delete department (admin only)",
  request: {
    params: DeleteUserDepartmentSchema.shape.params,
  },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Department deleted",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Department not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Cannot delete department - users still assigned",
      statusCode: 409,
    },
    {
      schema: ValidationErrorsSchema,
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

userDepartmentRouter.delete(
  "/:id",
  AclMiddleware("userDepartment-delete"),
  validateRequest(DeleteUserDepartmentSchema),
  userDepartmentController.deleteDepartmentById,
);
