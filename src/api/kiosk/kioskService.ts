import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";
import { StatusCodes } from "http-status-codes";
import type { Consultation } from "../consultation/consultationModel";
import { consultationRepository } from "../consultation/consultationRepository";
import type { CreateKiosk, Kiosk, UpdateKiosk } from "./kioskModel";
import { type KioskRepository, kioskRepository } from "./kioskRepository";

export class KioskService {
  private kioskRepository: KioskRepository;

  constructor() {
    this.kioskRepository = kioskRepository;
  }

  /**
   * Get the current active consultation for the logged-in kiosk user
   * @param kioskUserId - The ID of the kiosk user
   * @returns ServiceResponse with the consultation data
   */
  async getConsultation(kioskUserId: string): Promise<ServiceResponse<Consultation | null>> {
    try {
      const kiosk = await this.kioskRepository.getKioskByUserId(kioskUserId);
      if (!kiosk) {
        return ServiceResponse.failure("No active consultation found for kiosk user", null, StatusCodes.NOT_FOUND);
      }

      const consultation = await consultationRepository.getConsultationById(kiosk.consultationId.toString());
      if (!consultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success("Consultation retrieved successfully", consultation);
    } catch (ex) {
      const errorMessage = `Error getting consultation for kiosk user: ${(ex as Error).message}`;
      logger.error({ error: ex }, errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update consultation status for the current logged-in kiosk user
   * @param kioskUserId - The ID of the kiosk user
   * @param statusData - The status update data
   * @returns ServiceResponse with the updated consultation
   */
  async updateConsultationStatus(
    kioskUserId: string,
    statusData: { status: string; notes?: string },
  ): Promise<ServiceResponse<Consultation | null>> {
    try {
      const kiosk = await this.kioskRepository.getKioskByUserId(kioskUserId);
      if (!kiosk) {
        return ServiceResponse.failure("No active consultation found for kiosk user", null, StatusCodes.NOT_FOUND);
      }

      // first get consultation, then push the note to the existing notes
      const consultation = await consultationRepository.getConsultationById(kiosk.consultationId.toString());
      if (!consultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }

      // Build the update data for consultation
      const updateData: any = {
        // Add a note about the status change
        notes: consultation.notes || [],
      };

      if (statusData.notes) {
        updateData.notes.push({
          note: `Status updated to: ${statusData.status}. ${statusData.notes}`,
          createdBy: kioskUserId,
          createdAt: new Date(),
        });
      } else {
        updateData.notes.push({
          note: `Status updated to: ${statusData.status}`,
          createdBy: kioskUserId,
          createdAt: new Date(),
        });
      }

      const updatedConsultation = await consultationRepository.updateConsultation(
        kiosk.consultationId.toString(),
        updateData,
      );

      if (!updatedConsultation) {
        return ServiceResponse.failure("Failed to update consultation status", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success("Consultation status updated successfully", updatedConsultation);
    } catch (ex) {
      const errorMessage = `Error updating consultation status: ${(ex as Error).message}`;
      logger.error({ error: ex }, errorMessage);
      return ServiceResponse.failure(
        "An error occurred while updating consultation status.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the active consultation for a specific kiosk user (admin/mfa access)
   * @param kioskUserId - The ID of the kiosk user
   * @returns ServiceResponse with the consultation data
   */
  async getConsultationFor(kioskUserId: string): Promise<ServiceResponse<Consultation | null>> {
    try {
      const kiosk = await this.kioskRepository.getKioskByUserId(kioskUserId);
      if (!kiosk) {
        return ServiceResponse.failure("No kiosk found for the specified user", null, StatusCodes.NOT_FOUND);
      }

      const consultation = await consultationRepository.getConsultationById(kiosk.consultationId.toString());
      if (!consultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success("Consultation retrieved successfully", consultation);
    } catch (ex) {
      const errorMessage = `Error getting consultation for kiosk user: ${(ex as Error).message}`;
      logger.error({ error: ex }, errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete (unlink) consultation for a specific kiosk user (admin/mfa access)
   * @param kioskUserId - The ID of the kiosk user
   * @returns ServiceResponse indicating success or failure
   */
  async deleteConsultationFor(kioskUserId: string): Promise<ServiceResponse<null>> {
    try {
      const success = await this.kioskRepository.deleteKioskByUserId(kioskUserId);
      if (!success) {
        return ServiceResponse.failure("No kiosk found for the specified user", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success("Consultation unlinked successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting consultation for kiosk user: ${(ex as Error).message}`;
      logger.error({ error: ex }, errorMessage);
      return ServiceResponse.failure(
        "An error occurred while unlinking consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new kiosk entry (helper method)
   * @param data - The kiosk data
   * @returns ServiceResponse with the created kiosk
   */
  async createKiosk(data: CreateKiosk): Promise<ServiceResponse<Kiosk | null>> {
    try {
      const existingKiosk = await this.kioskRepository.getKioskByUserId(data.kioskUserId.toString());
      if (existingKiosk) {
        return ServiceResponse.failure("Kiosk already exists for this user", null, StatusCodes.CONFLICT);
      }

      const newKiosk = await this.kioskRepository.createKiosk(data);
      return ServiceResponse.created("Kiosk created successfully", newKiosk);
    } catch (ex) {
      const errorMessage = `Error creating kiosk: ${(ex as Error).message}`;
      logger.error({ error: ex }, errorMessage);
      return ServiceResponse.failure(
        "An error occurred while creating kiosk.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Set consultation for a specific kiosk user (create kiosk entry)
   * @param kioskUserId - The ID of the kiosk user
   * @param consultationId - The ID of the consultation
   * @returns ServiceResponse with the created kiosk
   */
  async setConsultation(kioskUserId: string, consultationId: string): Promise<ServiceResponse<Kiosk | null>> {
    try {
      // Check if consultation exists
      const consultation = await consultationRepository.getConsultationById(consultationId);
      if (!consultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }

      // Check if kiosk already exists for this user
      const existingKiosk = await this.kioskRepository.getKioskByUserId(kioskUserId);
      if (existingKiosk) {
        // Update existing kiosk with new consultation
        const updatedKiosk = await this.kioskRepository.updateKioskByUserId(kioskUserId, {
          consultationId: consultationId as any,
        });
        if (!updatedKiosk) {
          return ServiceResponse.failure("Failed to update kiosk consultation", null, StatusCodes.NOT_FOUND);
        }
        return ServiceResponse.success("Kiosk consultation updated successfully", updatedKiosk);
      }

      // Create new kiosk entry
      const newKiosk = await this.kioskRepository.createKiosk({
        kioskUserId: kioskUserId as any,
        consultationId: consultationId as any,
      });

      return ServiceResponse.created("Kiosk consultation set successfully", newKiosk);
    } catch (ex) {
      const errorMessage = `Error setting consultation for kiosk user: ${(ex as Error).message}`;
      logger.error({ error: ex }, errorMessage);
      return ServiceResponse.failure(
        "An error occurred while setting consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

// Export a singleton instance
export const kioskService = new KioskService();
