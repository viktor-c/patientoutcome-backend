import { patientService } from "@/api/patient/patientService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";

/**
 * Patient Controller
 * @class PatientController
 * @description Handles HTTP requests for patient record management including demographics and case associations
 */
class PatientController {
  /**
   * Get all patients with pagination
   * @route GET /patient
   * @param {Request} req - Express request object with optional query params: page, limit, includeDeleted
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with paginated patient list
   * @description Retrieves all patients with pagination, including their associated cases
   */
  public getPatients: RequestHandler = async (req: Request, res: Response) => {
    const { page, limit, includeDeleted } = req.query;

    const options = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      includeDeleted: includeDeleted === 'true',
    };

    const serviceResponse = await patientService.findAll(options);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a patient by database ID
   * @route GET /patient/:id
   * @param {Request} req - Express request with patient ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with patient details or 404
   * @description Retrieves a single patient by MongoDB ObjectId with populated cases
   */
  public getPatient: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await patientService.findById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a patient by external ID (exact match)
   * @route GET /patient/externalId/:id
   * @param {Request} req - Express request with external ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with patient details or 404
   * @description Retrieves a patient by their external system identifier
   */
  public getPatientByExternalId: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await patientService.findByExternalId(id);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Search patients by external ID (partial match)
   * @route GET /patient/search/:searchQuery
   * @param {Request} req - Express request with searchQuery in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with matching patients
   * @description Searches for patients by external ID using partial text matching
   */
  public findPatientsByExternalId: RequestHandler = async (req: Request, res: Response) => {
    const { searchQuery } = req.params;
    const serviceResponse = await patientService.searchByExternalId(searchQuery);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Create a new patient
   * @route POST /patient
   * @param {Request} req - Express request with patient data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created patient or validation errors
   * @description Creates a new patient record with demographics and external ID
   */
  public createPatient: RequestHandler = async (req: Request, res: Response) => {
    const patientData = req.body;
    const userId = req.session?.userId;
    const serviceResponse = await patientService.createPatient(patientData, userId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update a patient
   * @route PUT /patient/:id
   * @param {Request} req - Express request with patient ID in params and update data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated patient or errors
   * @description Updates patient demographics or external ID
   */
  public updatePatient: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const patientData = req.body;
    const serviceResponse = await patientService.updatePatient(id, patientData);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete a patient
   * @route DELETE /patient/:id
   * @param {Request} req - Express request with patient ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion
   * @description Permanently deletes a patient and all associated records
   */
  public deletePatient: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await patientService.deletePatient(id);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Soft delete a patient
   * @route POST /patient/:id/soft-delete
   * @param {Request} req - Express request with patient ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming soft deletion
   * @description Soft deletes a patient by setting deletedAt timestamp
   */
  public softDeletePatient: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await patientService.softDeletePatient(id);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Soft delete multiple patients
   * @route POST /patient/soft-delete
   * @param {Request} req - Express request with array of patient IDs in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming soft deletion
   * @description Soft deletes multiple patients
   */
  public softDeletePatients: RequestHandler = async (req: Request, res: Response) => {
    const { patientIds } = req.body;
    const serviceResponse = await patientService.softDeletePatients(patientIds);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Restore a soft deleted patient
   * @route POST /patient/:id/restore
   * @param {Request} req - Express request with patient ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming restoration
   * @description Restores a soft deleted patient
   */
  public restorePatient: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await patientService.restorePatient(id);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all soft deleted patients
   * @route GET /patient/deleted
   * @param {Request} req - Express request object with optional query params: page, limit
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with paginated list of deleted patients
   * @description Retrieves all soft deleted patients with pagination
   */
  public getDeletedPatients: RequestHandler = async (req: Request, res: Response) => {
    const { page, limit } = req.query;

    const options = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    const serviceResponse = await patientService.findAllDeleted(options);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const patientController = new PatientController();
