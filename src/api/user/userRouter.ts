import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import {
  CreateUserSchema,
  GetUserSchema,
  UpdateUserSchema,
  UserNoPasswordSchema,
  UserSchema,
} from "@/api/user/userModel";
import { validateRequest, validateRequestOnlyWithBody } from "@/common/utils/httpHandlers";
import { userController } from "./userController";

// initialize the openapi registry
export const userRegistry = new OpenAPIRegistry();
// create an express router
export const userRouter: Router = express.Router();

/* Define schemas and paths to create openapi */
userRegistry.register("User", UserSchema);
userRegistry.register("UserNoPassword", UserNoPasswordSchema);
userRegistry.register("CreateUser", CreateUserSchema);
userRegistry.register("GetUser", GetUserSchema);
userRegistry.register("UpdateUser", UpdateUserSchema);
userRegistry.register("UserArray", z.array(UserSchema));
userRegistry.register("UserNoPasswordArray", z.array(UserNoPasswordSchema));

//************************************** */
// register the path get /user
userRegistry.registerPath({
  method: "get",
  path: "/user",
  tags: ["User"],
  operationId: "getUsers",
  description: "Get all users",
  summary: "Get all users",
  responses: createApiResponses([
    {
      schema: z.array(UserSchema),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving users.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

// add this path with the function getUsers from userController
userRouter.get("/", userController.getUsers);

//************************************** */
// register another path, get /user/{id}
userRegistry.registerPath({
  method: "get",
  path: "/user/{id}",
  tags: ["User"],
  operationId: "getUserById",
  description: "Get a user by ID",
  summary: "Get a user by ID",
  request: { params: GetUserSchema.shape.params },
  responses: createApiResponses([
    {
      schema: UserSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving the user.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

userRouter.get("/:id", validateRequest(GetUserSchema), userController.getUser);

//************************************** */
// Register the path for creating a user
userRegistry.registerPath({
  method: "post",
  path: "/user",
  tags: ["User"],
  operationId: "createUser",
  description: "Create a new user",
  summary: "Create a new user",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateUserSchema },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: UserSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while creating the user.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

userRouter.post("/", validateRequestOnlyWithBody(CreateUserSchema), userController.createUser);

//************************************** */
// Register the path for updating a user
userRegistry.registerPath({
  method: "put",
  path: "/user/{id}",
  tags: ["User"],
  operationId: "updateUser",
  description: "Update a user",
  summary: "Update a user",
  request: {
    params: UpdateUserSchema.shape.params,
    body: {
      content: {
        "application/json": { schema: UpdateUserSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: UserSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "User not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating the user.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

userRouter.put("/:id", validateRequest(UpdateUserSchema), userController.updateUser);

// Register the path for updating a user
userRegistry.registerPath({
  method: "delete",
  path: "/user/{id}",
  tags: ["User"],
  operationId: "deleteUser",
  description: "Delete a user",
  summary: "Delete a user",
  request: { params: GetUserSchema.shape.params },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "User not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while deleting the user.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
  ]),
});

userRouter.delete("/:id", validateRequest(GetUserSchema), userController.deleteUser);
