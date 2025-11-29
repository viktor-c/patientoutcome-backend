import { patientService } from "@/api/patient/patientService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";

class PatientController {
  public getPatients: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await patientService.findAll();
    return handleServiceResponse(serviceResponse, res);
  };

  public getPatient: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await patientService.findById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  public getPatientByExternalId: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await patientService.findByExternalId(id);
    return handleServiceResponse(serviceResponse, res);
  };

  public findPatientsByExternalId: RequestHandler = async (req: Request, res: Response) => {
    const { searchQuery } = req.params;
    const serviceResponse = await patientService.searchByExternalId(searchQuery);
    return handleServiceResponse(serviceResponse, res);
  };

  public createPatient: RequestHandler = async (req: Request, res: Response) => {
    const patientData = req.body;
    const serviceResponse = await patientService.createPatient(patientData);
    return handleServiceResponse(serviceResponse, res);
  };

  public updatePatient: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const patientData = req.body;
    const serviceResponse = await patientService.updatePatient(id, patientData);
    return handleServiceResponse(serviceResponse, res);
  };

  public deletePatient: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await patientService.deletePatient(id);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const patientController = new PatientController();
