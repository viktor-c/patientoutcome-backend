import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";

export const healthCheckRegistry = new OpenAPIRegistry();
export const healthCheckRouter: Router = express.Router();

healthCheckRegistry.registerPath({
  method: "get",
  summary: "Health Check",
  description: "Check the health of the service",
  operationId: "healthCheck",
  path: "/health-check",
  tags: ["Health Check"],
  responses: createApiResponses([
    {
      schema: z.object({
        message: z.string(),
        data: z.null(),
      }),
      description: "Service is healthy",
      statusCode: 200,
    },
    {
      schema: z.object({
        message: z.string(),
        data: z.null(),
      }),
      description: "Service is unhealthy",
      statusCode: 500,
    },
  ]),
});

healthCheckRouter.get("/", (_req: Request, res: Response) => {
  const serviceResponse = ServiceResponse.success("Service is healthy", null);
  return handleServiceResponse(serviceResponse, res);
});
