import type { NextFunction, Request, RequestHandler, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { SurgeryService } from "./surgeryService";

const service = new SurgeryService();

/**
 * Surgery Controller
 * @class SurgeryController
 * @description Handles HTTP requests for surgical procedure management within patient cases
 */
class SurgeryController {
  /**
   * Populate createdBy field for notes with current user ID
   * @private
   * @param {any[]} notes - Array of note objects
   * @param {string} userId - User ID to populate as createdBy
   * @returns {void}
   * @description Helper method to ensure all notes have a createdBy field set to the current user
   */
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

  /**
   * Get all surgeries
   * @route GET /surgeries
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of all surgeries with populated surgeons
   * @description Retrieves all surgical procedures in the system
   */
  public getAllSurgeries: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await service.getAllSurgeries();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a surgery by ID
   * @route GET /surgery/:surgeryId
   * @param {Request} req - Express request with surgeryId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with surgery details or 404
   * @description Retrieves a single surgery with populated relationships
   */
  public getSurgeryById: RequestHandler = async (req: Request, res: Response) => {
    const surgeryId = req.params.surgeryId;
    const serviceResponse = await service.getSurgeryById(surgeryId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all surgeries for a patient case
   * @route GET /surgery/case/:patientCaseId
   * @param {Request} req - Express request with patientCaseId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of surgeries for the case
   * @description Retrieves all surgical procedures associated with a patient case
   */
  public getSurgeriesByPatientCaseId: RequestHandler = async (req: Request, res: Response) => {
    const patientCaseId = req.params.patientCaseId;
    const serviceResponse = await service.getSurgeriesByPatientCaseId(patientCaseId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Search surgeries by external patient ID
   * @route GET /surgery/search/:searchQuery
   * @param {Request} req - Express request with searchQuery in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with matching surgeries
   * @description Searches for surgeries by external patient ID, sanitizing input to remove special characters
   */
  public searchSurgeriesByExternalId: RequestHandler = async (req: Request, res: Response) => {
    const searchQuery = req.params.searchQuery;
    // Remove all special characters from the search query
    const sanitizedSearchQuery = searchQuery.replace(/[^a-zA-Z0-9]/g, "");
    const serviceResponse = await service.searchSurgeriesByExternalId(sanitizedSearchQuery);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Create a new surgery
   * @route POST /surgery
   * @access Authenticated users
   * @param {Request} req - Express request with surgery data in body, userId in session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created surgery or validation errors
   * @description Creates a new surgical procedure record. Auto-populates note createdBy fields with current user.
   */
  public createSurgery: RequestHandler = async (req: Request, res: Response) => {
    const surgeryData = req.body;

    // If surgery has additionalData (notes) and createdBy is empty, use the logged-in user's ID
    if (surgeryData.additionalData && req.session?.userId) {
      this.populateNotesCreatedBy(surgeryData.additionalData, req.session.userId);
    }

    const serviceResponse = await service.createSurgery(surgeryData);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update a surgery
   * @route PUT /surgery/:surgeryId
   * @access Authenticated users
   * @param {Request} req - Express request with surgeryId in params, update data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated surgery or errors
   * @description Updates surgery details. Auto-populates new note createdBy fields with current user.
   */
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

  /**
   * Delete a surgery
   * @route DELETE /surgery/:surgeryId
   * @param {Request} req - Express request with surgeryId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion
   * @description Permanently deletes a surgical procedure
   */
  public deleteSurgeryById: RequestHandler = async (req: Request, res: Response) => {
    const surgeryId = z.string().parse(req.params.surgeryId);
    const serviceResponse = await service.deleteSurgeryById(surgeryId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get surgeries by diagnosis name
   * @route GET /surgery/diagnosis/:diagnosis
   * @param {Request} req - Express request with diagnosis in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with matching surgeries
   * @description Searches for surgeries by diagnosis name (text match)
   */
  public getSurgeriesByDiagnosis: RequestHandler = async (req: Request, res: Response) => {
    const diagnosis = z.string().parse(req.params.diagnosis);
    const serviceResponse = await service.getSurgeriesByDiagnosis(diagnosis);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get surgeries by ICD-10 diagnosis code
   * @route GET /surgery/diagnosisICD10/:diagnosisICD10
   * @param {Request} req - Express request with diagnosisICD10 in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with matching surgeries
   * @description Searches for surgeries by ICD-10 diagnosis code (exact match)
   */
  public getSurgeriesByDiagnosisICD10: RequestHandler = async (req: Request, res: Response) => {
    const diagnosisICD10 = z.string().parse(req.params.diagnosisICD10);
    const serviceResponse = await service.getSurgeriesByDiagnosisICD10(diagnosisICD10);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get surgeries by surgeon ID
   * @route GET /surgery/surgeon/:surgeonId
   * @param {Request} req - Express request with surgeonId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with surgeries performed by the surgeon
   * @description Retrieves all surgeries where the user is assigned as a surgeon
   */
  public getSurgeriesBySurgeon: RequestHandler = async (req: Request, res: Response) => {
    const surgeonId = z.string().parse(req.params.surgeonId);
    const serviceResponse = await service.getSurgeriesBySurgeon(surgeonId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all surgeons for a surgery
   * @route GET /surgery/:surgeryId/surgeons
   * @param {Request} req - Express request with surgeryId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of surgeons
   * @description Retrieves all users assigned as surgeons for a surgical procedure
   */
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
