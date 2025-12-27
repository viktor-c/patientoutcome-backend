import type { NextFunction, Request, RequestHandler, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { handleServiceResponse } from "../../common/utils/httpHandlers";
import { PatientCaseService } from "./patientCaseService";

const service = new PatientCaseService();

/**
 * Patient Case Controller
 * @class PatientCaseController
 * @description Handles HTTP requests for patient case management including CRUD operations, notes, and case queries
 */
class PatientCaseController {
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
   * Get all patient cases for a specific patient
   * @route GET /patient/:patientId/cases
   * @param {Request} req - Express request with patientId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of patient cases
   * @description Retrieves all cases associated with a patient, including populated surgeries, supervisors, and consultations
   */
  public getAllPatientCases: RequestHandler = async (req: Request, res: Response) => {
    const patientId = req.params.patientId;
    const serviceResponse = await service.getAllPatientCases(patientId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a specific patient case by ID
   * @route GET /patient/:patientId/case/:caseId
   * @param {Request} req - Express request with patientId and caseId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with patient case details or 404
   * @description Retrieves a single patient case with all populated relationships
   */
  public getPatientCaseById: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await service.getPatientCaseById(req.params.patientId, req.params.caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Search cases by external patient ID
   * @route GET /case/search/:searchQuery
   * @param {Request} req - Express request with searchQuery in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with matching cases
   * @description Searches for cases by external patient ID, sanitizing input to remove special characters
   */
  public searchCasesByExternalId: RequestHandler = async (req: Request, res: Response) => {
    const searchQuery = req.params.searchQuery;
    //remove all special characters from the search query
    const sanitizedSearchQuery = searchQuery.replace(/[^a-zA-Z0-9]/g, "");
    const serviceResponse = await service.searchCasesByExternalId(sanitizedSearchQuery);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Create a new patient case
   * @route POST /patient/:patientId/case
   * @access Authenticated users
   * @param {Request} req - Express request with patientId in params, case data in body, userId in session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created case or validation errors
   * @description Creates a new case for a patient. Auto-populates note createdBy fields with current user.
   */
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

  /**
   * Update an existing patient case
   * @route PUT /patient/:patientId/case/:caseId
   * @access Authenticated users
   * @param {Request} req - Express request with patientId and caseId in params, update data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated case or errors
   * @description Updates case details. Auto-populates new note createdBy fields with current user.
   */
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

  /**
   * Delete a patient case
   * @route DELETE /patient/:patientId/case/:caseId
   * @param {Request} req - Express request with patientId and caseId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion or 404
   * @description Permanently deletes a patient case
   */
  public deletePatientCaseById: RequestHandler = async (req: Request, res: Response) => {
    const patientId = z.string().parse(req.params.patientId);
    const caseId = z.string().parse(req.params.caseId);
    const serviceResponse = await service.deletePatientCaseById(patientId, caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all notes for a specific case
   * @route GET /case/:caseId/notes
   * @param {Request} req - Express request with caseId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of notes
   * @description Retrieves all notes (including additionalData notes) associated with a case
   */
  public getNotesByCaseId: RequestHandler = async (req: Request, res: Response) => {
    const caseId = z.string().parse(req.params.caseId);
    const serviceResponse = await service.getNotesByCaseId(caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Create a new note for a case
   * @route POST /case/:caseId/note
   * @access Authenticated users
   * @param {Request} req - Express request with caseId in params, note data in body, userId in session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created note
   * @description Adds a new note to a case. Auto-generates ObjectId and populates createdBy with current user.
   */
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

  /**
   * Delete a note from a case
   * @route DELETE /patient/:patientId/case/:caseId/note/:noteId
   * @param {Request} req - Express request with patientId, caseId, and noteId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion
   * @description Removes a specific note from a case
   */
  public deletePatientCaseNoteById: RequestHandler = async (req: Request, res: Response) => {
    const patientId = z.string().parse(req.params.patientId);
    const caseId = z.string().parse(req.params.caseId);
    const noteId = z.string().parse(req.params.noteId);
    const serviceResponse = await service.deletePatientCaseNoteById(caseId, noteId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all cases by diagnosis name
   * @route GET /case/diagnosis/:diagnosis
   * @param {Request} req - Express request with diagnosis in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with matching cases
   * @description Searches for cases by diagnosis name (text match)
   */
  public getCasesByDiagnosis: RequestHandler = async (req: Request, res: Response) => {
    const diagnosis = z.string().parse(req.params.diagnosis);
    const serviceResponse = await service.getCasesByDiagnosis(diagnosis);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all cases by ICD-10 diagnosis code
   * @route GET /case/diagnosisICD10/:diagnosisICD10
   * @param {Request} req - Express request with diagnosisICD10 in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with matching cases
   * @description Searches for cases by ICD-10 diagnosis code (exact match)
   */
  public getCasesByDiagnosisICD10: RequestHandler = async (req: Request, res: Response) => {
    const diagnosisICD10 = z.string().parse(req.params.diagnosisICD10);
    const serviceResponse = await service.getCasesByDiagnosisICD10(diagnosisICD10);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all supervisors for a specific case
   * @route GET /case/:caseId/supervisors
   * @param {Request} req - Express request with caseId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of supervisors
   * @description Retrieves all users assigned as supervisors for a case
   */
  public getSupervisorsByCaseId: RequestHandler = async (req: Request, res: Response) => {
    const caseId = z.string().parse(req.params.caseId);
    const serviceResponse = await service.getSupervisorsByCaseId(caseId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const patientCaseController = new PatientCaseController();
