/**
 * @file Activity Log Router
 * @module api/activitylog
 * @description Provides real-time activity monitoring and logging for the application. Streams and retrieves system events
 * including user logins, role switches, form interactions, and other tracked activities. Used primarily for audit trails
 * and developer/admin monitoring dashboards.
 */

import { AclMiddleware } from "@/common/middleware/globalAclMiddleware";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { activityLogController } from "./activityLogController";

export const activityLogRegistry = new OpenAPIRegistry();
export const activityLogRouter: Router = express.Router();

// Activity Log Schema
const ActivityLogSchema = z.object({
  timestamp: z.string(),
  username: z.string(),
  action: z.string(),
  details: z.string().optional(),
  type: z.enum(["login", "roleSwitch", "dashboard", "formOpen", "formSubmit", "info", "warning", "error"]),
  color: z.string().optional(),
});

activityLogRegistry.register("ActivityLog", ActivityLogSchema);

// Register the path for streaming logs
activityLogRegistry.registerPath({
  method: "get",
  path: "/activitylog/stream",
  tags: ["ActivityLog"],
  operationId: "streamActivityLogs",
  description: "Server-Sent Events stream for real-time activity logs (developer/admin only)",
  summary: "Stream activity logs",
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "SSE stream",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
  ]),
});

activityLogRouter.get("/stream", AclMiddleware(), activityLogController.streamLogs);

// Register the path for getting recent logs
activityLogRegistry.registerPath({
  method: "get",
  path: "/activitylog/recent",
  tags: ["ActivityLog"],
  operationId: "getRecentActivityLogs",
  description: "Get recent activity logs (developer/admin only)",
  summary: "Get recent activity logs",
  request: {
    query: z.object({
      count: z.string().optional(),
    }),
  },
  responses: createApiResponses([
    {
      schema: z.array(ActivityLogSchema),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
  ]),
});

activityLogRouter.get("/recent", AclMiddleware(), activityLogController.getRecentLogs);

// Register the path for clearing logs
activityLogRegistry.registerPath({
  method: "delete",
  path: "/activitylog/clear",
  tags: ["ActivityLog"],
  operationId: "clearActivityLogs",
  description: "Clear all activity logs (developer/admin only)",
  summary: "Clear activity logs",
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
  ]),
});

activityLogRouter.delete("/clear", AclMiddleware(), activityLogController.clearLogs);

// Register the path for getting stats
activityLogRegistry.registerPath({
  method: "get",
  path: "/activitylog/stats",
  tags: ["ActivityLog"],
  operationId: "getActivityLogStats",
  description: "Get activity log statistics (developer/admin only)",
  summary: "Get activity log stats",
  responses: createApiResponses([
    {
      schema: z.object({
        connectedClients: z.number(),
        totalLogs: z.number(),
      }),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Access denied",
      statusCode: 403,
    },
  ]),
});

activityLogRouter.get("/stats", AclMiddleware(), activityLogController.getStats);
