import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/server";
import type { Request, RequestHandler, Response } from "express";
import { codeService } from "./codeService";

class CodeController {
  public activateCode: RequestHandler = async (req: Request, res: Response) => {
    const { internalCode, consultationId } = req.params;
    logger.debug("Activating code:", internalCode, "for consultation:", consultationId);
    const serviceResponse = await codeService.activateCode(internalCode, consultationId);
    return handleServiceResponse(serviceResponse, res);
  };
  public deactivateCode: RequestHandler = async (req: Request, res: Response) => {
    const { internalCode } = req.params;
    const serviceResponse = await codeService.deactivateCode(internalCode);
    return handleServiceResponse(serviceResponse, res);
  };
  public addCode: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await codeService.addCode(req.body);
    return handleServiceResponse(serviceResponse, res);
  };
  public deleteCode: RequestHandler = async (req: Request, res: Response) => {
    const { internalCode } = req.params;
    const serviceResponse = await codeService.deleteCode(internalCode);
    return handleServiceResponse(serviceResponse, res);
  };

  public getCodeById: RequestHandler = async (req: Request, res: Response) => {
    const { internalCode } = req.params;
    const serviceResponse = await codeService.getCodeById(internalCode);
    return handleServiceResponse(serviceResponse, res);
  };
  public getCodeByExternalCode: RequestHandler = async (req: Request, res: Response) => {
    const { externalCode } = req.params;
    const serviceResponse = await codeService.getCodeByExternalCode(externalCode);
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

  async isValidExternalCode(req: Request, res: Response): Promise<Response> {
    const { externalCode } = req.params;
    const serviceResponse = await codeService.isValidExternalCode(externalCode);
    return handleServiceResponse(serviceResponse, res);
  }
}

export const codeController = new CodeController();
