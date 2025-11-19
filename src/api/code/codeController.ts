import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/server";
import type { Request, RequestHandler, Response } from "express";
import { codeService } from "./codeService";

class CodeController {
  public activateCode: RequestHandler = async (req: Request, res: Response) => {
    const { code, consultationId } = req.params;
    logger.debug(`Activating code: ${code} for consultation: ${consultationId}`);
    const serviceResponse = await codeService.activateCode(code, consultationId);
    return handleServiceResponse(serviceResponse, res);
  };
  public deactivateCode: RequestHandler = async (req: Request, res: Response) => {
    const { code } = req.params;
    const serviceResponse = await codeService.deactivateCode(code);
    return handleServiceResponse(serviceResponse, res);
  };
  public addCodes: RequestHandler = async (req: Request, res: Response) => {
    const { numberOfCodes } = req.params;
    const serviceResponse = await codeService.addCodes(numberOfCodes);
    return handleServiceResponse(serviceResponse, res);
  };
  public deleteCode: RequestHandler = async (req: Request, res: Response) => {
    const { code } = req.params;
    const serviceResponse = await codeService.deleteCode(code);
    return handleServiceResponse(serviceResponse, res);
  };

  public getCodeById: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await codeService.getCodeById(id);
    return handleServiceResponse(serviceResponse, res);
  };
  public getCode: RequestHandler = async (req: Request, res: Response) => {
    const { code } = req.params;
    const serviceResponse = await codeService.getCode(code);
    return handleServiceResponse(serviceResponse, res);
  };

  public findAllCodes: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await codeService.getAllCodes();
    return handleServiceResponse(serviceResponse, res);
  };

  async getAllAvailableCodes(req: Request, res: Response): Promise<Response> {
    const serviceResponse = await codeService.getAllAvailableCodes();
    return handleServiceResponse(serviceResponse, res);
  }

  async validateCode(req: Request, res: Response): Promise<Response> {
    const { code } = req.params;
    const serviceResponse = await codeService.validateCode(code);
    return handleServiceResponse(serviceResponse, res);
  }
}

export const codeController = new CodeController();
