import type { NextFunction, Request, RequestHandler, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { PatientCaseService } from "./patientCaseService";

const service = new PatientCaseService();

class PatientCaseController {
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

  public getAllPatientCases: RequestHandler = async (req: Request, res: Response) => {
    const patientId = req.params.patientId;
    const serviceResponse = await service.getAllPatientCases(patientId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getPatientCaseById: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await service.getPatientCaseById(req.params.patientId, req.params.caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public searchCasesByExternalId: RequestHandler = async (req: Request, res: Response) => {
    const searchQuery = req.params.searchQuery;
    //remove all special characters from the search query
    const sanitizedSearchQuery = searchQuery.replace(/[^a-zA-Z0-9]/g, "");
    const serviceResponse = await service.searchCasesByExternalId(sanitizedSearchQuery);
    return handleServiceResponse(serviceResponse, res);
  };

  public createPatientCase: RequestHandler = async (req: Request, res: Response) => {
    const patientId = req.params.patientId;
    const caseData = req.body;

    // If case has notes and createdBy is empty, use the logged-in user's ID
    if (caseData.notes && req.session?.userId) {
      this.populateNotesCreatedBy(caseData.notes, req.session.userId);
    }

    // If case has additionalData (which are also notes) and createdBy is empty, use the logged-in user's ID
    if (caseData.additionalData && req.session?.userId) {
      this.populateNotesCreatedBy(caseData.additionalData, req.session.userId);
    }

    const serviceResponse = await service.createPatientCase(patientId, caseData);
    return handleServiceResponse(serviceResponse, res);
  };

  public updatePatientCaseById: RequestHandler = async (req: Request, res: Response) => {
    const patientId = z.string().parse(req.params.patientId);
    const caseId = z.string().parse(req.params.caseId);
    const caseData = req.body;

    // If case has notes and createdBy is empty, use the logged-in user's ID
    if (caseData.notes && req.session?.userId) {
      this.populateNotesCreatedBy(caseData.notes, req.session.userId);
    }

    // If case has additionalData (which are also notes) and createdBy is empty, use the logged-in user's ID
    if (caseData.additionalData && req.session?.userId) {
      this.populateNotesCreatedBy(caseData.additionalData, req.session.userId);
    }

    const serviceResponse = await service.updatePatientCaseById(patientId, caseId, caseData);
    return handleServiceResponse(serviceResponse, res);
  };

  public deletePatientCaseById: RequestHandler = async (req: Request, res: Response) => {
    const patientId = z.string().parse(req.params.patientId);
    const caseId = z.string().parse(req.params.caseId);
    const serviceResponse = await service.deletePatientCaseById(patientId, caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getNotesByCaseId: RequestHandler = async (req: Request, res: Response) => {
    const caseId = z.string().parse(req.params.caseId);
    const serviceResponse = await service.getNotesByCaseId(caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public createPatientCaseNote: RequestHandler = async (req: Request, res: Response) => {
    const caseId = z.string().parse(req.params.caseId);
    const noteData = req.body;

    // Generate a new ObjectId for the note if not provided
    if (!noteData._id) {
      noteData._id = new mongoose.Types.ObjectId();
    }

    // If createdBy is empty or not provided, use the logged-in user's ID
    if (!noteData.createdBy && req.session?.userId) {
      noteData.createdBy = new mongoose.Types.ObjectId(req.session.userId);
    }

    const serviceResponse = await service.createPatientCaseNote(caseId, noteData);
    return handleServiceResponse(serviceResponse, res);
  };

  public deletePatientCaseNoteById: RequestHandler = async (req: Request, res: Response) => {
    const patientId = z.string().parse(req.params.patientId);
    const caseId = z.string().parse(req.params.caseId);
    const noteId = z.string().parse(req.params.noteId);
    const serviceResponse = await service.deletePatientCaseNoteById(caseId, noteId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getCasesByDiagnosis: RequestHandler = async (req: Request, res: Response) => {
    const diagnosis = z.string().parse(req.params.diagnosis);
    const serviceResponse = await service.getCasesByDiagnosis(diagnosis);
    return handleServiceResponse(serviceResponse, res);
  };

  public getCasesByDiagnosisICD10: RequestHandler = async (req: Request, res: Response) => {
    const diagnosisICD10 = z.string().parse(req.params.diagnosisICD10);
    const serviceResponse = await service.getCasesByDiagnosisICD10(diagnosisICD10);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSupervisorsByCaseId: RequestHandler = async (req: Request, res: Response) => {
    const caseId = z.string().parse(req.params.caseId);
    const serviceResponse = await service.getSupervisorsByCaseId(caseId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const patientCaseController = new PatientCaseController();
