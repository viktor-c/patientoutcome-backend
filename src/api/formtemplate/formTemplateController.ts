import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";
import { formTemplateService } from "./formTemplateService";

/**
 * Form Template Controller
 * @class FormTemplateController
 * @description Handles HTTP requests for form template (questionnaire structure) management
 */
class FormTemplateController {
  /**
   * Get all form templates
   * @route GET /formtemplate
   * @param {Request} _req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of all form templates
   * @description Retrieves all form templates including active and inactive ones
   */
  public getFormTemplates: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.getFormTemplates();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a form template by ID
   * @route GET /formtemplate/:templateId
   * @param {Request} req - Express request with templateId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with template details or 404
   * @description Retrieves a single form template with full structure and scoring logic
   */
  public getFormTemplateById: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.getFormTemplateById(req.params.templateId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a shortlist of active form templates
   * @route GET /formtemplate/shortlist
   * @param {Request} _req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of active templates (name and ID only)
   * @description Retrieves simplified list of active templates for dropdown/selection purposes
   */
  public getFormTemplatesShortlist: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.getFormTemplatesShortlist();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update a form template
   * @route PUT /formtemplate/:templateId
   * @param {Request} req - Express request with templateId in params and update data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated template or errors
   * @description Updates template structure, questions, validation rules, or scoring logic
   */
  public updateFormTemplate: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.updateFormTemplate(req.params.templateId, req.body);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Create a new form template
   * @route POST /formtemplate
   * @param {Request} req - Express request with template data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created template or validation errors
   * @description Creates a new form template (questionnaire structure)
   */
  public createFormTemplate: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.createFormTemplate(req.body);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete a form template
   * @route DELETE /formtemplate/:templateId
   * @param {Request} req - Express request with templateId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion
   * @description Permanently deletes a form template
   */
  public deleteFormTemplate: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await formTemplateService.deleteFormTemplateById(req.params.templateId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const formTemplateController = new FormTemplateController();
