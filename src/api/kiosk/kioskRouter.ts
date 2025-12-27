/**
 * @file Kiosk Router
 * @module api/kiosk
 * @description Manages kiosk user accounts and consultation assignments. Kiosks are special user accounts for patient
 * self-service stations where patients can complete forms in clinical settings. Handles kiosk creation, deletion,
 * consultation assignment, and status updates.
 */

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { AclMiddleware } from "@/common/middleware/globalAclMiddleware";
import { ValidationErrorsSchema } from "@/common/models/serviceResponse";
import { validateRequest } from "@/common/utils/httpHandlers";
import { zId } from "@zodyac/zod-mongoose";
import { ConsultationWithFormsSchema } from "../consultation/consultationModel";
import { UserNoPasswordSchema } from "../user/userModel";
import { kioskController } from "./kioskController";

export const kioskRegistry = new OpenAPIRegistry();
export const kioskRouter: Router = express.Router();

// Define validation schemas for kiosk routes
const GetKioskSchema = z.object({
  params: z.object({
    kioskUserId: zId("User"),
  }),
});

const DeleteKioskSchema = z.object({
  params: z.object({
    kioskUserId: zId("User"),
  }),
});

const UpdateConsultationStatusSchema = z.object({
  body: z.object({
    status: z.enum(["pending", "in-progress", "completed", "cancelled"]),
    notes: z.string().optional(),
  }),
});

const SetConsultationSchema = z.object({
  params: z.object({
    kioskUserId: zId("User"),
    consultationId: zId("Consultation"),
  }),
});

/* Register schemas for OpenAPI */
kioskRegistry.register("KioskUser", UserNoPasswordSchema);

// Register the path for getting all kiosks (admin access)
kioskRegistry.registerPath({
  method: "get",
  path: "/kiosk/all",
  tags: ["Kiosk"],
  operationId: "getAllKiosks",
  summary: "Get all kiosk entries",
  description:
    "Returns all kiosk entries with populated user and consultation data. Only accessible by users with at least 'mfa' role.",
  responses: createApiResponses([
    {
      schema: z.array(UserNoPasswordSchema),
      description: "Kiosk users retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "No kiosks found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Authentication required - No active session",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied - Insufficient permissions (requires at least 'mfa' role)",
      statusCode: 403,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "An error occurred while retrieving kiosks",
      statusCode: 500,
    },
  ]),
});

kioskRouter.get("/all", AclMiddleware("kiosk:get-all"), kioskController.getAllKiosks);

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
      schema: ConsultationWithFormsSchema,
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
      description: "Authentication required - No active session",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied - Insufficient permissions (requires 'kiosk' role)",
      statusCode: 403,
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
      schema: ConsultationWithFormsSchema,
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
      description: "Authentication required - No active session",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied - Insufficient permissions (requires 'kiosk' role)",
      statusCode: 403,
    },
    {
      schema: ValidationErrorsSchema,
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
      schema: ConsultationWithFormsSchema,
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
      description: "Authentication required - No active session",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied - Insufficient permissions (requires at least 'mfa' role)",
      statusCode: 403,
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
      description: "Authentication required - No active session",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied - Insufficient permissions (requires at least 'mfa' role)",
      statusCode: 403,
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
      schema: UserNoPasswordSchema,
      description: "Kiosk consultation set successfully",
      statusCode: 201,
    },
    {
      schema: UserNoPasswordSchema,
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
      description: "Authentication required - No active session",
      statusCode: 401,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied - Insufficient permissions (requires at least 'mfa' role)",
      statusCode: 403,
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
