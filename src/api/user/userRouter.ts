import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import {
  ChangePasswordSchema,
  CreateUserSchema,
  GetUserSchema,
  UpdateUserSchema,
  UserNoPasswordSchema,
  UserSchema,
} from "@/api/user/userModel";
import { validateRequest, validateRequestOnlyWithBody } from "@/common/utils/httpHandlers";
import { userController } from "./userController";
import { userRegistrationZod } from "./userRegistrationSchemas";

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
userRegistry.register("ChangePassword", ChangePasswordSchema);
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

userRouter.post("/", validateRequest(CreateUserSchema), userController.createUser);

//************************************** */
// Register the path for updating a user
userRegistry.registerPath({
  method: "put",
  path: "/user/update", // changed path, no id param
  tags: ["User"],
  operationId: "updateUser",
  description: "Update a user",
  summary: "Update a user",
  request: {
    body: {
      content: {
        "application/json": { schema: UpdateUserSchema },
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

userRouter.put("/update", validateRequestOnlyWithBody(UpdateUserSchema), userController.updateUser);

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

// Login and Logout functionality
const LoginSchema = z.object({
  body: z.object({
    username: z.string(),
    password: z.string(),
  }),
});

const LoginResponseSchema = z.object({
  sessionId: z.string(),
  username: z.string(),
  department: z.string(),
  belongsToCenter: z.array(z.string()),
  email: z.string().email().optional(),
});

const LogoutSchema = z.object({
  body: z.object({
    sessionId: z.string(),
  }),
});

// Register the path for login
userRegistry.registerPath({
  method: "post",
  path: "/user/login",
  tags: ["User"],
  operationId: "loginUser",
  description: "Login a user",
  summary: "Login a user",
  request: {
    body: {
      content: {
        "application/json": { schema: LoginSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: LoginResponseSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Invalid username or password",
      statusCode: 401,
    },
  ]),
});

userRouter.post("/login", validateRequest(LoginSchema), userController.loginUser);

// Register the path for logout
userRegistry.registerPath({
  method: "post",
  path: "/user/logout",
  tags: ["User"],
  operationId: "logoutUser",
  description: "Logout a user",
  summary: "Logout a user",
  request: {
    body: {
      content: {
        "application/json": { schema: LogoutSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Invalid session",
      statusCode: 401,
    },
  ]),
});

userRouter.post("/logout", validateRequest(LogoutSchema), userController.logoutUser);

// Register the path for user registration
userRegistry.registerPath({
  method: "post",
  path: "/user/register",
  tags: ["User"],
  operationId: "registerUser",
  description: "Register a new user with a registration code.",
  summary: "Register new user",
  request: {
    body: {
      content: {
        "application/json": { schema: userRegistrationZod },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: UserNoPasswordSchema,
      description: "User registered successfully",
      statusCode: 201,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation or registration error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Conflict (username/email exists)",
      statusCode: 409,
    },
  ]),
});

userRouter.post("/register", validateRequestOnlyWithBody(userRegistrationZod), userController.registerUser);

// Register the path for changing password
userRegistry.registerPath({
  method: "put",
  path: "/user/change-password",
  tags: ["User"],
  operationId: "changeUserPassword",
  description: "Change the password for a user. User must be logged in and match the userId.",
  summary: "Change user password",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ChangePasswordSchema.shape.body,
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Password changed successfully.",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Error changing password.",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Unauthorized.",
      statusCode: 401,
    },
  ]),
});

userRouter.put("/change-password", validateRequest(ChangePasswordSchema), userController.changePassword);
