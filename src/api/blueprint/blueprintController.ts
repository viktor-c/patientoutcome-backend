import { blueprintService } from "@/api/blueprint/blueprintService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";

/**
 * Blueprint Controller
 * @class BlueprintController
 * @description Handles HTTP requests for blueprint template management
 */
class BlueprintController {
  /**
   * Get all blueprints with optional pagination and filtering
   * @route GET /blueprints
   * @param {Request} req - Express request with optional query params: page, limit, blueprintFor
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with paginated blueprint list
   * @description Retrieves all blueprints with optional filtering by blueprintFor type (case, consultation, surgery)
   */
  public getBlueprints: RequestHandler = async (req: Request, res: Response) => {
    const { page, limit, blueprintFor } = req.query;

    const options = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      blueprintFor: blueprintFor as "case" | "consultation" | "surgery" | undefined,
    };

    const serviceResponse = await blueprintService.findAll(options);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get a blueprint by ID
   * @route GET /blueprints/:id
   * @param {Request} req - Express request with blueprint ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with blueprint details or 404 if not found
   * @description Retrieves a single blueprint by its MongoDB ObjectId
   */
  public getBlueprintById: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await blueprintService.findById(id);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Search blueprints by name or description
   * @route GET /blueprints/search
   * @param {Request} req - Express request with query params: q (search term), blueprintFor, page, limit
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with matching blueprints
   * @description Performs text search on blueprint name and description fields with optional filtering
   */
  public searchBlueprints: RequestHandler = async (req: Request, res: Response) => {
    const { q, blueprintFor, page, limit } = req.query;

    const options = {
      q: q as string,
      blueprintFor: blueprintFor as "case" | "consultation" | "surgery" | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    const serviceResponse = await blueprintService.search(options);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Create a new blueprint
   * @route POST /blueprints
   * @access Authenticated users only
   * @param {Request} req - Express request with blueprint data in body and userId from session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with created blueprint or validation errors
   * @description Creates a new blueprint template. Requires authenticated user session.
   */
  public createBlueprint: RequestHandler = async (req: Request, res: Response) => {
    const blueprintData = req.body;

    // Get user ID from session
    const userId = (req.session as any)?.userId;
    if (!userId) {
      const serviceResponse = {
        success: false,
        message: "User authentication required",
        responseObject: null,
        statusCode: 401,
      };
      return handleServiceResponse(serviceResponse, res);
    }

    const serviceResponse = await blueprintService.createBlueprint(blueprintData, userId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update an existing blueprint
   * @route PUT /blueprints/:id
   * @access Authenticated users only
   * @param {Request} req - Express request with blueprint ID in params, update data in body, userId from session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated blueprint or 404 if not found
   * @description Updates an existing blueprint. Only modified fields need to be provided.
   */
  public updateBlueprint: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const blueprintData = req.body;

    // Get user ID from session
    const userId = (req.session as any)?.userId;
    if (!userId) {
      const serviceResponse = {
        success: false,
        message: "User authentication required",
        responseObject: null,
        statusCode: 401,
      };
      return handleServiceResponse(serviceResponse, res);
    }

    const serviceResponse = await blueprintService.updateBlueprint(id, blueprintData, userId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete a blueprint
   * @route DELETE /blueprints/:id
   * @param {Request} req - Express request with blueprint ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming deletion or 404 if not found
   * @description Permanently deletes a blueprint template by ID
   */
  public deleteBlueprint: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceResponse = await blueprintService.deleteBlueprint(id);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const blueprintController = new BlueprintController();
