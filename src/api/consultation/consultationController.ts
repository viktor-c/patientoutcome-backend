import { codeService } from "@/api/code/codeService";
import { userService } from "@/api/user/userService";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { consultationService } from "./consultationService";

class ConsultationController {
  // Helper method to populate createdBy field for notes
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

  // Helper method to validate that kioskId belongs to a user with "kiosk" role
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

  // Create a new consultation
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

  // Get a consultation by ID
  public getConsultationById: RequestHandler = async (req: Request, res: Response) => {
    const consultationId = z.string().parse(req.params.consultationId);
    const serviceResponse = await consultationService.getConsultationById(consultationId);
    return handleServiceResponse(serviceResponse, res);
  };

  // Update a consultation by ID
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

  // Delete a consultation by ID
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

  // Get all consultations for a given caseId
  public getAllConsultations: RequestHandler = async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const serviceResponse = await consultationService.getAllConsultations(caseId);
    return handleServiceResponse(serviceResponse, res);
  };

  public getAllConsultationsOnDay: RequestHandler = async (req: Request, res: Response) => {
    const fromDate = z.string().parse(req.params.fromDate);
    const toDate = z.string().parse(req.params.toDate);
    const serviceResponse = await consultationService.getAllConsultationsOnDay(fromDate, toDate);
    return handleServiceResponse(serviceResponse, res);
  };

  // Get a consultation by form access code
  public getConsultationByCode: RequestHandler = async (req: Request, res: Response) => {
    const code = z.string().parse(req.params.code);
    const serviceResponse = await consultationService.getConsultationByCode(code);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const consultationController = new ConsultationController();
