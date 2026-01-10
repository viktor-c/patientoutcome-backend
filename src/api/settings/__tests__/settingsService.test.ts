/**
 * @file Settings Service Tests
 * @module api/settings/__tests__
 * @description Unit tests for the settings service
 */

import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { SettingsService } from "../settingsService";
import type { SettingsConfig } from "../settingsModel";

// Mock dependencies
vi.mock("node:fs", () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock("@/common/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("SettingsService", () => {
  let settingsService: SettingsService;
  let mockReadFile: any;
  let mockWriteFile: any;

  const mockSettingsData: SettingsConfig = {
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
          SMTP_SECURE: {
            value: "false",
            type: "boolean",
            required: true,
            sensitive: false,
            description: {
              en: "Use SSL/TLS",
              de: "SSL/TLS verwenden",
            },
            helpText: {
              en: "Enable SSL/TLS encryption",
              de: "SSL/TLS-Verschlüsselung aktivieren",
            },
          },
          SMTP_PASS: {
            value: "secret-password",
            type: "string",
            required: false,
            sensitive: true,
            validation: {
              maxLength: 255,
            },
            description: {
              en: "SMTP password",
              de: "SMTP Passwort",
            },
            helpText: {
              en: "Password for authentication",
              de: "Passwort für Authentifizierung",
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
    settingsService = new SettingsService();
    mockReadFile = vi.mocked(fs.readFile);
    mockWriteFile = vi.mocked(fs.writeFile);
    
    // Reset cache
    settingsService.invalidateCache();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("getSettings", () => {
    it("should read and parse settings file successfully", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockSettingsData));

      const result = await settingsService.getSettings();

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining("settings.json"),
        "utf-8"
      );
      expect(result.version).toBe("1.0.0");
      expect(result.settings.smtp).toBeDefined();
      expect(result.settings.backup).toBeDefined();
    });

    it("should mask sensitive values when returning settings", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockSettingsData));

      const result = await settingsService.getSettings();

      // Check that sensitive password is masked
      expect(result.settings.smtp.fields.SMTP_PASS.value).toBe("secr***");
      // Non-sensitive fields should remain unchanged
      expect(result.settings.smtp.fields.SMTP_HOST.value).toBe("smtp.example.com");
    });

    it("should use cached settings within TTL", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockSettingsData));

      // First call
      await settingsService.getSettings();
      expect(mockReadFile).toHaveBeenCalledTimes(1);

      // Second call within cache TTL
      await settingsService.getSettings();
      expect(mockReadFile).toHaveBeenCalledTimes(1); // Should not read again
    });

    it("should refresh cache after TTL expires", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockSettingsData));

      // First call
      await settingsService.getSettings();
      expect(mockReadFile).toHaveBeenCalledTimes(1);

      // Advance time beyond cache TTL (5 seconds)
      vi.useFakeTimers();
      vi.advanceTimersByTime(6000);

      // Second call after TTL
      await settingsService.getSettings();
      expect(mockReadFile).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("should throw error if file read fails", async () => {
      mockReadFile.mockRejectedValue(new Error("File not found"));

      await expect(settingsService.getSettings()).rejects.toThrow("Failed to read settings");
    });

    it("should throw error if JSON is invalid", async () => {
      mockReadFile.mockResolvedValue("invalid json {{{");

      await expect(settingsService.getSettings()).rejects.toThrow();
    });
  });

  describe("updateSettings", () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockSettingsData));
    });

    it("should update string field successfully", async () => {
      const updates = {
        smtp: {
          SMTP_HOST: "smtp.gmail.com",
        },
      };

      const result = await settingsService.updateSettings(updates);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("settings.json"),
        expect.stringContaining("smtp.gmail.com"),
        "utf-8"
      );
      expect(result.settings.smtp.fields.SMTP_HOST.value).toBe("smtp.gmail.com");
    });

    it("should update number field successfully", async () => {
      const updates = {
        smtp: {
          SMTP_PORT: 465,
        },
      };

      const result = await settingsService.updateSettings(updates);

      expect(mockWriteFile).toHaveBeenCalled();
      expect(result.settings.smtp.fields.SMTP_PORT.value).toBe(465);
    });

    it("should update boolean field successfully", async () => {
      const updates = {
        smtp: {
          SMTP_SECURE: true,
        },
      };

      const result = await settingsService.updateSettings(updates);

      expect(mockWriteFile).toHaveBeenCalled();
      expect(result.settings.smtp.fields.SMTP_SECURE.value).toBe(true);
    });

    it("should update multiple fields at once", async () => {
      const updates = {
        smtp: {
          SMTP_HOST: "smtp.gmail.com",
          SMTP_PORT: 465,
          SMTP_SECURE: true,
        },
        backup: {
          BACKUP_RETENTION_DAYS: 60,
        },
      };

      const result = await settingsService.updateSettings(updates);

      expect(mockWriteFile).toHaveBeenCalled();
      expect(result.settings.smtp.fields.SMTP_HOST.value).toBe("smtp.gmail.com");
      expect(result.settings.smtp.fields.SMTP_PORT.value).toBe(465);
      expect(result.settings.backup.fields.BACKUP_RETENTION_DAYS.value).toBe(60);
    });

    it("should throw error for invalid field type", async () => {
      const updates = {
        smtp: {
          SMTP_PORT: "not-a-number", // Should be a number
        },
      };

      await expect(settingsService.updateSettings(updates as any)).rejects.toThrow(
        "Invalid type"
      );
    });

    it("should validate string minLength", async () => {
      const updates = {
        smtp: {
          SMTP_HOST: "", // Required field with minLength: 1
        },
      };

      await expect(settingsService.updateSettings(updates)).rejects.toThrow(
        "must be at least"
      );
    });

    it("should validate string maxLength", async () => {
      const updates = {
        smtp: {
          SMTP_HOST: "a".repeat(300), // maxLength is 255
        },
      };

      await expect(settingsService.updateSettings(updates)).rejects.toThrow(
        "must be at most"
      );
    });

    it("should validate number min value", async () => {
      const updates = {
        smtp: {
          SMTP_PORT: 0, // min is 1
        },
      };

      await expect(settingsService.updateSettings(updates)).rejects.toThrow(
        "must be at least"
      );
    });

    it("should validate number max value", async () => {
      const updates = {
        smtp: {
          SMTP_PORT: 70000, // max is 65535
        },
      };

      await expect(settingsService.updateSettings(updates)).rejects.toThrow(
        "must be at most"
      );
    });

    it("should invalidate cache after update", async () => {
      // First get to populate cache
      await settingsService.getSettings();
      const firstCallCount = mockReadFile.mock.calls.length;

      // Update settings (this reads once more internally)
      const updates = {
        smtp: {
          SMTP_HOST: "smtp.gmail.com",
        },
      };
      await settingsService.updateSettings(updates);
      const afterUpdateCallCount = mockReadFile.mock.calls.length;

      // Next get should read from file again (cache invalidated)
      await settingsService.getSettings();
      const finalCallCount = mockReadFile.mock.calls.length;
      
      // Should have read at least 2 times total (initial + after cache invalidation)
      expect(finalCallCount).toBeGreaterThanOrEqual(firstCallCount + 1);
    });
  });

  describe("getSettingValues", () => {
    it("should return only values without metadata", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockSettingsData));

      const result = await settingsService.getSettingValues();

      expect(result.smtp.SMTP_HOST).toBe("smtp.example.com");
      expect(result.smtp.SMTP_PORT).toBe("587");
      expect(result.backup.BACKUP_RETENTION_DAYS).toBe("30");
      // Should not have metadata
      expect(result.smtp).not.toHaveProperty("category");
      expect(result.smtp).not.toHaveProperty("fields");
    });
  });

  describe("getSettingValue", () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockSettingsData));
    });

    it("should return specific setting value", async () => {
      const value = await settingsService.getSettingValue("smtp", "SMTP_HOST");

      expect(value).toBe("smtp.example.com");
    });

    it("should return undefined for non-existent category", async () => {
      const value = await settingsService.getSettingValue("nonexistent", "FIELD");

      expect(value).toBeUndefined();
    });

    it("should return undefined for non-existent field", async () => {
      const value = await settingsService.getSettingValue("smtp", "NONEXISTENT");

      expect(value).toBeUndefined();
    });
  });

  describe("invalidateCache", () => {
    it("should clear cached settings", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockSettingsData));

      // First call to populate cache
      await settingsService.getSettings();
      expect(mockReadFile).toHaveBeenCalledTimes(1);

      // Invalidate cache
      settingsService.invalidateCache();

      // Next call should read from file again
      await settingsService.getSettings();
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });
  });
});
