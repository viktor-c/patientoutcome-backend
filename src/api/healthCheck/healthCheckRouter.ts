import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";

import { app } from "@/server";

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

healthCheckRouter.get("/all-routes", (_req: Request, res: Response) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).send("This route is only available in development mode.");
  }
  let response = "<h1>All routes</h1><table><tr><th>Method</th><th>Path</th><th>name</th></tr>";
  let iRow = 0;

  const split = (thing: any): string[] | string => {
    if (typeof thing === "string") {
      return thing.split("/");
    } else if (thing.fast_slash) {
      return "";
    } else {
      const match = thing
        .toString()
        .replace("\\/?", "")
        .replace("(?=\\/|$)", "$")
        .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//);
      return match ? match[1].replace(/\\(.)/g, "$1").split("/") : `<complex:${thing.toString()}>`;
    }
  };

  const print = (path: any[], layer: any): void => {
    if (layer.route) {
      layer.route.stack.forEach(print.bind(null, path.concat(split(layer.route.path))));
    } else if (layer.name === "router" && layer.handle.stack) {
      layer.handle.stack.forEach(print.bind(null, path.concat(split(layer.regexp))));
    } else if (layer.method) {
      if (iRow % 2 === 0) {
        response += `<tr style="background-color: #f2f2f2;">`;
      } else {
        response += `<tr style="background-color: #ffffff;">`;
      }
      iRow++;
      response += `<td>${layer.method.toUpperCase()}</td><td>${path.concat(split(layer.regexp)).filter(Boolean).join("/")}</td><td>${layer.name}</td></tr>\n`;
    }
  };

  app._router.stack.forEach(print.bind(null, []));
  response += "</table>";
  res.status(200).send(response);
});
