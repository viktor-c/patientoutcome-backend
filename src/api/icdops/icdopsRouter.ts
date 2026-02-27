import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import {
  IcdOpsPaginatedResponseSchema,
  SearchQuerySchema,
} from "./icdopsModel";
import { validateRequest } from "@/common/utils/httpHandlers";
import { icdopsController } from "./icdopsController";

// ──────────────────────────────────────────────────────────────
// ICD-OPS Router & OpenAPI Registry
// ──────────────────────────────────────────────────────────────

export const icdopsRegistry = new OpenAPIRegistry();
export const icdopsRouter: Router = express.Router();

// Register schemas
icdopsRegistry.register("IcdOpsEntry", z.object({
  code: z.string(),
  label: z.string(),
  kind: z.enum(["chapter", "block", "category"]),
}));
icdopsRegistry.register("IcdOpsPaginatedResponse", IcdOpsPaginatedResponseSchema);

// ─── ICD-10 Search ─────────────────────────────────────────

icdopsRegistry.registerPath({
  method: "get",
  path: "/icdops/icd/search",
  tags: ["ICD-OPS"],
  operationId: "searchIcd",
  summary: "Search ICD-10-GM 2026 codes",
  description: "Paginated search across ICD-10-GM 2026 codes and labels. Returns matching categories by default.",
  request: {
    query: SearchQuerySchema.shape.query,
  },
  responses: createApiResponses([
    {
      schema: IcdOpsPaginatedResponseSchema,
      description: "Paginated ICD-10 search results",
      statusCode: StatusCodes.OK,
    },
    {
      schema: z.null(),
      description: "Validation error",
      statusCode: StatusCodes.BAD_REQUEST,
    },
  ]),
});

icdopsRouter.get(
  "/icd/search",
  validateRequest(SearchQuerySchema),
  icdopsController.searchIcd,
);

// ─── OPS Search ────────────────────────────────────────────

icdopsRegistry.registerPath({
  method: "get",
  path: "/icdops/ops/search",
  tags: ["ICD-OPS"],
  operationId: "searchOps",
  summary: "Search OPS 2026 procedure codes",
  description: "Paginated search across OPS 2026 procedure codes and labels. Returns matching categories by default.",
  request: {
    query: SearchQuerySchema.shape.query,
  },
  responses: createApiResponses([
    {
      schema: IcdOpsPaginatedResponseSchema,
      description: "Paginated OPS search results",
      statusCode: StatusCodes.OK,
    },
    {
      schema: z.null(),
      description: "Validation error",
      statusCode: StatusCodes.BAD_REQUEST,
    },
  ]),
});

icdopsRouter.get(
  "/ops/search",
  validateRequest(SearchQuerySchema),
  icdopsController.searchOps,
);

// ─── ICD Status ────────────────────────────────────────────

icdopsRegistry.registerPath({
  method: "get",
  path: "/icdops/icd/status",
  tags: ["ICD-OPS"],
  operationId: "getIcdStatus",
  summary: "Get ICD-10 data load status",
  description: "Returns the version, load status, and entry count for the in-memory ICD-10 database.",
  responses: createApiResponses([
    {
      schema: z.object({
        version: z.string(),
        loaded: z.boolean(),
        entryCount: z.number(),
      }),
      description: "ICD-10 data status",
      statusCode: StatusCodes.OK,
    },
  ]),
});

icdopsRouter.get("/icd/status", icdopsController.getIcdStatus);

// ─── OPS Status ────────────────────────────────────────────

icdopsRegistry.registerPath({
  method: "get",
  path: "/icdops/ops/status",
  tags: ["ICD-OPS"],
  operationId: "getOpsStatus",
  summary: "Get OPS data load status",
  description: "Returns the version, load status, and entry count for the in-memory OPS database.",
  responses: createApiResponses([
    {
      schema: z.object({
        version: z.string(),
        loaded: z.boolean(),
        entryCount: z.number(),
      }),
      description: "OPS data status",
      statusCode: StatusCodes.OK,
    },
  ]),
});

icdopsRouter.get("/ops/status", icdopsController.getOpsStatus);
