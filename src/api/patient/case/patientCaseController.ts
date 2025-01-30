import type { Request, RequestHandler, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { handleServiceResponse } from "../../../common/utils/httpHandlers";
import { PatientCaseService } from "./patientCaseService";

const service = new PatientCaseService();

class PatientCaseController {
  public getAllCases: RequestHandler = async (req: Request, res: Response) => {
    const patientId = req.params.patientId;
    const serviceResponse = await service.getAllCases(patientId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getCaseById: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await service.getCaseById(req.params.patientId, req.params.caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public createCase: RequestHandler = async (req: Request, res: Response) => {
    const patientId = req.params.patientId;
    const caseData = req.body;
    const serviceResponse = await service.createCase(patientId, caseData);
    return handleServiceResponse(serviceResponse, res);
  };

  public updateCase: RequestHandler = async (req: Request, res: Response) => {
    const patientId = z.string().parse(req.params.patientId);
    const caseId = z.string().parse(req.params.caseId);
    const caseData = req.body;
    const serviceResponse = await service.updateCase(patientId, caseId, caseData);
    return handleServiceResponse(serviceResponse, res);
  };

  public deleteCaseById: RequestHandler = async (req: Request, res: Response) => {
    const patientId = z.string().parse(req.params.patientId);
    const caseId = z.string().parse(req.params.caseId);
    const serviceResponse = await service.deleteCaseById(patientId, caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getNotesByCaseId: RequestHandler = async (req: Request, res: Response) => {
    const caseId = z.string().parse(req.params.caseId);
    const serviceResponse = await service.getNotesByCaseId(caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public addNoteToCase: RequestHandler = async (req: Request, res: Response) => {
    const caseId = z.string().parse(req.params.caseId);
    const noteData = req.body;
    noteData._id = new mongoose.Types.ObjectId();
    const serviceResponse = await service.addNoteToCase(caseId, noteData);
    return handleServiceResponse(serviceResponse, res);
  };

  public deleteNoteFromCase: RequestHandler = async (req: Request, res: Response) => {
    const patientId = z.string().parse(req.params.patientId);
    const caseId = z.string().parse(req.params.caseId);
    const noteId = z.string().parse(req.params.noteId);
    const serviceResponse = await service.deleteNoteFromCase(caseId, noteId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getDiagnosis: RequestHandler = async (req: Request, res: Response) => {
    const diagnosis = z.string().parse(req.params.diagnosis);
    const serviceResponse = await service.getCasesByDiagnosis(diagnosis);
    return handleServiceResponse(serviceResponse, res);
  };

  public getDiagnosisICD10: RequestHandler = async (req: Request, res: Response) => {
    const diagnosisICD10 = z.string().parse(req.params.diagnosisICD10);
    const serviceResponse = await service.getCasesByDiagnosisICD10(diagnosisICD10);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSurgeons: RequestHandler = async (req: Request, res: Response) => {
    const surgeonId = z.string().parse(req.params.surgeonId);
    const serviceResponse = await service.getCasesBySurgeon(surgeonId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getSupervisors: RequestHandler = async (req: Request, res: Response) => {
    const supervisorId = z.string().parse(req.params.supervisorId);
    const serviceResponse = await service.getCasesBySupervisor(supervisorId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const patientCaseController = new PatientCaseController();
