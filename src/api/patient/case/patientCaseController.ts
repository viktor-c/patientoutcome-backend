import type { Request, RequestHandler, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { handleServiceResponse } from "../../../common/utils/httpHandlers";
import { PatientCaseService } from "./patientCaseService";

const service = new PatientCaseService();

class PatientCaseController {
  public getAllPatientCases: RequestHandler = async (req: Request, res: Response) => {
    const patientId = req.params.patientId;
    const serviceResponse = await service.getAllPatientCases(patientId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getPatientCaseById: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await service.getPatientCaseById(req.params.patientId, req.params.caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public createPatientCase: RequestHandler = async (req: Request, res: Response) => {
    const patientId = req.params.patientId;
    const caseData = req.body;
    const serviceResponse = await service.createPatientCase(patientId, caseData);
    return handleServiceResponse(serviceResponse, res);
  };

  public updatePatientCaseById: RequestHandler = async (req: Request, res: Response) => {
    const patientId = z.string().parse(req.params.patientId);
    const caseId = z.string().parse(req.params.caseId);
    const caseData = req.body;
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
    noteData._id = new mongoose.Types.ObjectId();
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

  public getSurgeonsByCaseId: RequestHandler = async (req: Request, res: Response) => {
    const caseId = z.string().parse(req.params.caseId);
    const serviceResponse = await service.getSurgeonsByCaseId(caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSupervisorsByCaseId: RequestHandler = async (req: Request, res: Response) => {
    const caseId = z.string().parse(req.params.caseId);
    const serviceResponse = await service.getSupervisorsByCaseId(caseId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const patientCaseController = new PatientCaseController();
