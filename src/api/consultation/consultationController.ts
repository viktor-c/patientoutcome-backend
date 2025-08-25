import { codeService } from "@/api/code/codeService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { consultationService } from "./consultationService";

class ConsultationController {
  // Create a new consultation
  public createConsultation: RequestHandler = async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const consultationData = req.body;
    const serviceResponse = await consultationService.createConsultation(caseId, consultationData);
    return handleServiceResponse(serviceResponse, res);
  };

  // Get a consultation by ID
  public getConsultationById: RequestHandler = async (req: Request, res: Response) => {
    const consultationId = z.string().parse(req.params.consultationId);
    const serviceResponse = await consultationService.getConsultationById(consultationId);
    return handleServiceResponse(serviceResponse, res);
  };

  // Update a consultation by ID
  public updateConsultation: RequestHandler = async (req: Request, res: Response) => {
    const consultationId = z.string().parse(req.params.consultationId);
    const consultationData = req.body;
    const serviceResponse = await consultationService.updateConsultation(consultationId, consultationData);
    return handleServiceResponse(serviceResponse, res);
  };

  // Delete a consultation by ID
  public deleteConsultation: RequestHandler = async (req: Request, res: Response) => {
    const consultationId = z.string().parse(req.params.consultationId);
    // save form access code before deleting the consultation
    const formAccessCode = await consultationService.getFormAccessCode(consultationId);
    if (formAccessCode?.responseObject) {
      //first get code by internal id
      const fullCodeDocument = await codeService.getCodeByInternalCode(formAccessCode.responseObject);
      if (fullCodeDocument.responseObject?._id) {
        // then delete the code
        // Note: This will delete the code from the database, which is expected behavior.
        await codeService.deleteCode(fullCodeDocument.responseObject._id.toString());
      }
    }
    const serviceResponse = await consultationService.deleteConsultation(consultationId);
    return handleServiceResponse(serviceResponse, res);
  };

  // Get all consultations for a given caseId
  public getAllConsultations: RequestHandler = async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const serviceResponse = await consultationService.getAllConsultations(caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getAllConsultationsOnDay: RequestHandler = async (req: Request, res: Response) => {
    const fromDate = z.string().parse(req.params.fromDate);
    const toDate = z.string().parse(req.params.toDate);
    const serviceResponse = await consultationService.getAllConsultationsOnDay(fromDate, toDate);
    return handleServiceResponse(serviceResponse, res);
  };

  // Get a consultation by form access code
  public getConsultationByExternalCode: RequestHandler = async (req: Request, res: Response) => {
    const externalCode = z.string().parse(req.params.externalCode);
    const serviceResponse = await consultationService.getConsultationByExternalCode(externalCode);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const consultationController = new ConsultationController();
