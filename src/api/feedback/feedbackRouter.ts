/**
 * @file Feedback Router
 * @module api/feedback
 * @description Handles user feedback submissions with CAPTCHA protection. Allows anonymous or identified users to
 * submit feedback messages, which are logged and optionally emailed to administrators. Includes CAPTCHA challenge
 * generation for spam prevention.
 */

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/common/utils/logger";
import { feedbackService } from "./feedbackService";

export const feedbackRegistry = new OpenAPIRegistry();
export const feedbackRouter: Router = express.Router();

// Schema for captcha response
const captchaResponseSchema = z.object({
  captchaId: z.string(),
  question: z.string(),
});

// Schema for feedback request
const feedbackRequestSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  message: z.string().min(1, "Message is required"),
  captchaId: z.string().min(1, "Captcha ID is required"),
  captchaAnswer: z.string().min(1, "Captcha answer is required"),
  locale: z.string().optional(), // User's locale for confirmation email (e.g., 'en', 'de', 'en-US')
});

// Register GET /feedback/captcha endpoint
feedbackRegistry.registerPath({
  method: "get",
  summary: "Get captcha challenge",
  description: "Request a new captcha challenge for the feedback form",
  operationId: "getCaptcha",
  path: "/feedback/captcha",
  tags: ["Feedback"],
  responses: createApiResponses([
    {
      schema: captchaResponseSchema,
      description: "Captcha challenge generated",
      statusCode: 200,
    },
  ]),
});

// Register POST /feedback endpoint
feedbackRegistry.registerPath({
  method: "post",
  summary: "Submit feedback",
  description: "Submit feedback/contact message via email. Requires valid captcha.",
  operationId: "submitFeedback",
  path: "/feedback",
  tags: ["Feedback"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: feedbackRequestSchema,
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
      description: "Feedback submitted successfully",
      statusCode: 200,
    },
    {
      schema: z.object({
        message: z.string(),
        data: z.null(),
      }),
      description: "Failed to submit feedback",
      statusCode: 500,
    },
    {
      schema: z.object({
        message: z.string(),
        data: z.null(),
      }),
      description: "Invalid request or captcha verification failed",
      statusCode: 400,
    },
  ]),
});

// GET /captcha - Generate a new captcha challenge
feedbackRouter.get("/captcha", (_req: Request, res: Response) => {
  const captcha = feedbackService.generateCaptcha();
  const serviceResponse = ServiceResponse.success("Captcha generated", captcha);
  return handleServiceResponse(serviceResponse, res);
});

// POST / - Submit feedback with captcha verification
feedbackRouter.post("/", async (req: Request, res: Response) => {
  try {
    const validationResult = feedbackRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      const serviceResponse = ServiceResponse.failure(
        validationResult.error.errors.map((e) => e.message).join(", "),
        null,
        400,
      );
      return handleServiceResponse(serviceResponse, res);
    }

    const { name, email, message, captchaId, captchaAnswer, locale } = validationResult.data;

    // Verify captcha using server-side validation
    const captchaValid = feedbackService.verifyCaptcha(captchaId, captchaAnswer);
    if (!captchaValid) {
      const serviceResponse = ServiceResponse.failure(
        "Captcha verification failed. Please request a new captcha and try again.",
        null,
        400,
      );
      return handleServiceResponse(serviceResponse, res);
    }

    // Send email
    const result = await feedbackService.sendFeedbackEmail({
      name: name || "Anonymous",
      email: email || "Not provided",
      message,
      submittedAt: new Date(),
      username: req.session?.username,
      locale,
    });

    if (result.success) {
      const serviceResponse = ServiceResponse.success("Feedback submitted successfully", null);
      return handleServiceResponse(serviceResponse, res);
    }
    const serviceResponse = ServiceResponse.failure("Failed to send feedback", null, 500);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    logger.error({ error }, "feedbackRouter: Error processing feedback");
    const serviceResponse = ServiceResponse.failure("An error occurred while processing feedback", null, 500);
    return handleServiceResponse(serviceResponse, res);
  }
});
