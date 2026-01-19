/**
 * @file Setup Router
 * @module api/setup
 * @description Handles initial application setup and configuration. Checks setup status and creates the first admin user.
 * Used during first-time deployment to bootstrap the application.
 */

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/common/utils/logger";

import { CreateAdminRequestSchema, SetupStatusSchema } from "./setupModel";
import { setupService } from "./setupService";

export const setupRegistry = new OpenAPIRegistry();
export const setupRouter: Router = express.Router();

// Register schemas
setupRegistry.register("SetupStatus", SetupStatusSchema);
setupRegistry.register("CreateAdminRequest", CreateAdminRequestSchema);

/**
 * Get setup status
 * @route GET /setup/status
 */
setupRegistry.registerPath({
  method: "get",
  summary: "Get Setup Status",
  description: "Check if initial setup is required (no admin user exists)",
  operationId: "getSetupStatus",
  path: "/setup/status",
  tags: ["Setup"],
  responses: createApiResponses([
    {
      schema: SetupStatusSchema,
      description: "Setup status retrieved successfully",
      statusCode: 200,
    },
  ]),
});

setupRouter.get("/status", async (_req: Request, res: Response) => {
  const serviceResponse = await setupService.getSetupStatus();
  return handleServiceResponse(serviceResponse, res);
});

/**
 * Create initial admin user
 * @route POST /setup/create-admin
 */
setupRegistry.registerPath({
  method: "post",
  summary: "Create Initial Admin User",
  description: "Create the first admin user during initial setup. This endpoint only works if no admin user exists.",
  operationId: "createAdminUser",
  path: "/setup/create-admin",
  tags: ["Setup"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateAdminRequestSchema,
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: z.object({
        message: z.string(),
        data: z.object({
          adminUserId: z.string(),
        }),
      }),
      description: "Admin user created successfully",
      statusCode: 201,
    },
    {
      schema: z.object({
        message: z.string(),
        data: z.null(),
      }),
      description: "Setup already completed or validation error",
      statusCode: 409,
    },
  ]),
});

setupRouter.post("/create-admin", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const parseResult = CreateAdminRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e: any) => e.message).join(", ");
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Validation error: ${errors}`,
        responseObject: null,
        statusCode: StatusCodes.BAD_REQUEST,
      });
    }

    const serviceResponse = await setupService.createAdminUser(parseResult.data);

    // Set appropriate status code for success
    if (serviceResponse.success) {
      return res.status(StatusCodes.CREATED).json(serviceResponse);
    }

    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    logger.error({ error }, "Error in create-admin endpoint");
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      responseObject: null,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  }
});

/**
 * Get database statistics
 * @route GET /setup/stats
 */
setupRegistry.registerPath({
  method: "get",
  summary: "Get Database Statistics",
  description: "Get counts of documents in all major collections",
  operationId: "getSetupDatabaseStats",
  path: "/setup/stats",
  tags: ["Setup"],
  responses: createApiResponses([
    {
      schema: z.record(z.string(), z.number()),
      description: "Database statistics retrieved successfully",
      statusCode: 200,
    },
  ]),
});

setupRouter.get("/stats", async (_req: Request, res: Response) => {
  const serviceResponse = await setupService.getDatabaseStats();
  return handleServiceResponse(serviceResponse, res);
});

/**
 * Seed starter data (blueprints and form templates)
 * @route POST /setup/seed-starter
 */
setupRegistry.registerPath({
  method: "post",
  summary: "Seed Starter Data",
  description: "Seed form templates and blueprints for new instance. Provides minimum starting point for everyday practice.",
  operationId: "seedStarterData",
  path: "/setup/seed-starter",
  tags: ["Setup"],
  responses: createApiResponses([
    {
      schema: z.object({
        seeded: z.array(z.string()),
      }),
      description: "Starter data seeded successfully",
      statusCode: 200,
    },
  ]),
});

setupRouter.post("/seed-starter", async (_req: Request, res: Response) => {
  const serviceResponse = await setupService.seedStarterData();
  return handleServiceResponse(serviceResponse, res);
});
