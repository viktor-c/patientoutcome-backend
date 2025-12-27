import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { kioskService } from "./kioskService";

/**
 * Kiosk Controller
 * @class KioskController
 * @description Handles HTTP requests for kiosk user and consultation assignment management
 */
class KioskController {
  /**
   * Get all kiosk entries
   * @route GET /kiosk/all
   * @access Admin, MFA
   * @param {Request} _req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with array of all kiosk users
   * @description Retrieves all kiosk user accounts (admin/mfa access only)
   */
  public getAllKiosks: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await kioskService.getAllKiosks();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get the current active consultation for the logged-in kiosk user
   * @route GET /kiosk/consultation
   * @access Kiosk users (authenticated)
   * @param {Request} req - Express request with userId in session
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with active consultation or 401 if not authenticated
   * @description Retrieves the currently assigned consultation for the logged-in kiosk
   */
  public getConsultation: RequestHandler = async (req: Request, res: Response) => {
    const kioskUserId = req.session?.userId;

    if (!kioskUserId) {
      return res.status(401).json({ message: "Authentication required: No active session" });
    }

    const serviceResponse = await kioskService.getConsultation(kioskUserId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Update consultation status for the current logged-in kiosk user
   * @route PUT /kiosk/consultation/status
   * @access Kiosk users (authenticated)
   * @param {Request} req - Express request with userId in session and status data in body
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated consultation or 401 if not authenticated
   * @description Updates the status of the consultation assigned to the logged-in kiosk
   */
  public updateConsultationStatus: RequestHandler = async (req: Request, res: Response) => {
    const kioskUserId = req.session?.userId;

    if (!kioskUserId) {
      return res.status(401).json({ message: "Authentication required: No active session" });
    }

    const statusData = req.body;
    const serviceResponse = await kioskService.updateConsultationStatus(kioskUserId, statusData);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get the active consultation for a specific kiosk user
   * @route GET /kiosk/:kioskUserId/consultation
   * @access Admin, MFA
   * @param {Request} req - Express request with kioskUserId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with kiosk's active consultation
   * @description Retrieves the consultation assigned to a specific kiosk (admin/mfa access)
   */
  public getConsultationFor: RequestHandler = async (req: Request, res: Response) => {
    const kioskUserId = z.string().parse(req.params.kioskUserId);
    const serviceResponse = await kioskService.getConsultationFor(kioskUserId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete (unlink) consultation for a specific kiosk user
   * @route DELETE /kiosk/:kioskUserId/consultation
   * @access Admin, MFA
   * @param {Request} req - Express request with kioskUserId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse confirming unlink
   * @description Removes the consultation assignment from a kiosk user (admin/mfa access)
   */
  public deleteConsultationFor: RequestHandler = async (req: Request, res: Response) => {
    const kioskUserId = z.string().parse(req.params.kioskUserId);
    const serviceResponse = await kioskService.deleteConsultationFor(kioskUserId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Set consultation for a specific kiosk user
   * @route PUT /kiosk/:kioskUserId/consultation/:consultationId
   * @access Admin, MFA
   * @param {Request} req - Express request with kioskUserId and consultationId in params
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} ServiceResponse with updated kiosk assignment
   * @description Assigns a consultation to a kiosk user (admin/mfa access)
   */
  public setConsultation: RequestHandler = async (req: Request, res: Response) => {
    const kioskUserId = z.string().parse(req.params.kioskUserId);
    const consultationId = z.string().parse(req.params.consultationId);
    const serviceResponse = await kioskService.setConsultation(kioskUserId, consultationId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const kioskController = new KioskController();
