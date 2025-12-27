import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/server";
import type { Request, RequestHandler, Response } from "express";
import { codeService } from "./codeService";

/**
 * Form Access Code Controller
 * @class CodeController
 * @description Handles HTTP requests for form access code management including activation, deactivation, and validation
 */
class CodeController {
  /**
   * Activate a form access code for a consultation
   * @route PUT /form-access-code/:code/activate/:consultationId
   * @param {Request} req - Express request with code and consultationId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with activated code or error
   * @description Links a form access code to a consultation and marks it as active
   */
  public activateCode: RequestHandler = async (req: Request, res: Response) => {
    const { code, consultationId } = req.params;
    logger.debug(`Activating code: ${code} for consultation: ${consultationId}`);
    const serviceResponse = await codeService.activateCode(code, consultationId);
    return handleServiceResponse(serviceResponse, res);
  };
  /**
   * Deactivate a form access code
   * @route PUT /form-access-code/:code/deactivate
   * @param {Request} req - Express request with code in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deactivation
   * @description Deactivates a code, preventing further use for form access
   */
  public deactivateCode: RequestHandler = async (req: Request, res: Response) => {
    const { code } = req.params;
    const serviceResponse = await codeService.deactivateCode(code);
    return handleServiceResponse(serviceResponse, res);
  };
  /**
   * Generate new form access codes
   * @route POST /form-access-code/generate/:numberOfCodes
   * @param {Request} req - Express request with numberOfCodes in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with generated codes
   * @description Generates specified number of new unique access codes
   */
  public addCodes: RequestHandler = async (req: Request, res: Response) => {
    const { numberOfCodes } = req.params;
    const serviceResponse = await codeService.addCodes(numberOfCodes);
    return handleServiceResponse(serviceResponse, res);
  };
  /**
   * Delete a form access code
   * @route DELETE /form-access-code/:code
   * @param {Request} req - Express request with code in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion
   * @description Permanently removes a form access code
   */
  public deleteCode: RequestHandler = async (req: Request, res: Response) => {
    const { code } = req.params;
    const serviceResponse = await codeService.deleteCode(code);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get code by database ID
   * @route GET /form-access-code/id/:id
   * @param {Request} req - Express request with code ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with code details or 404
   * @description Retrieves a code by its MongoDB ObjectId
   */
  public getCodeById: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await codeService.getCodeById(id);
    return handleServiceResponse(serviceResponse, res);
  };
  /**
   * Get code by code string
   * @route GET /form-access-code/:code
   * @param {Request} req - Express request with code string in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with code details or 404
   * @description Retrieves a code by its unique code string
   */
  public getCode: RequestHandler = async (req: Request, res: Response) => {
    const { code } = req.params;
    const serviceResponse = await codeService.getCode(code);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all form access codes
   * @route GET /form-access-code/all
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of all codes with populated consultations
   * @description Retrieves all codes in the system including their consultation associations
   */
  public findAllCodes: RequestHandler = async (req: Request, res: Response) => {
    const serviceResponse = await codeService.getAllCodes();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get all available (unused) form access codes
   * @route GET /form-access-code/available
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of available codes
   * @description Retrieves codes that have not been activated yet
   */
  async getAllAvailableCodes(req: Request, res: Response): Promise<Response> {
    const serviceResponse = await codeService.getAllAvailableCodes();
    return handleServiceResponse(serviceResponse, res);
  }

  /**
   * Validate a form access code
   * @route GET /form-access-code/validate/:code
   * @param {Request} req - Express request with code string in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse indicating if code is valid and active
   * @description Checks if a code exists, is active, and can be used for form access
   */
  async validateCode(req: Request, res: Response): Promise<Response> {
    const { code } = req.params;
    const serviceResponse = await codeService.validateCode(code);
    return handleServiceResponse(serviceResponse, res);
  }
}

export const codeController = new CodeController();
