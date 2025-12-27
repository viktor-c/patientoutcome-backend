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
}

export const formController = new FormController();
