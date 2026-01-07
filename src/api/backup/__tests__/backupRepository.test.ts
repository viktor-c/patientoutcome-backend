import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

import { BackupRepository } from "../backupRepository";
import {
  backupJobModel,
  backupCredentialModel,
  backupHistoryModel,
  restoreHistoryModel,
} from "../backupModel";

// Mock the models
vi.mock("../backupModel", () => ({
  backupJobModel: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn(),
  },
  backupCredentialModel: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
  backupHistoryModel: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    deleteMany: vi.fn(),
  },
  restoreHistoryModel: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

describe("BackupRepository", () => {
  let repository: BackupRepository;

  beforeEach(() => {
    repository = new BackupRepository();
    vi.clearAllMocks();
  });

  describe("Backup Jobs", () => {
    it("should create a backup job", async () => {
      const jobData = {
        name: "Test Job",
        schedule: "0 0 * * *",
        storageType: "local" as const,
        enabled: true,
      };

      const mockJob = {
        _id: new mongoose.Types.ObjectId(),
        ...jobData,
        toObject: () => ({ _id: mockJob._id, ...jobData }),
      };

      vi.mocked(backupJobModel.create).mockResolvedValue(mockJob as any);

      const result = await repository.createBackupJob(jobData);

      expect(backupJobModel.create).toHaveBeenCalledWith(jobData);
      expect(result).toEqual({ _id: mockJob._id, ...jobData });
    });

    it("should find all backup jobs", async () => {
      const mockJobs = [
        { _id: "1", name: "Job 1", enabled: true },
        { _id: "2", name: "Job 2", enabled: false },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockJobs),
      };

      vi.mocked(backupJobModel.find).mockReturnValue(mockQuery as any);

      const result = await repository.findAllBackupJobs();

      expect(backupJobModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockJobs);
    });

    it("should find backup job by ID", async () => {
      const mockJob = { _id: "123", name: "Test Job" };

      const mockQuery = {
        lean: vi.fn().mockResolvedValue(mockJob),
      };

      vi.mocked(backupJobModel.findById).mockReturnValue(mockQuery as any);

      const result = await repository.findBackupJobById("123");

      expect(backupJobModel.findById).toHaveBeenCalledWith("123");
      expect(result).toEqual(mockJob);
    });

    it("should update backup job", async () => {
      const updates = { enabled: false };
      const mockJob = { _id: "123", name: "Test Job", ...updates };

      const mockQuery = {
        lean: vi.fn().mockResolvedValue(mockJob),
      };

      vi.mocked(backupJobModel.findByIdAndUpdate).mockReturnValue(mockQuery as any);

      const result = await repository.updateBackupJob("123", updates);

      expect(backupJobModel.findByIdAndUpdate).toHaveBeenCalledWith("123", updates, { new: true });
      expect(result).toEqual(mockJob);
    });

    it("should delete backup job", async () => {
      vi.mocked(backupJobModel.findByIdAndDelete).mockResolvedValue({ _id: "123" } as any);

      const result = await repository.deleteBackupJob("123");

      expect(backupJobModel.findByIdAndDelete).toHaveBeenCalledWith("123");
      expect(result).toBe(true);
    });

    it("should return false when deleting non-existent job", async () => {
      vi.mocked(backupJobModel.findByIdAndDelete).mockResolvedValue(null);

      const result = await repository.deleteBackupJob("nonexistent");

      expect(result).toBe(false);
    });

    it("should update job last run information", async () => {
      await repository.updateJobLastRun("123", "success");

      expect(backupJobModel.findByIdAndUpdate).toHaveBeenCalledWith("123", {
        lastRunAt: expect.any(Date),
        lastRunStatus: "success",
        lastRunError: null,
      });
    });

    it("should update job last run with error", async () => {
      const error = "Connection failed";
      await repository.updateJobLastRun("123", "failed", error);

      expect(backupJobModel.findByIdAndUpdate).toHaveBeenCalledWith("123", {
        lastRunAt: expect.any(Date),
        lastRunStatus: "failed",
        lastRunError: error,
      });
    });
  });

  describe("Backup Credentials", () => {
    it("should create credential", async () => {
      const credentialData = {
        name: "AWS Credentials",
        storageType: "s3" as const,
        encryptedData: "encrypted",
        iv: "iv",
        authTag: "tag",
      };

      const mockCredential = {
        _id: new mongoose.Types.ObjectId(),
        ...credentialData,
        toObject: () => ({ _id: mockCredential._id, ...credentialData }),
      };

      vi.mocked(backupCredentialModel.create).mockResolvedValue(mockCredential as any);

      const result = await repository.createCredential(credentialData);

      expect(backupCredentialModel.create).toHaveBeenCalledWith(credentialData);
      expect(result).toEqual({ _id: mockCredential._id, ...credentialData });
    });

    it("should find all credentials", async () => {
      const mockCredentials = [
        { _id: "1", name: "Cred 1" },
        { _id: "2", name: "Cred 2" },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockCredentials),
      };

      vi.mocked(backupCredentialModel.find).mockReturnValue(mockQuery as any);

      const result = await repository.findAllCredentials();

      expect(result).toEqual(mockCredentials);
    });

    it("should check if credential is in use", async () => {
      vi.mocked(backupJobModel.countDocuments).mockResolvedValue(2);

      const result = await repository.isCredentialInUse("cred123");

      expect(backupJobModel.countDocuments).toHaveBeenCalledWith({ credentialId: "cred123" });
      expect(result).toBe(true);
    });

    it("should return false when credential is not in use", async () => {
      vi.mocked(backupJobModel.countDocuments).mockResolvedValue(0);

      const result = await repository.isCredentialInUse("cred123");

      expect(result).toBe(false);
    });
  });

  describe("Backup History", () => {
    it("should create backup history", async () => {
      const historyData = {
        jobId: "job123",
        jobName: "Test Job",
        filename: "backup.tar.gz",
        status: "running" as const,
        startedAt: new Date(),
      };

      const mockHistory = {
        _id: new mongoose.Types.ObjectId(),
        ...historyData,
        toJSON: () => ({ _id: mockHistory._id, ...historyData }),
      };

      vi.mocked(backupHistoryModel.create).mockResolvedValue(mockHistory as any);

      const result = await repository.createBackupHistory(historyData);

      expect(result).toEqual({ _id: mockHistory._id, ...historyData });
    });

    it("should find all backup history with limit", async () => {
      const mockHistory = [
        { _id: "1", filename: "backup1.tar.gz" },
        { _id: "2", filename: "backup2.tar.gz" },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockHistory),
      };

      vi.mocked(backupHistoryModel.find).mockReturnValue(mockQuery as any);

      const result = await repository.findAllBackupHistory({}, 50);

      expect(backupHistoryModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.sort).toHaveBeenCalledWith({ startedAt: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(result).toEqual(mockHistory);
    });

    it("should complete backup with success status", async () => {
      await repository.completeBackup("hist123");

      expect(backupHistoryModel.findByIdAndUpdate).toHaveBeenCalledWith("hist123", {
        completedAt: expect.any(Date),
        status: "completed",
        error: null,
      });
    });

    it("should complete backup with failed status", async () => {
      const error = "Backup failed";
      await repository.completeBackup("hist123", error);

      expect(backupHistoryModel.findByIdAndUpdate).toHaveBeenCalledWith("hist123", {
        completedAt: expect.any(Date),
        status: "failed",
        error,
      });
    });
  });
});
