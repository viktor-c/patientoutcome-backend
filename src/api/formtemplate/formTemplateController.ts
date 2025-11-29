import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";
import { formTemplateService } from "./formTemplateService";

class FormTemplateController {
  public getFormTemplates: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.getFormTemplates();
    return handleServiceResponse(serviceResponse, res);
  };

  public getFormTemplateById: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.getFormTemplateById(req.params.templateId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getFormTemplatesShortlist: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.getFormTemplatesShortlist();
    return handleServiceResponse(serviceResponse, res);
  };

  public updateFormTemplate: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.updateFormTemplate(req.params.templateId, req.body);
    return handleServiceResponse(serviceResponse, res);
  };

  public createFormTemplate: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.createFormTemplate(req.body);
    return handleServiceResponse(serviceResponse, res);
  };

  public deleteFormTemplate: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.deleteFormTemplateById(req.params.templateId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const formTemplateController = new FormTemplateController();
