import { log } from "node:console";
import { type UserContext, formService } from "@/api/form/formService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/common/utils/logger";
import type { Request, RequestHandler, Response } from "express";

/**
 * Form Controller
 * @class FormController
 * @description Handles HTTP requests for patient-reported outcome measure (PROM) form management
 */
class FormController {
  /**
   * Extract user context from session
   * @private
   * @param {Request} req - Express request with session data
   * @returns {UserContext} User context object with username, userId, and roles
   * @description Helper method to extract and structure user information from the session
   */
  private getUserContext(req: Request): UserContext {
    return {
      username: req.session?.username,
      userId: req.session?.userId,
      roles: req.session?.roles,
    };
  }
  /**
   * Get a form by ID
   * @route GET /form/:formId
   * @param {Request} req - Express request with formId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with form data or 404
   * @description Retrieves a single form with its data, completion status, and scoring
   */
  public getFormById: RequestHandler = async (req: Request, res: Response) => {
    const { formId } = req.params;
    const serviceResponse = await formService.getFormById(formId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all forms
   * @route GET /form
   * @param {Request} _req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of all forms
   * @description Retrieves all forms in the system
   */
  public getForms: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await formService.getAllForms();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Create a new form
   * @route POST /form
   * @access Authenticated users
   * @param {Request} req - Express request with form data in body and user context in session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created form or validation errors
   * @description Creates a new form instance with form data, tracking submission user and timestamps
   */
  public createForm: RequestHandler = async (req: Request, res: Response) => {
    const formData = req.body;
    const userContext = this.getUserContext(req);
    const serviceResponse = await formService.createForm(formData, userContext);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update a form
   * @route PUT /form/:formId
   * @access Authenticated users
   * @param {Request} req - Express request with formId in params, update data in body, user context in session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated form or errors
   * @description Updates form data, completion status, timing metrics, or scoring. Tracks last modified user.
   */
  public updateForm: RequestHandler = async (req: Request, res: Response) => {
    const { formId } = req.params;
    const updatedForm = req.body;

    // // Debug: Log what we received
    // console.debug("=== BACKEND CONTROLLER: Received data ===");
    // console.debug("formId:", formId);
    // console.debug("req.body type:", typeof req.body);
    // console.debug("req.body keys:", Object.keys(req.body));
    // console.debug("req.body:", JSON.stringify(req.body, null, 2));
    // console.debug("updatedForm:", JSON.stringify(updatedForm, null, 2));
    // console.debug("=========================================");

    const userContext = this.getUserContext(req);
    const serviceResponse = await formService.updateForm(formId, updatedForm, userContext);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete a form
   * @route DELETE /form/:formId
   * @param {Request} req - Express request with formId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion
   * @description Permanently deletes a form and its data
   */
  public deleteForm: RequestHandler = async (req: Request, res: Response) => {
    const { formId } = req.params;
    const serviceResponse = await formService.deleteForm(formId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Soft delete a form
   * @route POST /form/:formId/soft-delete
   * @access Doctor role or higher
   * @param {Request} req - Express request with formId in params and deletionReason in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with soft deleted form
   * @description Soft deletes a form by setting deletedAt timestamp and recording deletion reason
   */
  public softDeleteForm: RequestHandler = async (req: Request, res: Response) => {
    const { formId } = req.params;
    const { deletionReason } = req.body;
    
    if (!deletionReason || typeof deletionReason !== "string") {
      return res.status(400).json({
        success: false,
        message: "Deletion reason is required",
      });
    }

    const userContext = this.getUserContext(req);
    const serviceResponse = await formService.softDeleteForm(formId, deletionReason, userContext);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Restore a soft deleted form
   * @route POST /form/:formId/restore
   * @access Doctor role or higher
   * @param {Request} req - Express request with formId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with restored form
   * @description Restores a soft deleted form by clearing deletedAt timestamp
   */
  public restoreForm: RequestHandler = async (req: Request, res: Response) => {
    const { formId } = req.params;
    const userContext = this.getUserContext(req);
    const serviceResponse = await formService.restoreForm(formId, userContext);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all soft deleted forms with pagination
   * @route GET /form/deleted
   * @access Doctor role or higher
   * @param {Request} req - Express request with optional page and limit query params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with paginated deleted forms
   * @description Retrieves all soft deleted forms for admin review and restoration
   */
  public getDeletedForms: RequestHandler = async (req: Request, res: Response) => {
    const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10;
    
    const serviceResponse = await formService.getDeletedForms({ page, limit });
    return handleServiceResponse(serviceResponse, res);
  };
}

export const formController = new FormController();
