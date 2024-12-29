import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import {
  CreateUserSchema,
  GetUserSchema,
  UpdateUserSchema,
  UserNoPasswordSchema,
  UserSchema,
} from "@/api/user/userModel";
import { validateRequest } from "@/common/utils/httpHandlers";
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
  responses: createApiResponse(z.array(UserSchema), "Success"),
});

// add this path with the function getUsers from userController
userRouter.get("/", userController.getUsers);

//************************************** */
// register another path, get /user/{id}
userRegistry.registerPath({
  method: "get",
  path: "/user/{id}",
  tags: ["User"],
  request: { params: GetUserSchema.shape.params },
  responses: createApiResponse(UserSchema, "Success"),
});

userRouter.get("/:id", validateRequest(GetUserSchema), userController.getUser);

//************************************** */
// Register the path for creating a user
userRegistry.registerPath({
  method: "post",
  path: "/user",
  tags: ["User"],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateUserSchema.shape.body },
      },
    },
  },
  responses: createApiResponse(UserSchema, "Success"),
});

userRouter.post("/", validateRequest(CreateUserSchema), userController.createUser);

//************************************** */
// Register the path for updating a user
userRegistry.registerPath({
  method: "put",
  path: "/user/{id}",
  tags: ["User"],
  request: {
    params: UpdateUserSchema.shape.params,
    body: {
      content: {
        "application/json": { schema: UpdateUserSchema.shape.body },
      },
    },
  },
  responses: createApiResponse(UserSchema, "Success"),
});

userRouter.put("/:id", validateRequest(UpdateUserSchema), userController.updateUser);

// Register the path for updating a user
userRegistry.registerPath({
  method: "delete",
  path: "/user/{id}",
  tags: ["User"],
  request: { params: GetUserSchema.shape.params },
  responses: createApiResponse(UserSchema, "Success"),
});

userRouter.delete("/:id", validateRequest(GetUserSchema), userController.deleteUser);
