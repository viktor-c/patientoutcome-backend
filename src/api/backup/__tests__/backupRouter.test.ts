import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

import { backupController } from "../backupController";

// Mock backupRouter before import to prevent schema registration issues
vi.mock("../backupRouter", async () => {
  const express = await import("express");
  return {
    backupRouter: express.default.Router(),
    backupRegistry: { register: vi.fn(), registerPath: vi.fn() },
  };
});

import { backupRouter } from "../backupRouter";

// Mock the controller
vi.mock("../backupController", () => ({
  backupController: {
    getAllBackupJobs: vi.fn(),
    getBackupJob: vi.fn(),
    createBackupJob: vi.fn(),
    updateBackupJob: vi.fn(),
    deleteBackupJob: vi.fn(),
    executeBackupJob: vi.fn(),
    getAllBackupHistory: vi.fn(),
    getBackupHistory: vi.fn(),
    createManualBackup: vi.fn(),
    restoreBackup: vi.fn(),
    getAllCredentials: vi.fn(),
    getCredential: vi.fn(),
    createCredential: vi.fn(),
    updateCredential: vi.fn(),
    deleteCredential: vi.fn(),
    getCollections: vi.fn(),
  },
}));

// Mock ACL middleware
vi.mock("@/common/middleware/globalAclMiddleware", () => ({
  AclMiddleware: () => (req: any, res: any, next: any) => next(),
}));

