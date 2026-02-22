/**
 * @file Form Version Service
 * @module api/form/formVersionService
 * @description Handles form versioning operations:
 * - Creating version backups when forms are updated
 * - Retrieving version history
 * - Comparing versions (diff)
 * - Restoring previous versions
 */

import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";
import { StatusCodes } from "http-status-codes";
import type { Form } from "./formModel";
import { formRepository } from "./formRepository";
import { FormVersionModel, type FormVersion } from "./formVersionModel";

export interface UserContext {
  userId: string;
  username?: string;
  roles: string[];
}

export class FormVersionService {
  /**
   * Create a version backup before updating a form
   * @param form - The current form before update
    * @param userId - User making the change
   * @param changeNotes - Optional notes describing the change
   * @param isRestoration - Whether this is a restoration of an older version
   * @param restoredFromVersion - If restoration, which version was restored
   * @returns Promise<FormVersion | null>
   */
  async createVersionBackup(
    form: Form,
    userId: string,
    changeNotes: string = "",
    isRestoration: boolean = false,
    restoredFromVersion?: number,
    versionOverride?: number,
    rawDataOverride?: Form["patientFormData"] | null,
  ): Promise<FormVersion | null> {
    try {
      const rawData = rawDataOverride ?? form.patientFormData;

      // Only create backup if there's actual form data to save
      if (!rawData) {
        logger.debug({ formId: form._id }, "No patient form data to backup - skipping version");
        return null;
      }

      // Get current version number (default to 1 if not set)
      const currentVersion = versionOverride || form.currentVersion || 1;

      // Prepare version data
      const versionData: Omit<FormVersion, "_id"> = {
        formId: form._id!.toString(),
        version: currentVersion,
        rawData,
        changedBy: userId,
        changedAt: new Date(),
        changeNotes: changeNotes || "Form updated",
        isRestoration,
        restoredFromVersion: restoredFromVersion || null,
      };

      // Upsert by formId + version to avoid duplicate-key failures in reseeded/test data
      const version = await FormVersionModel.findOneAndUpdate(
        { formId: versionData.formId, version: versionData.version },
        {
          $set: versionData,
          $unset: { previousRawData: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (!version) {
        logger.error(
          {
            formId: form._id,
            version: currentVersion,
          },
          "Failed to upsert form version backup"
        );
        return null;
      }

      logger.info(
        {
          formId: form._id,
          version: currentVersion,
          userId,
          isRestoration,
        },
        "📁 Form version backup created"
      );

      return version.toObject() as FormVersion;
    } catch (error) {
      logger.error(
        { error, formId: form._id?.toString() },
        "Error creating version backup"
      );
      return null;
    }
  }

  /**
   * Get all versions for a form
   * @param formId - Form ID
   * @returns Promise<ServiceResponse<FormVersion[]>>
   */
  async getVersionHistory(formId: string): Promise<ServiceResponse<FormVersion[] | null>> {
    try {
      const versions = await FormVersionModel.find({ formId })
        .sort({ version: -1 }) // Newest first
        .select("-rawData -previousRawData") // Exclude large data fields from list view
        .lean() as FormVersion[];

      return ServiceResponse.success("Version history retrieved", versions);
    } catch (error) {
      logger.error({ error, formId }, "Error getting version history");
      return ServiceResponse.failure(
        "Failed to retrieve version history",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get a specific version with full data
   * @param formId - Form ID
   * @param versionNumber - Version number
   * @returns Promise<ServiceResponse<FormVersion>>
   */
  async getVersion(
    formId: string,
    versionNumber: number
  ): Promise<ServiceResponse<FormVersion | null>> {
    try {
      const version = await FormVersionModel.findOne({
        formId,
        version: versionNumber,
      }).lean() as FormVersion | null;

      if (version) {
        const sanitizedVersion = { ...version } as Record<string, unknown>;
        delete sanitizedVersion.previousRawData;
        return ServiceResponse.success("Version retrieved", sanitizedVersion as FormVersion);
      }

      // Fallback: allow reading the current form state as a version when requested
      const form = await formRepository.getFormById(formId);
      if (form?.currentVersion === versionNumber && form.patientFormData) {
        return ServiceResponse.success("Version retrieved", {
          formId,
          version: versionNumber,
          rawData: form.patientFormData,
          changedBy: "current-form",
          changedAt: form.updatedAt || form.createdAt || new Date(),
          changeNotes: "Current form state",
          isRestoration: false,
          restoredFromVersion: null,
        } as FormVersion);
      }

      return ServiceResponse.failure("Version not found", null, StatusCodes.NOT_FOUND);
    } catch (error) {
      logger.error({ error, formId, versionNumber }, "Error getting version");
      return ServiceResponse.failure(
        "Failed to retrieve version",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Compare two versions and generate a diff
   * @param formId - Form ID
   * @param v1 - First version number
   * @param v2 - Second version number
   * @returns Promise<ServiceResponse with diff data>
   */
  async compareVersions(
    formId: string,
    v1: number,
    v2: number
  ): Promise<ServiceResponse<any>> {
    try {
      // Fetch both versions
      const [version1, version2] = await Promise.all([
        this.getVersionSnapshot(formId, v1),
        this.getVersionSnapshot(formId, v2),
      ]);

      if (!version1 || !version2) {
        return ServiceResponse.failure(
          "One or both versions not found",
          null,
          StatusCodes.NOT_FOUND
        );
      }

      // Generate diff result
      const diff = {
        formId,
        v1: {
          version: version1.version,
          changedBy: version1.changedBy,
          changedAt: version1.changedAt,
          changeNotes: version1.changeNotes,
          rawData: version1.rawData,
        },
        v2: {
          version: version2.version,
          changedBy: version2.changedBy,
          changedAt: version2.changedAt,
          changeNotes: version2.changeNotes,
          rawData: version2.rawData,
        },
        // Frontend will handle the actual diff visualization
      };

      return ServiceResponse.success("Versions compared", diff);
    } catch (error) {
      logger.error({ error, formId, v1, v2 }, "Error comparing versions");
      return ServiceResponse.failure(
        "Failed to compare versions",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get all changes between two non-consecutive versions
   * Returns a list of all intermediate changes with metadata
   * @param formId - Form ID
   * @param v1 - Start version
   * @param v2 - End version
   * @returns Promise<ServiceResponse with list of changes>
   */
  async getChangeList(
    formId: string,
    v1: number,
    v2: number
  ): Promise<ServiceResponse<FormVersion[] | null>> {
    try {
      const minVersion = Math.min(v1, v2);
      const maxVersion = Math.max(v1, v2);

      // Get all versions between v1 and v2 (inclusive)
      const versions = await FormVersionModel.find({
        formId,
        version: { $gte: minVersion, $lte: maxVersion },
      })
        .sort({ version: 1 })
        .select("version changedBy changedAt changeNotes isRestoration restoredFromVersion")
        .lean() as FormVersion[];

      return ServiceResponse.success("Change list retrieved", versions);
    } catch (error) {
      logger.error({ error, formId, v1, v2 }, "Error getting change list");
      return ServiceResponse.failure(
        "Failed to retrieve change list",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Prepare version restoration
   * Returns the version data to be applied to the form
   * The actual form update should be handled by the main form update flow
   * @param formId - Form ID
   * @param versionNumber - Version to restore
   * @param userId - User performing restoration
   * @returns Promise<ServiceResponse with version data>
   */
  async prepareRestore(
    formId: string,
    versionNumber: number,
    userId: string
  ): Promise<ServiceResponse<{ versionData: FormVersion; restorationNote: string } | null>> {
    try {
      const version = await FormVersionModel.findOne({
        formId,
        version: versionNumber,
      }).lean() as FormVersion;

      if (!version) {
        return ServiceResponse.failure("Version not found", null, StatusCodes.NOT_FOUND);
      }

      // Generate auto-restoration note
      const restorationNote = `Restored from version ${versionNumber} (${new Date(version.changedAt).toLocaleString()})`;

      return ServiceResponse.success("Restoration prepared", {
        versionData: version,
        restorationNote,
      });
    } catch (error) {
      logger.error({ error, formId, versionNumber }, "Error preparing restore");
      return ServiceResponse.failure(
        "Failed to prepare restoration",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async getVersionSnapshot(formId: string, versionNumber: number): Promise<{
    version: number;
    changedBy: string;
    changedAt: Date;
    changeNotes: string;
    rawData: Form["patientFormData"];
  } | null> {
    const backup = await FormVersionModel.findOne({ formId, version: versionNumber }).lean() as FormVersion | null;
    if (backup?.rawData) {
      return {
        version: backup.version,
        changedBy: String(backup.changedBy),
        changedAt: backup.changedAt,
        changeNotes: backup.changeNotes,
        rawData: backup.rawData,
      };
    }

    const form = await formRepository.getFormById(formId);
    if (form?.currentVersion === versionNumber && form.patientFormData) {
      return {
        version: versionNumber,
        changedBy: "current-form",
        changedAt: form.updatedAt || form.createdAt || new Date(),
        changeNotes: "Current form state",
        rawData: form.patientFormData,
      };
    }

    return null;
  }
}

export const formVersionService = new FormVersionService();
