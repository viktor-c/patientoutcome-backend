import type { NextFunction, Request, RequestHandler, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { SurgeryService } from "./surgeryService";

const service = new SurgeryService();

class SurgeryController {
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

  public getAllSurgeries: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await service.getAllSurgeries();
    return handleServiceResponse(serviceResponse, res);
  };

  public getSurgeryById: RequestHandler = async (req: Request, res: Response) => {
    const surgeryId = req.params.surgeryId;
    const serviceResponse = await service.getSurgeryById(surgeryId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSurgeriesByPatientCaseId: RequestHandler = async (req: Request, res: Response) => {
    const patientCaseId = req.params.patientCaseId;
    const serviceResponse = await service.getSurgeriesByPatientCaseId(patientCaseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public searchSurgeriesByExternalId: RequestHandler = async (req: Request, res: Response) => {
    const searchQuery = req.params.searchQuery;
    // Remove all special characters from the search query
    const sanitizedSearchQuery = searchQuery.replace(/[^a-zA-Z0-9]/g, "");
    const serviceResponse = await service.searchSurgeriesByExternalId(sanitizedSearchQuery);
    return handleServiceResponse(serviceResponse, res);
  };

  public createSurgery: RequestHandler = async (req: Request, res: Response) => {
    const surgeryData = req.body;

    // If surgery has additionalData (notes) and createdBy is empty, use the logged-in user's ID
    if (surgeryData.additionalData && req.session?.userId) {
      this.populateNotesCreatedBy(surgeryData.additionalData, req.session.userId);
    }

    const serviceResponse = await service.createSurgery(surgeryData);
    return handleServiceResponse(serviceResponse, res);
  };

  public updateSurgeryById: RequestHandler = async (req: Request, res: Response) => {
    const surgeryId = z.string().parse(req.params.surgeryId);
    const surgeryData = req.body;

    // If surgery has additionalData (notes) and createdBy is empty, use the logged-in user's ID
    if (surgeryData.additionalData && req.session?.userId) {
      this.populateNotesCreatedBy(surgeryData.additionalData, req.session.userId);
    }

    const serviceResponse = await service.updateSurgeryById(surgeryId, surgeryData);
    return handleServiceResponse(serviceResponse, res);
  };

  public deleteSurgeryById: RequestHandler = async (req: Request, res: Response) => {
    const surgeryId = z.string().parse(req.params.surgeryId);
    const serviceResponse = await service.deleteSurgeryById(surgeryId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSurgeriesByDiagnosis: RequestHandler = async (req: Request, res: Response) => {
    const diagnosis = z.string().parse(req.params.diagnosis);
    const serviceResponse = await service.getSurgeriesByDiagnosis(diagnosis);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSurgeriesByDiagnosisICD10: RequestHandler = async (req: Request, res: Response) => {
    const diagnosisICD10 = z.string().parse(req.params.diagnosisICD10);
    const serviceResponse = await service.getSurgeriesByDiagnosisICD10(diagnosisICD10);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSurgeriesBySurgeon: RequestHandler = async (req: Request, res: Response) => {
    const surgeonId = z.string().parse(req.params.surgeonId);
    const serviceResponse = await service.getSurgeriesBySurgeon(surgeonId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSurgeonsBySurgeryId: RequestHandler = async (req: Request, res: Response) => {
    const surgeryId = z.string().parse(req.params.surgeryId);
    const serviceResponse = await service.getSurgeonsBySurgeryId(surgeryId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getNotesBySurgeryId: RequestHandler = async (req: Request, res: Response) => {
    const surgeryId = z.string().parse(req.params.surgeryId);
    const serviceResponse = await service.getNotesBySurgeryId(surgeryId);
    return handleServiceResponse(serviceResponse, res);
  };

  public createSurgeryNote: RequestHandler = async (req: Request, res: Response) => {
    const surgeryId = z.string().parse(req.params.surgeryId);
    const noteData = req.body;

    // Generate a new ObjectId for the note if not provided
    if (!noteData._id) {
      noteData._id = new mongoose.Types.ObjectId();
    }

    // If createdBy is empty or not provided, use the logged-in user's ID
    if (!noteData.createdBy && req.session?.userId) {
      noteData.createdBy = new mongoose.Types.ObjectId(req.session.userId);
    }

    const serviceResponse = await service.createSurgeryNote(surgeryId, noteData);
    return handleServiceResponse(serviceResponse, res);
  };

  public deleteSurgeryNoteById: RequestHandler = async (req: Request, res: Response) => {
    const surgeryId = z.string().parse(req.params.surgeryId);
    const noteId = z.string().parse(req.params.noteId);
    const serviceResponse = await service.deleteSurgeryNoteById(surgeryId, noteId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSurgeriesByDateRange: RequestHandler = async (req: Request, res: Response) => {
    const startDate = new Date(req.params.startDate);
    const endDate = new Date(req.params.endDate);
    const serviceResponse = await service.getSurgeriesByDateRange(startDate, endDate);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSurgeriesBySide: RequestHandler = async (req: Request, res: Response) => {
    const side = z.enum(["left", "right", "none"]).parse(req.params.side);
    const serviceResponse = await service.getSurgeriesBySide(side);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSurgeriesByTherapy: RequestHandler = async (req: Request, res: Response) => {
    const therapy = z.string().parse(req.params.therapy);
    const serviceResponse = await service.getSurgeriesByTherapy(therapy);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const surgeryController = new SurgeryController();
