import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ZodError, ZodSchema } from "zod";

import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "./logger";

export const handleServiceResponse = (serviceResponse: ServiceResponse<any>, response: Response) => {
  return response.status(serviceResponse.statusCode).send(serviceResponse);
};

export const validateRequest = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse({ body: req.body, query: req.query, params: req.params });
    next();
  } catch (err) {
    const errorMessage = "Validation error";
    const statusCode = StatusCodes.BAD_REQUEST;
    let validationErrorsArray: unknown[] | null = null;
    if (err) {
      // If it's a ZodError, extract issues, otherwise stringify the error
      if ((err as ZodError).errors) {
        const issues = (err as ZodError).errors;
        validationErrorsArray = issues.map((i) => ({ message: i.message, path: i.path, code: (i as any).code ?? undefined, expected: (i as any).expected ?? undefined, received: (i as any).received ?? undefined }));
      } else {
        try {
          validationErrorsArray = [{ message: JSON.stringify(err) }];
        } catch (_e) {
          validationErrorsArray = [{ message: String(err) }];
        }
      }

      logger.debug({ validationErrors: validationErrorsArray }, "Validation error details");
      logger.error({ error: validationErrorsArray }, "validateRequest: Validation failed");
    }
    const serviceResponse = ServiceResponse.failure(errorMessage, validationErrorsArray, statusCode);
    return handleServiceResponse(serviceResponse, res);
  }
};

export const validateRequestOnlyWithBody = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    const errorMessage = "Validation error";
    const statusCode = StatusCodes.BAD_REQUEST;
    let validationErrorsArray: unknown[] | null = null;
    if (err) {
      if ((err as ZodError).errors) {
        const issues = (err as ZodError).errors;
        validationErrorsArray = issues.map((i) => ({ message: i.message, path: i.path, code: (i as any).code ?? undefined, expected: (i as any).expected ?? undefined, received: (i as any).received ?? undefined }));
      } else {
        try {
          validationErrorsArray = [{ message: JSON.stringify(err) }];
        } catch (_e) {
          validationErrorsArray = [{ message: String(err) }];
        }
      }

      logger.debug({ validationErrors: validationErrorsArray }, "Validation error details");
      logger.error({ error: validationErrorsArray }, "validateRequestOnlyWithBody: Validation failed");
    }
    const serviceResponse = ServiceResponse.failure(errorMessage, validationErrorsArray, statusCode);
    return handleServiceResponse(serviceResponse, res);
  }
};
