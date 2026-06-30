import { handleServiceResponse, validateRequest } from "@/common/utils/httpHandlers";
import { logger } from "@/server";
import type { Request, RequestHandler, Response } from "express";
import { feedbackService } from "./feedbackService";
import { SubmitFeedbackSchema } from "./feedbackModel";
import { captchaService } from "../captcha/captchaService";

class FeedbackController {
  public getCaptcha: RequestHandler = async (req: Request, res: Response) => {
    try {
      const captcha = captchaService.generate();
      const serviceResponse = {
        success: true,
        message: "Captcha generated successfully",
        responseObject: {
          captchaId: captcha.id,
          captchaSvg: captcha.svg,
        },
        statusCode: 200,
      };
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error("Error generating captcha", { error });
      const serviceResponse = {
        success: false,
        message: "Error generating captcha",
        responseObject: null,
        statusCode: 500,
      };
      return handleServiceResponse(serviceResponse, res);
    }
  };

  public submitFeedback: RequestHandler = async (req: Request, res: Response) => {
    const { captchaId, captchaAnswer, ...feedbackData } = req.body;

    if (!captchaService.verify(captchaId, captchaAnswer)) {
      const serviceResponse = {
        success: false,
        message: "Invalid captcha",
        responseObject: null,
        statusCode: 400,
      };
      return handleServiceResponse(serviceResponse, res);
    }

    const serviceResponse = await feedbackService.submitFeedback(feedbackData);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const feedbackController = new FeedbackController();
