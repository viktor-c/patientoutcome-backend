import { AclMiddleware } from "@/common/middleware/globalAclMiddleware";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { statisticsController } from "./statisticsController";
import {
  CaseStatisticsSchema,
  ConsultationWithScoresSchema,
  ScoreDataPointSchema,
  ScoreDataResponseSchema,
  SubscaleScoreSchema,
  ScoringDataSchema,
} from "./statisticsModel";

export const statisticsRegistry = new OpenAPIRegistry();
export const statisticsRouter: Router = express.Router();

// Register schemas with OpenAPI
statisticsRegistry.register("SubscaleScore", SubscaleScoreSchema);
statisticsRegistry.register("ScoringData", ScoringDataSchema);
statisticsRegistry.register("ConsultationWithScores", ConsultationWithScoresSchema);
statisticsRegistry.register("CaseStatistics", CaseStatisticsSchema);
statisticsRegistry.register("ScoreDataPoint", ScoreDataPointSchema);
statisticsRegistry.register("ScoreDataResponse", ScoreDataResponseSchema);

// Register the path for getting case statistics
statisticsRegistry.registerPath({
  method: "get",
  path: "/statistics/case/{caseId}",
  tags: ["Statistics"],
  operationId: "getCaseStatistics",
  description: "Get statistics for a specific patient case including consultation count and PROM scores",
  summary: "Get case statistics",
  request: {
    params: z.object({
      caseId: z.string(),
    }),
  },
  responses: createApiResponses([
    {
      schema: CaseStatisticsSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Case not found",
      statusCode: 404,
    },
  ]),
});

statisticsRouter.get("/case/:caseId", AclMiddleware(), statisticsController.getCaseStatistics);

// Register the path for getting score data
statisticsRegistry.registerPath({
  method: "get",
  path: "/statistics/case/{caseId}/scores",
  tags: ["Statistics"],
  operationId: "getScoreData",
  description: "Get PROM score data formatted for charting with both real-time and fixed-interval modes",
  summary: "Get score data for charts",
  request: {
    params: z.object({
      caseId: z.string(),
    }),
  },
  responses: createApiResponses([
    {
      schema: ScoreDataResponseSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Case not found",
      statusCode: 404,
    },
  ]),
});

statisticsRouter.get("/case/:caseId/scores", AclMiddleware(), statisticsController.getScoreData);
