import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";

import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { clinicalStudyService } from "./clinicalStudyService";

/**
 * Clinical Study Controller
 * @class ClinicalStudyController
 * @description Handles HTTP requests for clinical research study management
 */
class ClinicalStudyController {
  /**
   * Get all clinical studies
   * @route GET /clinicalstudy
   * @param {Request} _req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of all clinical studies with populated users
   * @description Retrieves all clinical studies including study nurses and supervisors
   */
  public getClinicalStudies: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await clinicalStudyService.getClinicalStudies();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a clinical study by ID
   * @route GET /clinicalstudy/:id
   * @param {Request} req - Express request with study ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with clinical study details or 404
   * @description Retrieves a single clinical study with populated relationships
   */
  public getClinicalStudyById: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const serviceResponse = await clinicalStudyService.getClinicalStudyById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Create a new clinical study
   * @route POST /clinicalstudy
   * @param {Request} req - Express request with study data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created study or validation errors
   * @description Creates a new clinical research study
   */
  public createClinicalStudy: RequestHandler = async (req: Request, res: Response) => {
    const studyData = req.body;
    const serviceResponse = await clinicalStudyService.createClinicalStudy(studyData);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update a clinical study
   * @route PUT /clinicalstudy/:id
   * @param {Request} req - Express request with study ID in params and update data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated study or 404
   * @description Updates an existing clinical study. Only modified fields need to be provided.
   */
  public updateClinicalStudy: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const studyData = req.body;
    const serviceResponse = await clinicalStudyService.updateClinicalStudyById(id, studyData);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete a clinical study
   * @route DELETE /clinicalstudy/:id
   * @param {Request} req - Express request with study ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion or 404
   * @description Permanently deletes a clinical study
   */
  public deleteClinicalStudy: RequestHandler = async (req: Request, res: Response) => {
    const id = z.string().parse(req.params.id);
    const serviceResponse = await clinicalStudyService.deleteClinicalStudyById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get clinical studies by supervisor ID
   * @route GET /clinicalstudy/supervisor/:supervisorId
   * @param {Request} req - Express request with supervisorId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with studies supervised by the specified user
   * @description Retrieves all studies where the user is assigned as a supervisor
   */
  public getClinicalStudiesBySupervisor: RequestHandler = async (req: Request, res: Response) => {
    const supervisorId = z.string().parse(req.params.supervisorId);
    const serviceResponse = await clinicalStudyService.getClinicalStudiesBySupervisor(supervisorId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get clinical studies by study nurse ID
   * @route GET /clinicalstudy/studynurse/:studyNurseId
   * @param {Request} req - Express request with studyNurseId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with studies assigned to the specified study nurse
   * @description Retrieves all studies where the user is assigned as a study nurse
   */
  public getClinicalStudiesByStudyNurse: RequestHandler = async (req: Request, res: Response) => {
    const studyNurseId = z.string().parse(req.params.studyNurseId);
    const serviceResponse = await clinicalStudyService.getClinicalStudiesByStudyNurse(studyNurseId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get clinical studies by diagnosis
   * @route GET /clinicalstudy/diagnosis/:diagnosis
   * @param {Request} req - Express request with diagnosis in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with studies matching the diagnosis
   * @description Searches for studies associated with a specific diagnosis
   */
  public getClinicalStudiesByDiagnosis: RequestHandler = async (req: Request, res: Response) => {
    const diagnosis = z.string().parse(req.params.diagnosis);
    const serviceResponse = await clinicalStudyService.getClinicalStudiesByDiagnosis(diagnosis);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const clinicalStudyController = new ClinicalStudyController();
