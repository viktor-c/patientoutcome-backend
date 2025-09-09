import { formService } from "@/api/form/formService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";

class FormController {
  public getFormById: RequestHandler = async (req: Request, res: Response) => {
    const { formId } = req.params;
    const serviceResponse = await formService.getFormById(formId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getForms: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await formService.getAllForms();
    return handleServiceResponse(serviceResponse, res);
  };

  public createForm: RequestHandler = async (req: Request, res: Response) => {
    const formData = req.body;
    const serviceResponse = await formService.createForm(formData);
    return handleServiceResponse(serviceResponse, res);
  };

  public updateForm: RequestHandler = async (req: Request, res: Response) => {
    const { formId } = req.params;
    const updatedForm = req.body;
    const serviceResponse = await formService.updateForm(formId, updatedForm);
    return handleServiceResponse(serviceResponse, res);
  };

  public deleteForm: RequestHandler = async (req: Request, res: Response) => {
    const { formId } = req.params;
    const serviceResponse = await formService.deleteForm(formId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const formController = new FormController();
