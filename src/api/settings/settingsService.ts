/**
 * @file Settings Service
 * @module api/settings
 * @description Service layer for managing application settings stored in JSON file
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { logger } from "@/common/utils/logger";
import type { SettingsConfig, SettingValues } from "./settingsModel";
import { SettingsConfigSchema } from "./settingsModel";

/**
 * Settings Service
 * Handles reading and writing of application settings from/to JSON file
 */
export class SettingsService {
  private settingsFilePath: string;
  private cachedSettings: SettingsConfig | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds cache TTL

  constructor() {
    // Path to settings.json file
    this.settingsFilePath = path.join(__dirname, "../../config/settings.json");
  }

  /**
   * Get all settings with metadata
   * @returns Complete settings configuration including descriptions and validation rules
   */
  async getSettings(): Promise<SettingsConfig> {
    try {
      // Check if cache is still valid
      const now = Date.now();
      if (this.cachedSettings && now - this.cacheTimestamp < this.CACHE_TTL) {
        return this.cachedSettings;
      }

      // Read settings from file
      const fileContent = await fs.readFile(this.settingsFilePath, "utf-8");
      const settings = JSON.parse(fileContent);

      // Validate settings against schema
      const validatedSettings = SettingsConfigSchema.parse(settings);

      // Update cache
      this.cachedSettings = validatedSettings;
      this.cacheTimestamp = now;

      // Mask sensitive values before returning
      return this.maskSensitiveValues(validatedSettings);
    } catch (error) {
      logger.error({ error, path: this.settingsFilePath }, "Failed to read settings file");
      throw new Error(`Failed to read settings: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update setting values
   * @param updates Object containing category and field names with new values
   * @returns Updated settings configuration
   */
  async updateSettings(updates: SettingValues): Promise<SettingsConfig> {
    try {
      // Read current settings
      const fileContent = await fs.readFile(this.settingsFilePath, "utf-8");
      const currentSettings = JSON.parse(fileContent) as SettingsConfig;

      // Apply updates
      for (const [categoryKey, categoryUpdates] of Object.entries(updates)) {
        if (currentSettings.settings[categoryKey]) {
          for (const [fieldKey, newValue] of Object.entries(categoryUpdates)) {
            if (currentSettings.settings[categoryKey].fields[fieldKey]) {
              const field = currentSettings.settings[categoryKey].fields[fieldKey];

              // Validate type
              if (!this.validateFieldType(newValue, field.type)) {
                throw new Error(
                  `Invalid type for ${categoryKey}.${fieldKey}: expected ${field.type}, got ${typeof newValue}`
                );
              }

              // Validate field value
              if (field.validation) {
                this.validateFieldValue(fieldKey, newValue, field.validation, field.type);
              }

              // Update value
              field.value = newValue;
            }
          }
        }
      }

      // Validate complete settings structure
      const validatedSettings = SettingsConfigSchema.parse(currentSettings);

      // Write back to file
      await fs.writeFile(
        this.settingsFilePath,
        JSON.stringify(validatedSettings, null, 2),
        "utf-8"
      );

      // Invalidate cache
      this.cachedSettings = null;
      this.cacheTimestamp = 0;

      logger.info({ updates: Object.keys(updates) }, "Settings updated successfully");

      // Return masked settings
      return this.maskSensitiveValues(validatedSettings);
    } catch (error) {
      logger.error({ error, updates }, "Failed to update settings");
      throw new Error(`Failed to update settings: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get only the current values of all settings (without metadata)
   * @returns Object with category and field values only
   */
  async getSettingValues(): Promise<SettingValues> {
    const settings = await this.getSettings();
    const values: SettingValues = {};

    for (const [categoryKey, category] of Object.entries(settings.settings)) {
      values[categoryKey] = {};
      for (const [fieldKey, field] of Object.entries(category.fields)) {
        values[categoryKey][fieldKey] = field.value;
      }
    }

    return values;
  }

  /**
   * Get a specific setting value
   * @param category Setting category name
   * @param field Setting field name
   * @returns The setting value
   */
  async getSettingValue(category: string, field: string): Promise<string | number | boolean | undefined> {
    const settings = await this.getSettings();
    return settings.settings[category]?.fields[field]?.value;
  }

  /**
   * Validate field type
   */
  private validateFieldType(
    value: string | number | boolean,
    expectedType: "string" | "number" | "boolean"
  ): boolean {
    const actualType = typeof value;
    return actualType === expectedType;
  }

  /**
   * Validate field value against validation rules
   */
  private validateFieldValue(
    fieldKey: string,
    value: string | number | boolean,
    validation: {
      minLength?: number;
      maxLength?: number;
      min?: number;
      max?: number;
      pattern?: string;
    },
    type: string
  ): void {
    // String validations
    if (type === "string" && typeof value === "string") {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        throw new Error(`${fieldKey}: Value must be at least ${validation.minLength} characters long`);
      }
      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        throw new Error(`${fieldKey}: Value must be at most ${validation.maxLength} characters long`);
      }
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          throw new Error(`${fieldKey}: Value does not match required pattern`);
        }
      }
    }

    // Number validations
    if (type === "number" && typeof value === "number") {
      if (validation.min !== undefined && value < validation.min) {
        throw new Error(`${fieldKey}: Value must be at least ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        throw new Error(`${fieldKey}: Value must be at most ${validation.max}`);
      }
    }
  }

  /**
   * Mask sensitive values in settings (replace with asterisks if value exists)
   */
  private maskSensitiveValues(settings: SettingsConfig): SettingsConfig {
    const maskedSettings = JSON.parse(JSON.stringify(settings)) as SettingsConfig;

    for (const category of Object.values(maskedSettings.settings)) {
      for (const field of Object.values(category.fields)) {
        if (field.sensitive && field.value && field.value !== "") {
          // Show only first 4 chars for non-empty sensitive fields
          const stringValue = String(field.value);
          if (stringValue.length > 4) {
            field.value = stringValue.substring(0, 4) + "***";
          } else {
            field.value = "***";
          }
        }
      }
    }

    return maskedSettings;
  }

  /**
   * Invalidate settings cache (useful after external modifications)
   */
  public invalidateCache(): void {
    this.cachedSettings = null;
    this.cacheTimestamp = 0;
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
