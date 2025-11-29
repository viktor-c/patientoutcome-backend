import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";

import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { clinicalStudyService } from "./clinicalStudyService";

class ClinicalStudyController {
  public getClinicalStudies: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await clinicalStudyService.getClinicalStudies();
    return handleServiceResponse(serviceResponse, res);
  };

  public getClinicalStudyById: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const serviceResponse = await clinicalStudyService.getClinicalStudyById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  public createClinicalStudy: RequestHandler = async (req: Request, res: Response) => {
    const studyData = req.body;
    const serviceResponse = await clinicalStudyService.createClinicalStudy(studyData);
    return handleServiceResponse(serviceResponse, res);
  };

  public updateClinicalStudy: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const studyData = req.body;
    const serviceResponse = await clinicalStudyService.updateClinicalStudyById(id, studyData);
    return handleServiceResponse(serviceResponse, res);
  };

  public deleteClinicalStudy: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const serviceResponse = await clinicalStudyService.deleteClinicalStudyById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  public getClinicalStudiesBySupervisor: RequestHandler = async (req: Request, res: Response) => {
    const supervisorId = z.string().parse(req.params.supervisorId);
    const serviceResponse = await clinicalStudyService.getClinicalStudiesBySupervisor(supervisorId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getClinicalStudiesByStudyNurse: RequestHandler = async (req: Request, res: Response) => {
    const studyNurseId = z.string().parse(req.params.studyNurseId);
    const serviceResponse = await clinicalStudyService.getClinicalStudiesByStudyNurse(studyNurseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getClinicalStudiesByDiagnosis: RequestHandler = async (req: Request, res: Response) => {
    const diagnosis = z.string().parse(req.params.diagnosis);
    const serviceResponse = await clinicalStudyService.getClinicalStudiesByDiagnosis(diagnosis);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const clinicalStudyController = new ClinicalStudyController();
