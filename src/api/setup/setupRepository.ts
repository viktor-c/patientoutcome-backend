import { userModel } from "@/api/user/userModel";
import { logger } from "@/common/utils/logger";
import mongoose from "mongoose";
import type { SetupStatus } from "./setupModel";

/**
 * Repository for checking setup/initialization status
 */
export class SetupRepository {
  /**
   * Check if database connection is established
   */
  async isDatabaseConnected(): Promise<boolean> {
    try {
      // Check mongoose connection state
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
      return mongoose.connection.readyState === 1;
    } catch (error) {
      logger.error({ error }, "Error checking database connection");
      return false;
    }
  }

  /**
   * Check if any admin user exists in the database
   */
  async hasAdminUser(): Promise<boolean> {
    try {
      const adminCount = await userModel.countDocuments({
        roles: { $in: ["admin"] },
      });
      return adminCount > 0;
    } catch (error) {
      logger.error({ error }, "Error checking for admin user");
      return false;
    }
  }

  /**
   * Check if any users exist in the database
   */
  async hasAnyUsers(): Promise<boolean> {
    try {
      const userCount = await userModel.countDocuments({});
      return userCount > 0;
    } catch (error) {
      logger.error({ error }, "Error checking for any users");
      return false;
    }
  }

  /**
   * Get comprehensive setup status
   */
  async getSetupStatus(): Promise<SetupStatus> {
    const databaseConnected = await this.isDatabaseConnected();

    if (!databaseConnected) {
      return {
        setupRequired: true,
        hasAdminUser: false,
        hasAnyUsers: false,
        databaseConnected: false,
      };
    }

    const hasAdminUser = await this.hasAdminUser();
    const hasAnyUsers = await this.hasAnyUsers();

    return {
      setupRequired: !hasAdminUser,
      hasAdminUser,
      hasAnyUsers,
      databaseConnected,
    };
  }

  /**
   * Count documents in a collection
   */
  async getCollectionCount(collectionName: string): Promise<number> {
    try {
      const count = await mongoose.connection.collection(collectionName).countDocuments();
      return count;
    } catch (error) {
      // Collection might not exist yet
      return 0;
    }
  }

  /**
   * Get counts of all major collections for status overview
   */
  async getDatabaseStats(): Promise<Record<string, number>> {
    const collections = [
      "users",
      "patients",
      "consultations",
      "forms",
      "formtemplates",
      "blueprints",
      "patientcases",
      "surgeries",
      "clinicalstudies",
    ];

    const stats: Record<string, number> = {};

    for (const collection of collections) {
      stats[collection] = await this.getCollectionCount(collection);
    }

    return stats;
  }
}

export const setupRepository = new SetupRepository();
