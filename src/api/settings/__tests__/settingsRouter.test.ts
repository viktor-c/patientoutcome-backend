/**
 * @file Settings Router Integration Tests
 * @module api/settings/__tests__
 * @description Integration tests for settings API endpoints
 */

import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import { settingsService } from "../settingsService";
import type { SettingsConfig } from "../settingsModel";

// Mock the settings service
vi.mock("../settingsService", () => ({
  settingsService: {
    getSettings: vi.fn(),
    getSettingValues: vi.fn(),
    updateSettings: vi.fn(),
    getSettingValue: vi.fn(),
  },
}));

// Mock ACL middleware to allow all requests in tests
vi.mock("@/common/middleware/globalAclMiddleware", () => ({
  AclMiddleware: () => (req: any, res: any, next: any) => next(),
}));

describe("Settings API Endpoints", () => {
  const mockSettingsConfig: SettingsConfig = {
    version: "1.0.0",
    settings: {
      smtp: {
        category: "email",
        priority: 1,
        fields: {
          SMTP_HOST: {
            value: "smtp.example.com",
            type: "string",
            required: true,
            sensitive: false,
            validation: {
              minLength: 1,
              maxLength: 255,
            },
            description: {
              en: "SMTP server hostname",
              de: "SMTP-Server Hostname",
            },
            helpText: {
              en: "Enter the hostname of your SMTP server",
              de: "Geben Sie den Hostnamen Ihres SMTP-Servers ein",
            },
          },
          SMTP_PORT: {
            value: "587",
            type: "number",
            required: true,
            sensitive: false,
            validation: {
              min: 1,
              max: 65535,
            },
            description: {
              en: "SMTP server port",
              de: "SMTP-Server Port",
            },
            helpText: {
              en: "Port number for SMTP",
              de: "Portnummer für SMTP",
            },
          },
        },
      },
      backup: {
        category: "system",
        priority: 2,
        fields: {
          BACKUP_RETENTION_DAYS: {
            value: "30",
            type: "number",
            required: false,
            sensitive: false,
            validation: {
              min: 1,
              max: 3650,
            },
            description: {
              en: "Backup retention days",
              de: "Backup-Aufbewahrungstage",
            },
            helpText: {
              en: "Number of days to keep backups",
              de: "Anzahl der Tage zum Aufbewahren von Backups",
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /settings", () => {
    it("should return all settings with metadata - success", async () => {
      vi.mocked(settingsService.getSettings).mockResolvedValue(mockSettingsConfig);

      const response = await request(app).get("/settings");
      const result: ServiceResponse<SettingsConfig> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(result.success).toBeTruthy();
      expect(result.message).toEqual("Settings retrieved successfully");
      expect(result.responseObject).toBeDefined();
      expect(result.responseObject?.version).toBe("1.0.0");
      expect(result.responseObject?.settings.smtp).toBeDefined();
      expect(result.responseObject?.settings.backup).toBeDefined();
    });

    it("should return 500 if service fails", async () => {
      vi.mocked(settingsService.getSettings).mockRejectedValue(
        new Error("Failed to read settings file")
      );

      const response = await request(app).get("/settings");
      const result: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(result.success).toBeFalsy();
      expect(result.message).toEqual("Failed to retrieve settings");
    });
  });

  describe("GET /settings/values", () => {
    it("should return only setting values - success", async () => {
      const mockValues = {
        smtp: {
          SMTP_HOST: "smtp.example.com",
          SMTP_PORT: "587",
        },
        backup: {
          BACKUP_RETENTION_DAYS: "30",
        },
      };

      vi.mocked(settingsService.getSettingValues).mockResolvedValue(mockValues);

      const response = await request(app).get("/settings/values");
      const result: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(result.success).toBeTruthy();
      expect(result.message).toEqual("Setting values retrieved successfully");
      expect(result.responseObject).toEqual(mockValues);
    });

    it("should return 500 if service fails", async () => {
      vi.mocked(settingsService.getSettingValues).mockRejectedValue(
        new Error("Failed to read settings")
      );

      const response = await request(app).get("/settings/values");
      const result: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(result.success).toBeFalsy();
    });
  });

  describe("PUT /settings", () => {
    it("should update settings successfully", async () => {
      const updates = {
        smtp: {
          SMTP_HOST: "smtp.gmail.com",
          SMTP_PORT: 465,
        },
      };

      const updatedConfig = { ...mockSettingsConfig };
      updatedConfig.settings.smtp.fields.SMTP_HOST.value = "smtp.gmail.com";
      updatedConfig.settings.smtp.fields.SMTP_PORT.value = "465";

      vi.mocked(settingsService.updateSettings).mockResolvedValue(updatedConfig);

      const response = await request(app).put("/settings").send(updates);
      const result: ServiceResponse<SettingsConfig> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(result.success).toBeTruthy();
      expect(result.message).toEqual("Settings updated successfully");
      expect(result.responseObject?.settings.smtp.fields.SMTP_HOST.value).toBe("smtp.gmail.com");
    });

    it("should return 400 if no updates provided", async () => {
      const response = await request(app).put("/settings").send({});
      const result: ServiceResponse<null> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(result.success).toBeFalsy();
      expect(result.message).toEqual("No updates provided");
    });

    it("should return 400 for validation errors", async () => {
      const updates = {
        smtp: {
          SMTP_PORT: 70000, // Invalid: exceeds max
        },
      };

      vi.mocked(settingsService.updateSettings).mockRejectedValue(
        new Error("SMTP_PORT: Value must be at most 65535")
      );

      const response = await request(app).put("/settings").send(updates);
      const result: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(result.success).toBeFalsy();
      expect(result.message).toContain("must be at most");
    });

    it("should return 400 for type validation errors", async () => {
      const updates = {
        smtp: {
          SMTP_PORT: "not-a-number",
        },
      };

      vi.mocked(settingsService.updateSettings).mockRejectedValue(
        new Error("Invalid type for smtp.SMTP_PORT: expected number, got string")
      );

      const response = await request(app).put("/settings").send(updates);
      const result: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(result.success).toBeFalsy();
      expect(result.message).toContain("Invalid");
    });

    it("should return 500 for other errors", async () => {
      const updates = {
        smtp: {
          SMTP_HOST: "smtp.gmail.com",
        },
      };

      vi.mocked(settingsService.updateSettings).mockRejectedValue(
        new Error("File system error")
      );

      const response = await request(app).put("/settings").send(updates);
      const result: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(result.success).toBeFalsy();
    });
  });

  describe("GET /settings/:category/:field", () => {
    it("should return specific setting value - success", async () => {
      vi.mocked(settingsService.getSettingValue).mockResolvedValue("smtp.example.com");

      const response = await request(app).get("/settings/smtp/SMTP_HOST");
      const result: ServiceResponse<{ value: string }> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(result.success).toBeTruthy();
      expect(result.message).toEqual("Setting value retrieved successfully");
      expect(result.responseObject?.value).toBe("smtp.example.com");
    });

    it("should return 404 if setting not found", async () => {
      vi.mocked(settingsService.getSettingValue).mockResolvedValue(undefined);

      const response = await request(app).get("/settings/smtp/NONEXISTENT");
      const result: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(result.success).toBeFalsy();
      expect(result.message).toContain("not found");
    });

    it("should return numeric value correctly", async () => {
      vi.mocked(settingsService.getSettingValue).mockResolvedValue(587);

      const response = await request(app).get("/settings/smtp/SMTP_PORT");
      const result: ServiceResponse<{ value: number }> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(result.responseObject?.value).toBe(587);
    });

    it("should return boolean value correctly", async () => {
      vi.mocked(settingsService.getSettingValue).mockResolvedValue(false);

      const response = await request(app).get("/settings/smtp/SMTP_SECURE");
      const result: ServiceResponse<{ value: boolean }> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(result.responseObject?.value).toBe(false);
    });

    it("should return 500 if service fails", async () => {
      vi.mocked(settingsService.getSettingValue).mockRejectedValue(
        new Error("File read error")
      );

      const response = await request(app).get("/settings/smtp/SMTP_HOST");
      const result: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(result.success).toBeFalsy();
      expect(result.message).toEqual("Failed to retrieve setting value");
    });
  });
});
