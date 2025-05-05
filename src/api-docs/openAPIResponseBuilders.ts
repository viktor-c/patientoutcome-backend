import type { StatusCodes } from "http-status-codes";
import type { z } from "zod";

import { ServiceResponseSchema } from "@/common/models/serviceResponse";

// Use if you want multiple responses for a single endpoint

import type { ResponseConfig } from "@asteasolutions/zod-to-openapi";

export type ApiResponseConfig = {
  schema: z.ZodTypeAny;
  description: string;
  statusCode: StatusCodes;
};

export function createApiResponses(configs: ApiResponseConfig[]) {
  const responses: { [key: string]: ResponseConfig } = {};
  configs.forEach(({ schema, description, statusCode }) => {
    if (statusCode === 204) {
      responses[statusCode] = {
        description,
        content: {},
      };
      return;
    } else {
      responses[statusCode] = {
        description,
        content: {
          "application/json": {
            schema: ServiceResponseSchema(schema),
          },
        },
      };
    }
  });
  return responses;
}
