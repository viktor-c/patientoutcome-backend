/**
 * @file Settings Router
 * @module api/settings
 * @description Routes for application settings management. Provides endpoints to read and update
 * system configuration settings such as SMTP configuration and backup settings.
 */

import { AclMiddleware } from "@/common/middleware/globalAclMiddleware";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import {
  GetSettingsResponseSchema,
  SettingsConfigSchema,
  UpdateSettingsSchema,
} from "./settingsModel";
import { validateRequest } from "@/common/utils/httpHandlers";
import { settingsController } from "./settingsController";

// Initialize the OpenAPI registry
export const settingsRegistry = new OpenAPIRegistry();

// Create an Express router
export const settingsRouter: Router = express.Router();

// Register schemas
settingsRegistry.register("SettingsConfig", SettingsConfigSchema);

// ============================================
// GET /settings - Get all settings with metadata
// ============================================

settingsRegistry.registerPath({
  method: "get",
  path: "/settings",
  tags: ["Settings"],
  operationId: "getSettings",
  description: "Retrieve all application settings with descriptions, validation rules, and current values",
  summary: "Get all settings",
  responses: createApiResponses([
    {
      schema: GetSettingsResponseSchema,
      description: "Settings retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Failed to retrieve settings",
      statusCode: 500,
    },
  ]),
  security: [{ bearerAuth: [] }],
});

settingsRouter.get(
  "/",
  AclMiddleware("settings-read"),
  settingsController.getSettings
);

// ============================================
// GET /settings/values - Get setting values only
// ============================================

settingsRegistry.registerPath({
  method: "get",
  path: "/settings/values",
  tags: ["Settings"],
  operationId: "getSettingValues",
  description: "Retrieve only the current values of all settings without metadata",
  summary: "Get setting values",
  responses: createApiResponses([
    {
      schema: z.record(z.string(), z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))),
      description: "Setting values retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Failed to retrieve setting values",
      statusCode: 500,
    },
  ]),
  security: [{ bearerAuth: [] }],
});

settingsRouter.get(
  "/values",
  AclMiddleware("settings-read"),
  settingsController.getSettingValues
);

// ============================================
// PUT /settings - Update settings
// ============================================

settingsRegistry.registerPath({
  method: "put",
  path: "/settings",
  tags: ["Settings"],
  operationId: "updateSettings",
  description: "Update application settings. Only values are updated; metadata remains unchanged. Sensitive values are masked in the response.",
  summary: "Update settings",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.record(
            z.string(),
            z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          ),
          example: {
            smtp: {
              SMTP_HOST: "smtp.gmail.com",
              SMTP_PORT: 587,
              SMTP_SECURE: false,
            },
            backup: {
              BACKUP_RETENTION_DAYS: 30,
            },
          },
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: GetSettingsResponseSchema,
      description: "Settings updated successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Invalid input or validation error",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Failed to update settings",
      statusCode: 500,
    },
  ]),
  security: [{ bearerAuth: [] }],
});

settingsRouter.put(
  "/",
  AclMiddleware("settings-write"),
  validateRequest(UpdateSettingsSchema),
  settingsController.updateSettings
);

// ============================================
// GET /settings/:category/:field - Get specific setting value
// ============================================

const GetSettingValueParamsSchema = z.object({
  params: z.object({
    category: z.string(),
    field: z.string(),
  }),
});

settingsRegistry.registerPath({
  method: "get",
  path: "/settings/{category}/{field}",
  tags: ["Settings"],
  operationId: "getSettingValue",
  description: "Retrieve a specific setting value by category and field name",
  summary: "Get specific setting value",
  request: {
    params: z.object({
      category: z.string().openapi({ example: "smtp" }),
      field: z.string().openapi({ example: "SMTP_HOST" }),
    }),
  },
  responses: createApiResponses([
    {
      schema: z.object({ value: z.union([z.string(), z.number(), z.boolean()]) }),
      description: "Setting value retrieved successfully",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Category and field are required",
      statusCode: 400,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Setting not found",
      statusCode: 404,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Failed to retrieve setting value",
      statusCode: 500,
    },
  ]),
  security: [{ bearerAuth: [] }],
});

settingsRouter.get(
  "/:category/:field",
  AclMiddleware("settings-read"),
  validateRequest(GetSettingValueParamsSchema),
  settingsController.getSettingValue
);
