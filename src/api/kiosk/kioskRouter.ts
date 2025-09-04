import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { AclMiddleware } from "@/common/middleware/globalAclMiddleware";
import { validateRequest } from "@/common/utils/httpHandlers";
import { ConsultationSchema } from "../consultation/consultationModel";
import { kioskController } from "./kioskController";
import {
  DeleteKioskSchema,
  GetKioskSchema,
  KioskSchema,
  SetConsultationSchema,
  UpdateConsultationStatusSchema,
} from "./kioskModel";

export const kioskRegistry = new OpenAPIRegistry();
export const kioskRouter: Router = express.Router();

/* Define schemas and paths to create openapi */
kioskRegistry.register("Kiosk", KioskSchema);

// Register the path for getting the current active consultation for the logged-in kiosk user
kioskRegistry.registerPath({
  method: "get",
  path: "/kiosk/consultation",
  tags: ["Kiosk"],
  operationId: "getConsultation",
  summary: "Get current active consultation for kiosk user",
  description:
    "Returns the current active consultation for the logged-in kiosk user. Only accessible by users with 'kiosk' role.",
  responses: createApiResponses([
    {
      schema: ConsultationSchema,
      description: "Consultation retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "No active consultation found for kiosk user",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Unauthorized: User must have 'kiosk' role",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving consultation",
      statusCode: 500,
    },
  ]),
});

kioskRouter.get("/consultation", AclMiddleware("kiosk:get"), kioskController.getConsultation);

// Register the path for updating consultation status for the logged-in kiosk user
kioskRegistry.registerPath({
  method: "put",
  path: "/kiosk/consultation/status",
  tags: ["Kiosk"],
  operationId: "updateConsultationStatus",
  summary: "Update consultation status for kiosk user",
  description:
    "Updates the consultation status for the current logged-in kiosk user. Only accessible by users with 'kiosk' role.",
  request: {
    body: {
      content: {
        "application/json": { schema: UpdateConsultationStatusSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: ConsultationSchema,
      description: "Consultation status updated successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "No active consultation found for kiosk user",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Unauthorized: User must have 'kiosk' role",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while updating consultation status",
      statusCode: 500,
    },
  ]),
});

kioskRouter.put(
  "/consultation/status",
  AclMiddleware("kiosk:put"),
  validateRequest(UpdateConsultationStatusSchema),
  kioskController.updateConsultationStatus,
);

// Register the path for getting consultation for a specific kiosk user (admin/mfa access)
kioskRegistry.registerPath({
  method: "get",
  path: "/kiosk/{kioskUserId}/consultation",
  tags: ["Kiosk"],
  operationId: "getConsultationFor",
  summary: "Get consultation for specific kiosk user",
  description:
    "Returns the active consultation for the specified kiosk user. Only accessible by users with at least 'mfa' role.",
  request: { params: GetKioskSchema.shape.params },
  responses: createApiResponses([
    {
      schema: ConsultationSchema,
      description: "Consultation retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "No kiosk found for the specified user",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Unauthorized: User must have at least 'mfa' role",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving consultation",
      statusCode: 500,
    },
  ]),
});

kioskRouter.get(
  "/:kioskUserId/consultation",
  AclMiddleware("kiosk:get-for"),
  validateRequest(GetKioskSchema),
  kioskController.getConsultationFor,
);

// Register the path for deleting/unlinking consultation for a specific kiosk user (admin/mfa access)
kioskRegistry.registerPath({
  method: "delete",
  path: "/kiosk/{kioskUserId}/consultation",
  tags: ["Kiosk"],
  operationId: "deleteConsultationFor",
  summary: "Unlink consultation for specific kiosk user",
  description:
    "Unlinks the consultation for the specified kiosk user. This does not delete the consultation itself, only the kiosk mapping. Only accessible by users with at least 'mfa' role.",
  request: { params: DeleteKioskSchema.shape.params },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Consultation unlinked successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "No kiosk found for the specified user",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Unauthorized: User must have at least 'mfa' role",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while unlinking consultation",
      statusCode: 500,
    },
  ]),
});

kioskRouter.delete(
  "/:kioskUserId/consultation",
  AclMiddleware("kiosk:delete-for"),
  validateRequest(DeleteKioskSchema),
  kioskController.deleteConsultationFor,
);

// Register the path for setting consultation for a specific kiosk user (admin/mfa access)
kioskRegistry.registerPath({
  method: "post",
  path: "/kiosk/{kioskUserId}/consultation/{consultationId}",
  tags: ["Kiosk"],
  operationId: "setConsultation",
  summary: "Set consultation for specific kiosk user",
  description:
    "Creates or updates a kiosk entry linking the specified user to a consultation. Only accessible by users with at least 'mfa' role.",
  request: { params: SetConsultationSchema.shape.params },
  responses: createApiResponses([
    {
      schema: KioskSchema,
      description: "Kiosk consultation set successfully",
      statusCode: 201,
    },
    {
      schema: KioskSchema,
      description: "Kiosk consultation updated successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Consultation not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Unauthorized: User must have at least 'mfa' role",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while setting consultation",
      statusCode: 500,
    },
  ]),
});

kioskRouter.post(
  "/:kioskUserId/consultation/:consultationId",
  AclMiddleware("kiosk:set-consultation"),
  validateRequest(SetConsultationSchema),
  kioskController.setConsultation,
);

export default kioskRouter;
