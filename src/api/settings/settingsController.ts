/**
 * @file Settings Controller
 * @module api/settings
 * @description Handles HTTP requests for settings management
 */

import type { Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/common/utils/logger";
import { settingsService } from "./settingsService";
import type { SettingValues } from "./settingsModel";

/**
 * Settings Controller
 * Handles HTTP requests for reading and updating application settings
 */
class SettingsController {
  /**
   * Get all settings with metadata
   * @route GET /settings
   */
  public getSettings: RequestHandler = async (req: Request, res: Response) => {
    try {
      const settings = await settingsService.getSettings();
      const serviceResponse = ServiceResponse.success("Settings retrieved successfully", settings);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error({ error }, "Failed to get settings");
      const serviceResponse = ServiceResponse.failure(
        "Failed to retrieve settings",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Get only setting values (without metadata)
   * @route GET /settings/values
   */
  public getSettingValues: RequestHandler = async (req: Request, res: Response) => {
    try {
      const values = await settingsService.getSettingValues();
      const serviceResponse = ServiceResponse.success("Setting values retrieved successfully", values);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error({ error }, "Failed to get setting values");
      const serviceResponse = ServiceResponse.failure(
        "Failed to retrieve setting values",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Update settings
   * @route PUT /settings
   */
  public updateSettings: RequestHandler = async (req: Request, res: Response) => {
    try {
      const updates: SettingValues = req.body;

      // Validate that updates object is not empty
      if (!updates || Object.keys(updates).length === 0) {
        const serviceResponse = ServiceResponse.failure(
          "No updates provided",
          null,
          StatusCodes.BAD_REQUEST
        );
        return handleServiceResponse(serviceResponse, res);
      }

      const updatedSettings = await settingsService.updateSettings(updates);
      const serviceResponse = ServiceResponse.success("Settings updated successfully", updatedSettings);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error({ error, body: req.body }, "Failed to update settings");
      
      // Check if it's a validation error
      const errorMessage = error instanceof Error ? error.message : "Failed to update settings";
      const statusCode = errorMessage.includes("Invalid") || errorMessage.includes("must be")
        ? StatusCodes.BAD_REQUEST
        : StatusCodes.INTERNAL_SERVER_ERROR;

      const serviceResponse = ServiceResponse.failure(
        errorMessage,
        null,
        statusCode
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Get a specific setting value
   * @route GET /settings/:category/:field
   */
  public getSettingValue: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { category, field } = req.params;

      if (!category || !field) {
        const serviceResponse = ServiceResponse.failure(
          "Category and field are required",
          null,
          StatusCodes.BAD_REQUEST
        );
        return handleServiceResponse(serviceResponse, res);
      }

      const value = await settingsService.getSettingValue(category, field);

      if (value === undefined) {
        const serviceResponse = ServiceResponse.failure(
          `Setting ${category}.${field} not found`,
          null,
          StatusCodes.NOT_FOUND
        );
        return handleServiceResponse(serviceResponse, res);
      }

      const serviceResponse = ServiceResponse.success("Setting value retrieved successfully", { value });
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error({ error, params: req.params }, "Failed to get setting value");
      const serviceResponse = ServiceResponse.failure(
        "Failed to retrieve setting value",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };
}

export const settingsController = new SettingsController();
