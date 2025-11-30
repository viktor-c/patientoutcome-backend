import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/common/utils/logger";
import { seedingMiddleware } from "@/common/utils/seedingUtils";

import { CreateAdminRequestSchema, SeedRequestSchema, SetupStatusSchema } from "./setupModel";
import { setupService } from "./setupService";

export const setupRegistry = new OpenAPIRegistry();
export const setupRouter: Router = express.Router();

// Register schemas
setupRegistry.register("SetupStatus", SetupStatusSchema);
setupRegistry.register("CreateAdminRequest", CreateAdminRequestSchema);
setupRegistry.register("SeedRequest", SeedRequestSchema);

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
      schema: z.object({
        message: z.string(),
        data: SetupStatusSchema,
      }),
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
      const errors = parseResult.error.errors.map((e) => e.message).join(", ");
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Validation error: ${errors}`,
        data: null,
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
      data: null,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  }
});

/**
 * Seed demo data
 * @route POST /setup/seed
 */
setupRegistry.registerPath({
  method: "post",
  summary: "Seed Demo Data",
  description:
    "Seed the database with demo data. Use this during initial setup to populate the database with sample data.",
  operationId: "seedDemoData",
  path: "/setup/seed",
  tags: ["Setup"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: SeedRequestSchema,
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: z.object({
        message: z.string(),
        data: z.object({
          seeded: z.array(z.string()),
          failed: z.array(z.string()),
        }),
      }),
      description: "Demo data seeded successfully",
      statusCode: 200,
    },
    {
      schema: z.object({
        message: z.string(),
        data: z.object({
          seeded: z.array(z.string()),
          failed: z.array(z.string()),
        }),
      }),
      description: "Some seed operations failed",
      statusCode: 207,
    },
  ]),
});

setupRouter.post("/seed", seedingMiddleware, async (req: Request, res: Response) => {
  try {
    // Parse request body with defaults
    const parseResult = SeedRequestSchema.safeParse(req.body || {});
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => e.message).join(", ");
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Validation error: ${errors}`,
        data: null,
        statusCode: StatusCodes.BAD_REQUEST,
      });
    }

    const serviceResponse = await setupService.seedDemoData(parseResult.data);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    logger.error({ error }, "Error in seed endpoint");
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      data: null,
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
  operationId: "getDatabaseStats",
  path: "/setup/stats",
  tags: ["Setup"],
  responses: createApiResponses([
    {
      schema: z.object({
        message: z.string(),
        data: z.record(z.number()),
      }),
      description: "Database statistics retrieved successfully",
      statusCode: 200,
    },
  ]),
});

setupRouter.get("/stats", async (_req: Request, res: Response) => {
  const serviceResponse = await setupService.getDatabaseStats();
  return handleServiceResponse(serviceResponse, res);
});
