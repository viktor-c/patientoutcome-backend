import type { Request, RequestHandler, Response } from "express";
import { statisticsService } from "./statisticsService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";

/**
 * Statistics Controller
 * @class StatisticsController
 * @description Handles HTTP requests for patient outcome statistics and PROM score data
 */
class StatisticsController {
  /**
   * Get case statistics
   * @route GET /statistics/case/:caseId
   * @param {Request} req - Express request with caseId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with case statistics including consultation count and PROM scores
   * @description Retrieves aggregated statistics for a patient case including form completion rates and scores
   */
  public getCaseStatistics: RequestHandler = async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const serviceResponse = await statisticsService.getCaseStatistics(caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get score data for charts
   * @route GET /statistics/case/:caseId/scores
   * @param {Request} req - Express request with caseId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with formatted score data for visualization
   * @description Retrieves PROM score trends over time formatted for chart rendering
   */
  public getScoreData: RequestHandler = async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const serviceResponse = await statisticsService.getScoreData(caseId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const statisticsController = new StatisticsController();
