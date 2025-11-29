import { AclMiddleware } from "@/common/middleware/globalAclMiddleware";
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
  roles: z.array(z.string()),
  postopWeek: z.number().int().min(1).optional(),
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

userRouter.post("/login", AclMiddleware("user-login"), validateRequest(LoginSchema), userController.loginUser);

// Kiosk Login Schema
const KioskLoginSchema = z.object({
  body: z.object({
    username: z.string().startsWith("kiosk"),
  }),
});

// Register the path for kiosk login
userRegistry.registerPath({
  method: "post",
  path: "/user/kiosk-login",
  tags: ["User"],
  operationId: "kioskLoginUser",
  description: "Passwordless login for kiosk users - automatically creates consultation",
  summary: "Kiosk login (passwordless)",
  request: {
    body: {
      content: {
        "application/json": { schema: KioskLoginSchema.shape.body },
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
      description: "Invalid username",
      statusCode: 400,
    },
  ]),
});

userRouter.post("/kiosk-login", AclMiddleware("user-login"), validateRequest(KioskLoginSchema), userController.kioskLoginUser);

// Role Switch Schema
const RoleSwitchSchema = z.object({
  body: z.object({
    username: z.string(),
  }),
});

// Register the path for role switching
userRegistry.registerPath({
  method: "post",
  path: "/user/role-switch",
  tags: ["User"],
  operationId: "roleSwitchUser",
  description: "Passwordless role switching for kiosk and doctor users",
  summary: "Switch user role (passwordless)",
  request: {
    body: {
      content: {
        "application/json": { schema: RoleSwitchSchema.shape.body },
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
      description: "User not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Forbidden - Role switching not allowed for this user type",
      statusCode: 403,
    },
  ]),
});

userRouter.post("/role-switch", AclMiddleware("user-login"), validateRequest(RoleSwitchSchema), userController.roleSwitchUser);

// Register the path for logout
userRegistry.registerPath({
  method: "get",
  path: "/user/logout",
  tags: ["User"],
  operationId: "logoutUser",
  description: "Logout a user",
  summary: "Logout a user",
  request: {},
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

userRouter.get("/logout", AclMiddleware("user-logout"), userController.logoutUser);

// register the path get /user
userRegistry.registerPath({
  method: "get",
  path: "/user",
  tags: ["User"],
  operationId: "getUsers",
  description:
    "Get users from the same department. If user has admin role, get all users. Optional role query parameter to filter by role.",
  summary: "Get users by department and role",
  request: {
    query: z.object({
      role: z.string().optional(),
    }),
  },
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
    {
      schema: z.object({ message: z.string() }),
      description: "Authentication required - No active session",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied - Insufficient permissions",
      statusCode: 403,
    },
  ]),
});

// Define schema for get users query validation
const GetUsersSchema = z.object({
  query: z.object({
    role: z.string().optional(),
  }),
});

// add this path with the function getUsers from userController
userRouter.get("/", AclMiddleware(), validateRequest(GetUsersSchema), userController.getUsers);

// register the path get /user/kiosk-users
userRegistry.registerPath({
  method: "get",
  path: "/user/kiosk-users",
  tags: ["User"],
  operationId: "getAllKioskUsers",
  description: "Get all users with kiosk role",
  summary: "Get all kiosk users",
  responses: createApiResponses([
    {
      schema: z.array(UserNoPasswordSchema),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "No Kiosk users found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving kiosk users.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Authentication required - No active session",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied - Insufficient permissions",
      statusCode: 403,
    },
  ]),
});

// add this path with the function getAllKioskUsers from userController
userRouter.get("/kiosk-users", AclMiddleware("user:get-kiosk"), userController.getAllKioskUsers);

// register the path get /user/kiosk-users/available
userRegistry.registerPath({
  method: "get",
  path: "/user/kiosk-users/available",
  tags: ["User"],
  operationId: "getAvailableKioskUsers",
  description: "Get all users with kiosk role that don't have an active consultation assigned",
  summary: "Get available kiosk users",
  responses: createApiResponses([
    {
      schema: z.array(UserNoPasswordSchema),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "No available Kiosk users found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving available kiosk users.",
      statusCode: 500,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Authentication required - No active session",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied - Insufficient permissions",
      statusCode: 403,
    },
  ]),
});

// add this path with the function getAvailableKioskUsers from userController
userRouter.get("/kiosk-users/available", AclMiddleware("user:get-kiosk"), userController.getAvailableKioskUsers);

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

userRouter.get("/:id", AclMiddleware("user:get"), validateRequest(GetUserSchema), userController.getUser);

//************************************** */
// Register the path for creating a user
// userRegistry.registerPath({
//   method: "post",
//   path: "/user",
//   tags: ["User"],
//   operationId: "createUser",
//   description: "Create a new user",
//   summary: "Create a new user",
//   request: {
//     body: {
//       content: {
//         "application/json": { schema: CreateUserSchema },
//       },
//     },
//   },
//   responses: createApiResponses([
//     {
//       schema: UserSchema,
//       description: "Success",
//       statusCode: 200,
//     },
//     {
//       schema: z.object({ message: z.string() }),
//       description: "An error occurred while creating the user.",
//       statusCode: 500,
//     },
//     {
//       schema: z.object({ message: z.string() }),
//       description: "Validation error",
//       statusCode: 400,
//     },
//   ]),
// });

// userRouter.post("/", validateRequestOnlyWithBody(CreateUserSchema), userController.createUser);

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

userRouter.put("/update", AclMiddleware(), validateRequestOnlyWithBody(UpdateUserSchema), userController.updateUser);

// Register the path for updating a user
userRegistry.registerPath({
  method: "delete",
  path: "/user/username/{username}",
  tags: ["User"],
  operationId: "deleteUser",
  description: "Delete a user",
  summary: "Delete a user",
  request: { params: z.object({ username: z.string() }) },
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

userRouter.delete(
  "/username/:username",
  AclMiddleware("user:delete"),
  validateRequest(z.object({ params: z.object({ username: z.string() }) })),
  userController.deleteUser,
);

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

userRouter.post(
  "/register",
  AclMiddleware(),
  validateRequestOnlyWithBody(userRegistrationZod),
  userController.registerUser,
);

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
      description: "Authentication required - Not logged in",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied - Insufficient permissions",
      statusCode: 403,
    },
  ]),
});

userRouter.put(
  "/change-password",
  AclMiddleware(),
  validateRequest(ChangePasswordSchema),
  userController.changePassword,
);
