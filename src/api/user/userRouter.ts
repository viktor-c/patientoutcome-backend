import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { GetUserSchema, UserNoPasswordSchema, UserSchema } from "@/api/user/userModel";
import { validateRequest } from "@/common/utils/httpHandlers";
import { userController } from "./userController";

// initialize the openapi registry
export const userRegistry = new OpenAPIRegistry();
// create an express router
export const userRouter: Router = express.Router();

/* Define schemas and paths to create openapi */
userRegistry.register("User", UserSchema);
userRegistry.register("UserNoPassword", UserNoPasswordSchema);

// register the path get /users
userRegistry.registerPath({
  method: "get",
  path: "/users",
  tags: ["User"],
  responses: createApiResponse(z.array(UserSchema), "Success"),
});

// add this path with the function getUsers from userController
userRouter.get("/", userController.getUsers);

// register another path, get /users/{id}
userRegistry.registerPath({
  method: "get",
  path: "/users/{id}",
  tags: ["User"],
  request: { params: GetUserSchema.shape.params },
  responses: createApiResponse(UserSchema, "Success"),
});

userRouter.get("/:id", validateRequest(GetUserSchema), userController.getUser);
