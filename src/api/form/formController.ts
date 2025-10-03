import { log } from "node:console";
import { formService } from "@/api/form/formService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/common/utils/logger";
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

    // Debug: Log what we received
    console.debug("=== BACKEND CONTROLLER: Received data ===");
    console.debug("formId:", formId);
    console.debug("req.body type:", typeof req.body);
    console.debug("req.body keys:", Object.keys(req.body));
    console.debug("req.body:", JSON.stringify(req.body, null, 2));
    console.debug("updatedForm:", JSON.stringify(updatedForm, null, 2));
    console.debug("=========================================");

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