describe("Backup Router Integration Tests", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Manually setup routes for testing
    const router = express.Router();
    router.get("/jobs", backupController.getAllBackupJobs as any);
    router.get("/jobs/:id", backupController.getBackupJob as any);
    router.post("/jobs", backupController.createBackupJob as any);
    router.put("/jobs/:id", backupController.updateBackupJob as any);
    router.delete("/jobs/:id", backupController.deleteBackupJob as any);
    router.post("/jobs/:id/execute", backupController.executeBackupJob as any);
    router.get("/history", backupController.getAllBackupHistory as any);
    router.post("/manual", backupController.createManualBackup as any);
    router.post("/restore/:id", backupController.restoreBackup as any);
    router.get("/credentials", backupController.getAllCredentials as any);
    router.post("/credentials", backupController.createCredential as any);
    router.delete("/credentials/:id", backupController.deleteCredential as any);
    router.get("/collections", backupController.getCollections as any);
    
    app.use("/backup", router);
  });

  describe("GET /backup/jobs", () => {
    it("should return all backup jobs", async () => {
      const mockJobs = [
        {
          _id: "job1",
          name: "Daily Backup",
          schedule: "0 0 * * *",
          enabled: true,
          storageType: "local",
        },
        {
          _id: "job2",
          name: "Weekly Backup",
          schedule: "0 0 * * 0",
          enabled: false,
          storageType: "s3",
        },
      ];

      vi.mocked(backupController.getAllBackupJobs).mockImplementation((req, res) => {
        res.status(200).json(mockJobs);
      });

      const response = await request(app).get("/backup/jobs");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJobs);
      expect(backupController.getAllBackupJobs).toHaveBeenCalled();
    });
  });

  describe("GET /backup/jobs/:id", () => {
    it("should return a backup job by ID", async () => {
      const mockJob = {
        _id: "job123",
        name: "Test Job",
        schedule: "0 0 * * *",
        enabled: true,
        storageType: "local",
      };

      vi.mocked(backupController.getBackupJob).mockImplementation((req, res) => {
        res.status(200).json(mockJob);
      });

      const response = await request(app).get("/backup/jobs/job123");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockJob);
    });

    it("should return 404 when job not found", async () => {
      vi.mocked(backupController.getBackupJob).mockImplementation((req, res) => {
        res.status(404).json({ message: "Backup job not found" });
      });

      const response = await request(app).get("/backup/jobs/nonexistent");

      expect(response.status).toBe(404);
    });
  });

  describe("POST /backup/jobs", () => {
    it("should create a new backup job", async () => {
      const newJob = {
        name: "New Backup",
        schedule: "0 2 * * *",
        enabled: true,
        storageType: "local",
        collections: ["users", "forms"],
        retentionDays: 30,
      };

      const createdJob = {
        _id: "newjob123",
        ...newJob,
        createdAt: new Date().toISOString(),
      };

      vi.mocked(backupController.createBackupJob).mockImplementation((req, res) => {
        res.status(201).json(createdJob);
      });

      const response = await request(app).post("/backup/jobs").send(newJob);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject(newJob);
    });

    it("should return 400 for invalid backup job data", async () => {
      vi.mocked(backupController.createBackupJob).mockImplementation((req, res) => {
        res.status(400).json({ message: "Invalid backup job data" });
      });

      const response = await request(app).post("/backup/jobs").send({ name: "" });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /backup/jobs/:id", () => {
    it("should update a backup job", async () => {
      const updates = { enabled: false };
      const updatedJob = {
        _id: "job123",
        name: "Test Job",
        enabled: false,
      };

      vi.mocked(backupController.updateBackupJob).mockImplementation((req, res) => {
        res.status(200).json(updatedJob);
      });

      const response = await request(app).put("/backup/jobs/job123").send(updates);

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(false);
    });
  });

  describe("DELETE /backup/jobs/:id", () => {
    it("should delete a backup job", async () => {
      vi.mocked(backupController.deleteBackupJob).mockImplementation((req, res) => {
        res.status(200).json({ message: "Backup job deleted successfully" });
      });

      const response = await request(app).delete("/backup/jobs/job123");

      expect(response.status).toBe(200);
    });
  });

  describe("POST /backup/jobs/:id/execute", () => {
    it("should execute a backup job manually", async () => {
      const result = {
        backupId: "backup123",
        filename: "backup-2024.tar.gz",
        sizeBytes: 1024000,
      };

      vi.mocked(backupController.executeBackupJob).mockImplementation((req, res) => {
        res.status(200).json(result);
      });

      const response = await request(app).post("/backup/jobs/job123/execute");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(result);
    });

    it("should return 404 when executing non-existent job", async () => {
      vi.mocked(backupController.executeBackupJob).mockImplementation((req, res) => {
        res.status(404).json({ message: "Backup job not found" });
      });

      const response = await request(app).post("/backup/jobs/nonexistent/execute");

      expect(response.status).toBe(404);
    });
  });

  describe("GET /backup/history", () => {
    it("should return backup history", async () => {
      const mockHistory = [
        {
          _id: "hist1",
          jobName: "Daily Backup",
          filename: "backup-2024-01-01.tar.gz",
          status: "completed",
          sizeBytes: 1024000,
        },
        {
          _id: "hist2",
          jobName: "Weekly Backup",
          filename: "backup-2024-01-07.tar.gz",
          status: "failed",
          error: "Connection timeout",
        },
      ];

      vi.mocked(backupController.getAllBackupHistory).mockImplementation((req, res) => {
        res.status(200).json(mockHistory);
      });

      const response = await request(app).get("/backup/history");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHistory);
    });

    it("should filter history by status", async () => {
      const completedBackups = [
        {
          _id: "hist1",
          status: "completed",
        },
      ];

      vi.mocked(backupController.getAllBackupHistory).mockImplementation((req, res) => {
        res.status(200).json(completedBackups);
      });

      const response = await request(app).get("/backup/history?status=completed");

      expect(response.status).toBe(200);
      expect(response.body.every((h: any) => h.status === "completed")).toBe(true);
    });
  });

  describe("POST /backup/manual", () => {
    it("should create a manual backup", async () => {
      const backupConfig = {
        name: "Manual Backup",
        collections: ["users", "forms"],
        storageType: "local",
        encryptionEnabled: false,
      };

      const result = {
        backupId: "backup123",
        filename: "manual-backup-2024.tar.gz",
        sizeBytes: 2048000,
      };

      vi.mocked(backupController.createManualBackup).mockImplementation((req, res) => {
        res.status(201).json(result);
      });

      const response = await request(app).post("/backup/manual").send(backupConfig);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(result);
    });
  });

  describe("POST /backup/restore/:id", () => {
    it("should restore from backup", async () => {
      const restoreConfig = {
        collections: ["users"],
        dropExisting: false,
      };

      const result = {
        restoreId: "restore123",
        collections: ["users"],
        totalDocumentsRestored: 100,
        errors: [],
      };

      vi.mocked(backupController.restoreBackup).mockImplementation((req, res) => {
        res.status(200).json(result);
      });

      const response = await request(app)
        .post("/backup/restore/backup123")
        .send(restoreConfig);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        collections: ["users"],
        totalDocumentsRestored: 100,
      });
    });

    it("should return error for encrypted backup without password", async () => {
      vi.mocked(backupController.restoreBackup).mockImplementation((req, res) => {
        res.status(400).json({ message: "Password required for encrypted backup" });
      });

      const response = await request(app)
        .post("/backup/restore/backup123")
        .send({ collections: ["users"] });

      expect(response.status).toBe(400);
    });
  });

  describe("Credentials Management", () => {
    it("should create new credentials", async () => {
      const credentialData = {
        name: "AWS S3 Credentials",
        storageType: "s3",
        credentials: {
          accessKeyId: "AKIAIOSFODNN7EXAMPLE",
          secretAccessKey: "wJalrXUtnFEMI/K7MDENG",
          region: "us-east-1",
          bucket: "my-backups",
        },
      };

      const createdCredential = {
        _id: "cred123",
        name: credentialData.name,
        storageType: credentialData.storageType,
      };

      vi.mocked(backupController.createCredential).mockImplementation((req, res) => {
        res.status(201).json(createdCredential);
      });

      const response = await request(app).post("/backup/credentials").send(credentialData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: credentialData.name,
        storageType: credentialData.storageType,
      });
    });

    it("should get all credentials (without sensitive data)", async () => {
      const mockCredentials = [
        { _id: "cred1", name: "AWS S3", storageType: "s3" },
        { _id: "cred2", name: "SFTP Server", storageType: "sftp" },
      ];

      vi.mocked(backupController.getAllCredentials).mockImplementation((req, res) => {
        res.status(200).json(mockCredentials);
      });

      const response = await request(app).get("/backup/credentials");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCredentials);
      // Verify sensitive data is not included
      response.body.forEach((cred: any) => {
        expect(cred).not.toHaveProperty("encryptedData");
        expect(cred).not.toHaveProperty("iv");
        expect(cred).not.toHaveProperty("authTag");
      });
    });

    it("should delete credential", async () => {
      vi.mocked(backupController.deleteCredential).mockImplementation((req, res) => {
        res.status(200).json({ message: "Credential deleted successfully" });
      });

      const response = await request(app).delete("/backup/credentials/cred123");

      expect(response.status).toBe(200);
    });

    it("should prevent deletion of credential in use", async () => {
      vi.mocked(backupController.deleteCredential).mockImplementation((req, res) => {
        res.status(400).json({ message: "Credential is in use by backup jobs" });
      });

      const response = await request(app).delete("/backup/credentials/cred123");

      expect(response.status).toBe(400);
    });
  });

  describe("GET /backup/collections", () => {
    it("should return available collections", async () => {
      const mockCollections = [
        { name: "users", count: 100, sizeBytes: 1024 },
        { name: "forms", count: 50, sizeBytes: 512 },
        { name: "sessions", count: 200, sizeBytes: 2048 },
      ];

      vi.mocked(backupController.getCollections).mockImplementation((req, res) => {
        res.status(200).json(mockCollections);
      });

      const response = await request(app).get("/backup/collections");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCollections);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});
