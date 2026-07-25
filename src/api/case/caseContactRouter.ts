/**
 * @file Case Contact Router
 * @module api/case/caseContactRouter
 * @description Handles patient contact reports for archived or inaccessible access codes.
 * Allows unauthenticated patients to report issues with access codes.
 */

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/common/utils/logger";
import { caseContactService } from "./caseContactService";
import { feedbackService } from "@/api/feedback/feedbackService";

export const caseContactRegistry = new OpenAPIRegistry();
export const caseContactRouter: Router = express.Router();

// Schema for contact report request
const contactReportRequestSchema = z.object({
  code: z.string().min(5, "Code must be at least 5 characters"),
  message: z.string().min(1, "Message is required"),
  captchaId: z.string().min(1, "Captcha ID is required"),
  captchaAnswer: z.string().min(1, "Captcha answer is required"),
  locale: z.string().optional(),
});

// Schema for captcha response
const captchaResponseSchema = z.object({
  captchaId: z.string(),
  captchaSvg: z.string(),
});

// Register GET /case/contact/captcha endpoint
caseContactRegistry.registerPath({
  method: "get",
  summary: "Get captcha challenge for case contact form",
  description: "Request a new captcha challenge for the case contact report form",
  operationId: "getCaseContactCaptcha",
  path: "/case/contact/captcha",
  tags: ["Case Contact"],
  responses: createApiResponses([
    {
      schema: captchaResponseSchema,
      description: "Captcha challenge generated",
      statusCode: 200,
    },
  ]),
});

// Register POST /case/contact endpoint
caseContactRegistry.registerPath({
  method: "post",
  summary: "Submit case contact report",
  description:
    "Submit a contact report for an archived or inaccessible access code. Notifies physicians assigned to the case.",
  operationId: "submitCaseContactReport",
  path: "/case/contact",
  tags: ["Case Contact"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: contactReportRequestSchema,
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: z.object({
        message: z.string(),
        data: z.null(),
      }),
      description: "Contact report submitted successfully",
      statusCode: 200,
    },
    {
      schema: z.object({
        message: z.string(),
        data: z.null(),
      }),
      description: "Invalid request or captcha verification failed",
      statusCode: 400,
    },
    {
      schema: z.object({
        message: z.string(),
        data: z.null(),
      }),
      description: "Code or case not found",
      statusCode: 404,
    },
    {
      schema: z.object({
        message: z.string(),
        data: z.null(),
      }),
      description: "Failed to send contact report",
      statusCode: 500,
    },
  ]),
});

// GET /captcha - Generate a new captcha challenge
caseContactRouter.get("/captcha", (_req: Request, res: Response) => {
  try {
    const captchaData = feedbackService.generateCaptcha();
    const serviceResponse = ServiceResponse.success("Captcha generated", {
      captchaId: captchaData.captchaId,
      captchaSvg: captchaData.captchaSvg,
    });
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    logger.error({ error }, "caseContactRouter: Error generating captcha");
    const serviceResponse = ServiceResponse.failure("Failed to generate captcha", null);
    handleServiceResponse(serviceResponse, res);
  }
});

// POST /contact - Submit contact report
caseContactRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { code, message, captchaId, captchaAnswer, locale } = contactReportRequestSchema.parse(req.body);

    // Verify captcha
    const isCaptchaValid = feedbackService.verifyCaptcha(captchaId, captchaAnswer);
    if (!isCaptchaValid) {
      const serviceResponse = ServiceResponse.failure("Invalid captcha", null);
      return handleServiceResponse(serviceResponse, res);
    }

    // Send contact report
    const result = await caseContactService.sendCaseContactReport({
      code,
      message,
      submittedAt: new Date(),
      locale,
    });

    handleServiceResponse(result, res);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.errors }, "caseContactRouter: Invalid request data");
      const serviceResponse = ServiceResponse.failure("Invalid request data", null);
      return handleServiceResponse(serviceResponse, res);
    }

    logger.error({ error }, "caseContactRouter: Error submitting contact report");
    const serviceResponse = ServiceResponse.failure("Failed to submit contact report", null);
    handleServiceResponse(serviceResponse, res);
  }
});
