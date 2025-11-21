import type { Request, RequestHandler, Response } from "express";
import { statisticsService } from "./statisticsService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";

class StatisticsController {
  /**
   * Get case statistics
   */
  public getCaseStatistics: RequestHandler = async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const serviceResponse = await statisticsService.getCaseStatistics(caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get score data for charts
   */
  public getScoreData: RequestHandler = async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const serviceResponse = await statisticsService.getScoreData(caseId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const statisticsController = new StatisticsController();
