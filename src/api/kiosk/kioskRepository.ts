import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import { assertSeedingAllowed } from "@/common/utils/seedingUtils";
import mongoose from "mongoose";
import type { CreateKiosk, Kiosk, UpdateKiosk } from "./kioskModel";
import { kioskModel } from "./kioskModel";

export class KioskRepository {
  /**
   * Create a new kiosk entry
   * @param data - The kiosk data to create
   * @returns The created kiosk
   */
  async createKiosk(data: CreateKiosk): Promise<Kiosk> {
    try {
      const newKiosk = new kioskModel(data);
      await newKiosk.save();
      return newKiosk.toObject();
    } catch (error) {
      logger.error({ error }, "KioskRepository.createKiosk: Error creating kiosk");
      throw error;
    }
  }

  /**
   * Get kiosk by kiosk user ID
   * @param kioskUserId - The ID of the kiosk user
   * @returns The kiosk or null if not found
   */
  async getKioskByUserId(kioskUserId: string): Promise<Kiosk | null> {
    try {
      return await kioskModel
        .findOne({ kioskUserId })
        .populate([
          "kioskUserId",
          {
            path: "consultationId",
            populate: [
              { path: "patientCaseId" },
              { path: "proms" },
              { path: "visitedBy" },
              { path: "kioskId" },
              { path: "notes.createdBy" },
              { path: "images.addedBy" },
            ],
          },
        ])
        .lean();
    } catch (error) {
      logger.error({ error }, "KioskRepository.getKioskByUserId: Error getting kiosk");
      throw error;
    }
  }

  /**
   * Update kiosk by kiosk user ID
   * @param kioskUserId - The ID of the kiosk user
   * @param data - The data to update
   * @returns The updated kiosk or null if not found
   */
  async updateKioskByUserId(kioskUserId: string, data: UpdateKiosk): Promise<Kiosk | null> {
    try {
      return await kioskModel
        .findOneAndUpdate({ kioskUserId }, data, { new: true })
        .populate([
          "kioskUserId",
          {
            path: "consultationId",
            populate: [
              { path: "patientCaseId" },
              { path: "proms" },
              { path: "visitedBy" },
              { path: "formAccessCode" },
              { path: "kioskId" },
              { path: "notes.createdBy" },
              { path: "images.addedBy" },
            ],
          },
        ])
        .lean();
    } catch (error) {
      logger.error({ error }, "KioskRepository.updateKioskByUserId: Error updating kiosk");
      throw error;
    }
  }

  /**
   * Delete kiosk by kiosk user ID (unlink consultation)
   * Resets the consultationId to null, making the kiosk user available again
   * @param kioskUserId - The ID of the kiosk user
   * @returns True if updated successfully, false otherwise
   */
  async deleteKioskByUserId(kioskUserId: string): Promise<boolean> {
    try {
      const result = await kioskModel.findOneAndUpdate({ kioskUserId }, { consultationId: null }, { new: true });
      return !!result;
    } catch (error) {
      logger.error({ error }, "KioskRepository.deleteKioskByUserId: Error unlinking consultation");
      throw error;
    }
  }

  /**
   * Get all kiosks (for admin purposes)
   * @returns Array of all kiosks
   */
  async getAllKiosks(): Promise<Kiosk[]> {
    try {
      return await kioskModel
        .find()
        .populate([
          "kioskUserId",
          {
            path: "consultationId",
            populate: [
              { path: "patientCaseId" },
              { path: "proms" },
              { path: "visitedBy" },
              { path: "formAccessCode" },
              { path: "kioskId" },
              { path: "notes.createdBy" },
              { path: "images.addedBy" },
            ],
          },
        ])
        .lean();
    } catch (error) {
      logger.error({ error }, "KioskRepository.getAllKiosks: Error getting all kiosks");
      throw error;
    }
  }

  /**
   * Check if a kiosk exists for a given user
   * @param kioskUserId - The ID of the kiosk user
   * @returns True if kiosk exists, false otherwise
   */
  async kioskExistsForUser(kioskUserId: string): Promise<boolean> {
    try {
      const count = await kioskModel.countDocuments({ kioskUserId });
      return count > 0;
    } catch (error) {
      logger.error({ error }, "KioskRepository.kioskExistsForUser: Error checking kiosk existence");
      throw error;
    }
  }

  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createMockData(): Promise<void> {
    await assertSeedingAllowed();

    try {
      // Clear existing mock data
      await kioskModel.deleteMany({});

      // Create mock kiosks
      const mockKiosks: CreateKiosk[] = [
        {
          consultationId: "60d5ec49f1b2c12d88f1e8a1",
          kioskUserId: "676336bea497301f6eff8c95",
        },
      ];

      await kioskModel.insertMany(mockKiosks);
      logger.info("KioskRepository.createMockData: Mock kiosk data created successfully");
    } catch (error) {
      logger.error({ error }, "KioskRepository.createMockData: Error creating mock data");
      throw error;
    }
  }
}

// Export a singleton instance
export const kioskRepository = new KioskRepository();
