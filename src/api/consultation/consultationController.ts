import { codeService } from "@/api/code/codeService";
import { userService } from "@/api/user/userService";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { consultationService } from "./consultationService";

/**
 * Consultation Controller
 * @class ConsultationController
 * @description Handles HTTP requests for patient consultation management including creation, updates, and form access code linking
 */
class ConsultationController {
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
   * Validate that a user has the kiosk role
   * @private
   * @param {string} kioskId - User ID to validate
   * @returns {Promise<ServiceResponse<boolean>>} ServiceResponse indicating if user is a valid kiosk
   * @description Helper method to validate kiosk user assignments
   */
  private async validateKioskUser(kioskId: string): Promise<ServiceResponse<boolean>> {
    try {
      const userResponse = await userService.findById(kioskId);
      if (!userResponse.success || !userResponse.responseObject) {
        return ServiceResponse.failure("Kiosk user not found", false, StatusCodes.NOT_FOUND);
      }

      const user = userResponse.responseObject;
      if (!user.roles.includes("kiosk")) {
        return ServiceResponse.failure("User does not have kiosk role", false, StatusCodes.BAD_REQUEST);
      }

      return ServiceResponse.success("Kiosk user validated", true);
    } catch (error) {
      return ServiceResponse.failure("Error validating kiosk user", false, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Create a new consultation
   * @route POST /consultation/case/:caseId
   * @access Authenticated users
   * @param {Request} req - Express request with caseId in params, consultation data in body, userId in session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created consultation or validation errors
   * @description Creates a new consultation for a case. Validates kiosk users and form access codes. Auto-populates note createdBy fields.
   */
  public createConsultation: RequestHandler = async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const consultationData = req.body;

    // Validate kioskId if provided
    if (consultationData.kioskId) {
      const kioskValidation = await this.validateKioskUser(consultationData.kioskId);
      if (!kioskValidation.success) {
        return handleServiceResponse(kioskValidation, res);
      }
    }

    // Validate and replace formAccessCode with code ID if provided
    if (consultationData.formAccessCode) {
      const codeResponse = await codeService.getCode(consultationData.formAccessCode);
      if (!codeResponse.success || !codeResponse.responseObject) {
        return handleServiceResponse(ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND), res);
      }

      const code = codeResponse.responseObject;
      if (code.activatedOn) {
        return handleServiceResponse(
          ServiceResponse.failure("Code is already active", null, StatusCodes.CONFLICT),
          res,
        );
      }

      // Replace the code string with the code's ID
      consultationData.formAccessCode = code._id?.toString();
    }

    // If consultation has notes and createdBy is empty, use the logged-in user's ID
    if (consultationData.notes && req.session?.userId) {
      this.populateNotesCreatedBy(consultationData.notes, req.session.userId);
    }

    // Also check images for notes
    if (consultationData.images && req.session?.userId) {
      consultationData.images.forEach((image: any) => {
        if (image.notes) {
          this.populateNotesCreatedBy(image.notes, req.session.userId!);
        }
      });
    }

    const serviceResponse = await consultationService.createConsultation(caseId, consultationData);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a consultation by ID
   * @route GET /consultation/:consultationId
   * @param {Request} req - Express request with consultationId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with consultation details including forms or 404
   * @description Retrieves a single consultation with populated forms
   */
  public getConsultationById: RequestHandler = async (req: Request, res: Response) => {
    const consultationId = z.string().parse(req.params.consultationId);
    const serviceResponse = await consultationService.getConsultationById(consultationId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update a consultation
   * @route PUT /consultation/:consultationId
   * @access Authenticated users
   * @param {Request} req - Express request with consultationId in params, update data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated consultation or errors
   * @description Updates consultation details. Validates kiosk users and form access codes. Auto-populates new note createdBy fields.
   */
  public updateConsultation: RequestHandler = async (req: Request, res: Response) => {
    const consultationId = z.string().parse(req.params.consultationId);
    const consultationData = req.body;

    // Validate kioskId if provided
    if (consultationData.kioskId) {
      const kioskValidation = await this.validateKioskUser(consultationData.kioskId);
      if (!kioskValidation.success) {
        return handleServiceResponse(kioskValidation, res);
      }
    }

    // Validate and replace formAccessCode with code ID if provided
    if (consultationData.formAccessCode) {
      const codeResponse = await codeService.getCode(consultationData.formAccessCode);
      if (!codeResponse.success || !codeResponse.responseObject) {
        return handleServiceResponse(ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND), res);
      }

      const code = codeResponse.responseObject;
      if (code.activatedOn) {
        return handleServiceResponse(
          ServiceResponse.failure("Code is already active", null, StatusCodes.CONFLICT),
          res,
        );
      }

      // Replace the code string with the code's ID
      consultationData.formAccessCode = code._id?.toString();
    }

    // If consultation has notes and createdBy is empty, use the logged-in user's ID
    if (consultationData.notes && req.session?.userId) {
      this.populateNotesCreatedBy(consultationData.notes, req.session.userId);
    }

    // Also check images for notes
    if (consultationData.images && req.session?.userId) {
      consultationData.images.forEach((image: any) => {
        if (image.notes) {
          this.populateNotesCreatedBy(image.notes, req.session.userId!);
        }
      });
    }

    const serviceResponse = await consultationService.updateConsultation(consultationId, consultationData);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete a consultation
   * @route DELETE /consultation/:consultationId
   * @param {Request} req - Express request with consultationId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion
   * @description Permanently deletes a consultation and its associated form access code
   */
  public deleteConsultation: RequestHandler = async (req: Request, res: Response) => {
    const consultationId = z.string().parse(req.params.consultationId);
    // save form access code before deleting the consultation
    const formAccessCode = await consultationService.getFormAccessCode(consultationId);
    if (formAccessCode?.responseObject) {
      //first get code by internal id
      const fullCodeDocument = await codeService.getCode(formAccessCode.responseObject);
      if (fullCodeDocument.responseObject?._id) {
        // then delete the code
        // Note: This will delete the code from the database, which is expected behavior.
        await codeService.deleteCode(fullCodeDocument.responseObject._id.toString());
      }
    }
    const serviceResponse = await consultationService.deleteConsultation(consultationId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all consultations for a case
   * @route GET /consultation/case/:caseId
   * @param {Request} req - Express request with caseId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of consultations
   * @description Retrieves all consultations associated with a patient case
   */
  public getAllConsultations: RequestHandler = async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const serviceResponse = await consultationService.getAllConsultations(caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all consultations within a date range
   * @route GET /consultation/day/:fromDate/:toDate
   * @param {Request} req - Express request with fromDate and toDate in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with consultations scheduled in the date range
   * @description Retrieves consultations scheduled between fromDate and toDate
   */
  public getAllConsultationsOnDay: RequestHandler = async (req: Request, res: Response) => {
    const fromDate = z.string().parse(req.params.fromDate);
    const toDate = z.string().parse(req.params.toDate);
    const serviceResponse = await consultationService.getAllConsultationsOnDay(fromDate, toDate);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a consultation by form access code
   * @route GET /consultation/code/:code
   * @param {Request} req - Express request with code string in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with consultation details or 404
   * @description Retrieves a consultation associated with a specific form access code (for patient form filling)
   */
  public getConsultationByCode: RequestHandler = async (req: Request, res: Response) => {
    const code = z.string().parse(req.params.code);
    const serviceResponse = await consultationService.getConsultationByCode(code);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const consultationController = new ConsultationController();
