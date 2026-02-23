import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { formTemplateService, type UserContext } from "./formTemplateService";
import { GetFormTemplatesQuerySchema } from "./formTemplateModel";
import { logger } from "@/common/utils/logger";

/**
 * Form Template Controller
 * @class FormTemplateController
 * @description Handles HTTP requests for form template (questionnaire structure) management
 */
class FormTemplateController {
  /**
   * Extract user context from request session
   */
  private getUserContext(req: Request): UserContext {
    return {
      userId: req.session.userId || "",
      roles: req.session.roles || [],
      departments: req.session.department || [], // Note: session stores as 'department', not 'userDepartments'
    };
  }

  /**
   * Get form templates with optional filters
   * @route GET /formtemplate
   * @query id - Single template ID
   * @query ids - Array of template IDs
   * @query departmentId - Filter by department
   * @param {Request} req - Express request object with query params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with filtered form templates
   * @description Retrieves form templates with role-based access control
   * - Regular users: Only templates mapped to their departments
   * - Admin/developer: All templates
   */
  public getFormTemplates: RequestHandler = async (req: Request, res: Response) => {
    try {
      const userContext = this.getUserContext(req);

      // Parse and validate query params
      const queryResult = GetFormTemplatesQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        logger.debug({ errors: queryResult.error.issues }, "Query validation error");
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          errors: queryResult.error.issues,
        });
      }

      const serviceResponse = await formTemplateService.getFormTemplates(queryResult.data, userContext);
      return handleServiceResponse(serviceResponse, res);
    } catch (ex) {
      logger.error(`Controller error in getFormTemplates: ${(ex as Error).message}`);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get a form template by ID
   * @route GET /formtemplate/:templateId
   * @param {Request} req - Express request with templateId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with template or 403/404
   * @description Retrieves a single form template with access control
   */
  public getFormTemplateById: RequestHandler = async (req: Request, res: Response) => {
    const userContext = this.getUserContext(req);
    const serviceResponse = await formTemplateService.getFormTemplateById(req.params.templateId, userContext);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a shortlist of active form templates
   * @route GET /formtemplate/shortlist
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with user-accessible templates
   * @description Retrieves simplified list with department-based filtering
   */
  public getFormTemplatesShortlist: RequestHandler = async (req: Request, res: Response) => {
    const userContext = this.getUserContext(req);
    const serviceResponse = await formTemplateService.getFormTemplatesShortlist(userContext);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update a form template (admin/developer only)
   * @route PUT /formtemplate/:templateId
   * @param {Request} req - Express request with templateId in params and update data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated template or 403
   * @description Updates template (restricted to admin/developer)
   */
  public updateFormTemplate: RequestHandler = async (req: Request, res: Response) => {
    const userContext = this.getUserContext(req);
    const serviceResponse = await formTemplateService.updateFormTemplate(
      req.params.templateId,
      req.body,
      userContext,
    );
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Create a new form template (admin/developer only)
   * @route POST /formtemplate
   * @param {Request} req - Express request with template data in body (may include _id)
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created template or 403
   * @description Creates a new form template (restricted to admin/developer)
   */
  public createFormTemplate: RequestHandler = async (req: Request, res: Response) => {
    const userContext = this.getUserContext(req);
    const serviceResponse = await formTemplateService.createFormTemplate(req.body, userContext);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete a form template (admin/developer only)
   * @route DELETE /formtemplate/:templateId
   * @param {Request} req - Express request with templateId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion or 403
   * @description Permanently deletes a form template (restricted to admin/developer)
   */
  public deleteFormTemplate: RequestHandler = async (req: Request, res: Response) => {
    const userContext = this.getUserContext(req);
    const serviceResponse = await formTemplateService.deleteFormTemplateById(req.params.templateId, userContext);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get department-formtemplate mapping (admin/developer only)
   * @route GET /formtemplate/department/:departmentId/mapping
   * @param {Request} req - Express request with departmentId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with mapping or 403/404
   * @description Retrieves form template IDs mapped to a department
   */
  public getDepartmentMapping: RequestHandler = async (req: Request, res: Response) => {
    const userContext = this.getUserContext(req);
    const serviceResponse = await formTemplateService.getDepartmentMapping(req.params.departmentId, userContext);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Set department-formtemplate mapping (admin/developer only)
   * @route PUT /formtemplate/department/:departmentId/mapping
   * @body formTemplateIds - Array of template IDs
   * @param {Request} req - Express request with departmentId in params and formTemplateIds in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated mapping or 403
   * @description Replaces existing mapping with new template IDs
   */
  public setDepartmentMapping: RequestHandler = async (req: Request, res: Response) => {
    const userContext = this.getUserContext(req);
    const serviceResponse = await formTemplateService.setDepartmentMapping(
      req.params.departmentId,
      req.body.formTemplateIds || [],
      userContext,
    );
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Add templates to department mapping (admin/developer only)
   * @route POST /formtemplate/department/:departmentId/templates
   * @body formTemplateIds - Array of template IDs to add
   * @param {Request} req - Express request with departmentId in params and formTemplateIds in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated mapping or 403/404
   * @description Adds template IDs to existing department mapping
   */
  public addTemplatesToDepartment: RequestHandler = async (req: Request, res: Response) => {
    const userContext = this.getUserContext(req);
    const serviceResponse = await formTemplateService.addTemplatesToDepartment(
      req.params.departmentId,
      req.body.formTemplateIds || [],
      userContext,
    );
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Remove templates from department mapping (admin/developer only)
   * @route DELETE /formtemplate/department/:departmentId/templates
   * @body formTemplateIds - Array of template IDs to remove
   * @param {Request} req - Express request with departmentId in params and formTemplateIds in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated mapping or 403/404
   * @description Removes template IDs from department mapping
   */
  public removeTemplatesFromDepartment: RequestHandler = async (req: Request, res: Response) => {
    const userContext = this.getUserContext(req);
    const serviceResponse = await formTemplateService.removeTemplatesFromDepartment(
      req.params.departmentId,
      req.body.formTemplateIds || [],
      userContext,
    );
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete department mapping (admin/developer only)
   * @route DELETE /formtemplate/department/:departmentId/mapping
   * @param {Request} req - Express request with departmentId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion or 403/404
   * @description Removes all template mappings for a department
   */
  public deleteDepartmentMapping: RequestHandler = async (req: Request, res: Response) => {
    const userContext = this.getUserContext(req);
    const serviceResponse = await formTemplateService.deleteDepartmentMapping(req.params.departmentId, userContext);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const formTemplateController = new FormTemplateController();

