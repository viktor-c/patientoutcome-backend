import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { kioskService } from "./kioskService";

class KioskController {
  /**
   * Get all kiosk entries (admin/mfa access)
   */
  public getAllKiosks: RequestHandler = async (_req: Request, res: Response) => {
    const serviceResponse = await kioskService.getAllKiosks();
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Get the current active consultation for the logged-in kiosk user
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
   * Get the active consultation for a specific kiosk user (admin/mfa access)
   */
  public getConsultationFor: RequestHandler = async (req: Request, res: Response) => {
    const kioskUserId = z.string().parse(req.params.kioskUserId);
    const serviceResponse = await kioskService.getConsultationFor(kioskUserId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Delete (unlink) consultation for a specific kiosk user (admin/mfa access)
   */
  public deleteConsultationFor: RequestHandler = async (req: Request, res: Response) => {
    const kioskUserId = z.string().parse(req.params.kioskUserId);
    const serviceResponse = await kioskService.deleteConsultationFor(kioskUserId);
    return handleServiceResponse(serviceResponse, res);
  };

  /**
   * Set consultation for a specific kiosk user (admin/mfa access)
   */
  public setConsultation: RequestHandler = async (req: Request, res: Response) => {
    const kioskUserId = z.string().parse(req.params.kioskUserId);
    const consultationId = z.string().parse(req.params.consultationId);
    const serviceResponse = await kioskService.setConsultation(kioskUserId, consultationId);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const kioskController = new KioskController();
