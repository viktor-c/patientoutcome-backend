import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";
import { StatusCodes } from "http-status-codes";
import type { Consultation } from "../consultation/consultationModel";
import { consultationRepository } from "../consultation/consultationRepository";
import type { UserNoPassword } from "../user/userModel";
import { userRepository } from "../user/userRepository";

export class KioskService {
  /**
   * Get all kiosk users (users with 'kiosk' role) with populated consultation data
   * @returns ServiceResponse with array of all kiosk users
   */
  async getAllKiosks(): Promise<ServiceResponse<UserNoPassword[] | null>> {
    try {
      const kioskUsers = await userRepository.findAllByRoleAsync("kiosk");

      if (!kioskUsers || kioskUsers.length === 0) {
        return ServiceResponse.failure("No kiosk users found", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success("Kiosk users retrieved successfully", kioskUsers);
    } catch (ex) {
      const errorMessage = `Error getting all kiosk users: ${(ex as Error).message}`;
      logger.error({ error: ex }, errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving kiosk users.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the current active consultation for the logged-in kiosk user
   * @param kioskUserId - The ID of the kiosk user
   * @returns ServiceResponse with the consultation data
   */
  async getConsultation(kioskUserId: string): Promise<ServiceResponse<Consultation | null>> {
    try {
      const kioskUser = await userRepository.findByIdAsync(kioskUserId);
      if (!kioskUser) {
        return ServiceResponse.failure("Kiosk user not found", null, StatusCodes.NOT_FOUND);
      }

      if (!kioskUser.consultationId) {
        return ServiceResponse.failure("No active consultation found for kiosk user", null, StatusCodes.NOT_FOUND);
      }

      const consultation = await consultationRepository.getConsultationById(kioskUser.consultationId.toString());
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
      const kioskUser = await userRepository.findByIdAsync(kioskUserId);
      if (!kioskUser || !kioskUser.consultationId) {
        return ServiceResponse.failure("No active consultation found for kiosk user", null, StatusCodes.NOT_FOUND);
      }

      // Get consultation, then add the note to the existing notes
      const consultation = await consultationRepository.getConsultationById(kioskUser.consultationId.toString());
      if (!consultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }

      // Build the update data for consultation
      const updateData: any = {
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
        kioskUser.consultationId.toString(),
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
      const kioskUser = await userRepository.findByIdAsync(kioskUserId);
      if (!kioskUser) {
        return ServiceResponse.failure("Kiosk user not found", null, StatusCodes.NOT_FOUND);
      }

      if (!kioskUser.consultationId) {
        return ServiceResponse.failure("No active consultation found for this kiosk user", null, StatusCodes.NOT_FOUND);
      }

      const consultation = await consultationRepository.getConsultationById(kioskUser.consultationId.toString());
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
   * Unlink consultation from a specific kiosk user (admin/mfa access)
   * Sets consultationId to null, making the kiosk user available again
   * @param kioskUserId - The ID of the kiosk user
   * @returns ServiceResponse indicating success or failure
   */
  async deleteConsultationFor(kioskUserId: string): Promise<ServiceResponse<null>> {
    try {
      const kioskUser = await userRepository.findByIdAsync(kioskUserId);
      if (!kioskUser) {
        return ServiceResponse.failure("Kiosk user not found", null, StatusCodes.NOT_FOUND);
      }

      // delete the kioskId from the consultation as well
      if (kioskUser.consultationId) {
        await consultationRepository.updateConsultation(kioskUser.consultationId.toString(), {
          kioskId: null,
        });
      }
      // Reset the consultationId to null
      await userRepository.updateByIdAsync(kioskUserId, { consultationId: null });

      return ServiceResponse.success("Consultation unlinked successfully", null);
    } catch (ex) {
      const errorMessage = `Error unlinking consultation from kiosk user: ${(ex as Error).message}`;
      logger.error({ error: ex }, errorMessage);
      return ServiceResponse.failure(
        "An error occurred while unlinking consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Set consultation for a specific kiosk user
   * @param kioskUserId - The ID of the kiosk user
   * @param consultationId - The ID of the consultation
   * @returns ServiceResponse with the updated user
   */
  async setConsultation(kioskUserId: string, consultationId: string): Promise<ServiceResponse<UserNoPassword | null>> {
    try {
      // Check if consultation exists
      const consultation = await consultationRepository.getConsultationById(consultationId);
      if (!consultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }

      // Check if kiosk user exists
      const kioskUser = await userRepository.findByIdAsync(kioskUserId);
      if (!kioskUser) {
        return ServiceResponse.failure("Kiosk user not found", null, StatusCodes.NOT_FOUND);
      }

      // reset previous kiosk user from consultation
      if (consultation.kioskId) {
        await userRepository.updateByIdAsync(consultation.kioskId._id.toString(), {
          consultationId: null,
        });
      }

      // Update user with consultation ID
      const updatedUser = await userRepository.updateByIdAsync(kioskUserId, {
        consultationId: consultationId as any,
      });

      // update consultation with the kioskId
      const updatedConsultation = await consultationRepository.updateConsultation(consultationId, {
        kioskId: kioskUserId,
      });

      if (!updatedUser) {
        return ServiceResponse.failure("Failed to set consultation for kiosk user", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success("Kiosk consultation set successfully", updatedUser);
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
