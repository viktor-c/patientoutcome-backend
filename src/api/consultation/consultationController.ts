import { codeService } from "@/api/code/codeService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { consultationService } from "./consultationService";

class ConsultationController {
  // Helper method to populate createdBy field for notes
  private populateNotesCreatedBy(notes: any[], userId: string): void {
    if (Array.isArray(notes)) {
      notes.forEach((note) => {
        if (!note.createdBy) {
          // Ensure the userId is converted to a proper ObjectId if needed
          note.createdBy = new mongoose.Types.ObjectId(userId);
        }
      });
    }
  }

  // Create a new consultation
  public createConsultation: RequestHandler = async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const consultationData = req.body;

    // If consultation has notes and createdBy is empty, use the logged-in user's ID
    if (consultationData.notes && req.session?.userId) {
      this.populateNotesCreatedBy(consultationData.notes, req.session.userId);
    }

    // Also check images for notes
    if (consultationData.images && req.session?.userId) {
      consultationData.images.forEach((image: any) => {
        if (image.notes) {
          this.populateNotesCreatedBy(image.notes, req.session.userId!);
        }
      });
    }

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

    // If consultation has notes and createdBy is empty, use the logged-in user's ID
    if (consultationData.notes && req.session?.userId) {
      this.populateNotesCreatedBy(consultationData.notes, req.session.userId);
    }

    // Also check images for notes
    if (consultationData.images && req.session?.userId) {
      consultationData.images.forEach((image: any) => {
        if (image.notes) {
          this.populateNotesCreatedBy(image.notes, req.session.userId!);
        }
      });
    }

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
  public getConsultationByCode: RequestHandler = async (req: Request, res: Response) => {
    const code = z.string().parse(req.params.code);
    const serviceResponse = await consultationService.getConsultationByCode(code);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const consultationController = new ConsultationController();
