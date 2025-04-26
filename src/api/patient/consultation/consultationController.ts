import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { consultationService } from "./consultationService";

class ConsultationController {
  // Create a new consultation
  public createConsultation: RequestHandler = async (req: Request, res: Response) => {
    const consultationData = req.body;
    const serviceResponse = await consultationService.createConsultation(consultationData);
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
    const serviceResponse = await consultationService.deleteConsultation(consultationId);
    return handleServiceResponse(serviceResponse, res);
  };

  // Get all consultations for a given patientId and caseId
  public getAllConsultations: RequestHandler = async (req: Request, res: Response) => {
    const { patientId, caseId } = req.params;
    const serviceResponse = await consultationService.getAllConsultations(patientId, caseId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const consultationController = new ConsultationController();
