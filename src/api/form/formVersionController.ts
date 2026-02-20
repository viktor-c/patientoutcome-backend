/**
 * @file Form Version Controller
 * @module api/form/formVersionController
 * @description Handles HTTP requests for form version operations (history, diff, restore)
 */

import { handleServiceResponse } from "@/common/utils/httpHandlers";
import type { Request, RequestHandler, Response } from "express";
import { formService } from "./formService";
import { formVersionService } from "./formVersionService";
import { logger } from "@/common/utils/logger";

class FormVersionController {
  /**
   * Get user context from request session
   */
  private getUserContext(req: Request) {
    return {
      userId: req.session.userId || "",
      username: req.session.username || "",
      roles: req.session.roles || [],
    };
  }

  /**
   * Check if user has admin or doctor role
   */
  private hasVersionAccessRights(roles: string[]): boolean {
    return roles.includes("admin") || roles.includes("doctor");
  }

  /**
   * Get version history for a form
   * @route GET /form/:formId/versions
   */
  public getVersionHistory: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { formId } = req.params;
      const userContext = this.getUserContext(req);

      // Only admin and doctors can view version history
      if (!this.hasVersionAccessRights(userContext.roles)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Only administrators and doctors can view version history",
        });
      }

      const serviceResponse = await formVersionService.getVersionHistory(formId);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error({ error }, "Error in getVersionHistory controller");
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get a specific version with full data
   * @route GET /form/:formId/version/:versionNumber
   */
  public getVersion: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { formId, versionNumber } = req.params;
      const userContext = this.getUserContext(req);

      // Only admin and doctors can view specific versions
      if (!this.hasVersionAccessRights(userContext.roles)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Only administrators and doctors can view versions",
        });
      }

      const version = parseInt(versionNumber, 10);
      if (isNaN(version) || version <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid version number",
        });
      }

      const serviceResponse = await formVersionService.getVersion(formId, version);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error({ error }, "Error in getVersion controller");
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Compare two versions (diff view)
   * @route GET /form/:formId/diff?v1=X&v2=Y
   */
  public compareVersions: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { formId } = req.params;
      const { v1, v2 } = req.query;
      const userContext = this.getUserContext(req);

      // Only admin and doctors can compare versions
      if (!this.hasVersionAccessRights(userContext.roles)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Only administrators and doctors can compare versions",
        });
      }

      const version1 = parseInt(v1 as string, 10);
      const version2 = parseInt(v2 as string, 10);

      if (isNaN(version1) || isNaN(version2) || version1 <= 0 || version2 <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid version numbers",
        });
      }

      const serviceResponse = await formVersionService.compareVersions(formId, version1, version2);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error({ error }, "Error in compareVersions controller");
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Get list of changes between two versions
   * @route GET /form/:formId/changes?v1=X&v2=Y
   */
  public getChangeList: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { formId } = req.params;
      const { v1, v2 } = req.query;
      const userContext = this.getUserContext(req);

      // Only admin and doctors can view change lists
      if (!this.hasVersionAccessRights(userContext.roles)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Only administrators and doctors can view change lists",
        });
      }

      const version1 = parseInt(v1 as string, 10);
      const version2 = parseInt(v2 as string, 10);

      if (isNaN(version1) || isNaN(version2) || version1 <= 0 || version2 <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid version numbers",
        });
      }

      const serviceResponse = await formVersionService.getChangeList(formId, version1, version2);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error({ error }, "Error in getChangeList controller");
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  /**
   * Restore a previous version
   * @route POST /form/:formId/restore/:versionNumber
   */
  public restoreVersion: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { formId, versionNumber } = req.params;
      const { changeNotes } = req.body || {};
      const userContext = this.getUserContext(req);

      // Only admin and doctors can restore versions
      if (!this.hasVersionAccessRights(userContext.roles)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Only administrators and doctors can restore versions",
        });
      }

      const version = parseInt(versionNumber, 10);
      if (isNaN(version) || version <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid version number",
        });
      }

      // Prepare restoration
      const prepareResponse = await formVersionService.prepareRestore(
        formId,
        version,
        userContext.userId
      );

      if (!prepareResponse.success || !prepareResponse.responseObject) {
        return handleServiceResponse(prepareResponse, res);
      }

      const { versionData, restorationNote } = prepareResponse.responseObject;

      // Use provided notes or auto-generated note
      const finalNotes = changeNotes || restorationNote;

      // Update the form with the old version data
      // This will trigger the normal versioning flow, creating a new version marked as restoration
      const updateResponse = await formService.updateForm(
        formId,
        {
          patientFormData: versionData.rawData,
          isRestoration: true,
          restoredFromVersion: version,
        },
        userContext
      );

      return handleServiceResponse(updateResponse, res);
    } catch (error) {
      logger.error({ error }, "Error in restoreVersion controller");
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
}

export const formVersionController = new FormVersionController();
