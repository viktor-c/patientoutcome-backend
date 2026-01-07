import type { Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

import { BackupRepository } from "@/api/backup/backupRepository";
import { BackupService } from "@/api/backup/backupService";
import { getScheduler } from "@/api/backup/schedulerService";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/common/utils/logger";

/**
 * Backup Controller
 * Handles HTTP requests for database backup and restore operations
 */
class BackupController {
  private repository: BackupRepository;
  private backupService: BackupService;

  constructor() {
    this.repository = new BackupRepository();
    this.backupService = new BackupService();
  }

  // ============================================
  // Backup Jobs Management
  // ============================================

  /**
   * Get all backup jobs
   * @route GET /backup/jobs
   */
  public getAllBackupJobs: RequestHandler = async (req: Request, res: Response) => {
    try {
      const jobs = await this.repository.findAllBackupJobs();
      const serviceResponse = ServiceResponse.success("Backup jobs retrieved", jobs);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to get backup jobs");
      const serviceResponse = ServiceResponse.failure(
        "Failed to retrieve backup jobs",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Get a backup job by ID
   * @route GET /backup/jobs/:id
   */
  public getBackupJob: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const job = await this.repository.findBackupJobById(id);

      if (!job) {
        const serviceResponse = ServiceResponse.failure("Backup job not found", null, StatusCodes.NOT_FOUND);
        return handleServiceResponse(serviceResponse, res);
      }

      const serviceResponse = ServiceResponse.success("Backup job retrieved", job);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to get backup job");
      const serviceResponse = ServiceResponse.failure(
        "Failed to retrieve backup job",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Create a new backup job
   * @route POST /backup/jobs
   */
  public createBackupJob: RequestHandler = async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      const jobData = {
        ...req.body,
        createdBy: userId,
      };

      const job = await this.repository.createBackupJob(jobData);

      // Schedule the job if enabled
      if (job.enabled) {
        const scheduler = getScheduler();
        await scheduler.scheduleJob(job);
      }

      const serviceResponse = ServiceResponse.success("Backup job created", job, StatusCodes.CREATED);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to create backup job");
      const serviceResponse = ServiceResponse.failure(
        "Failed to create backup job",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Update a backup job
   * @route PUT /backup/jobs/:id
   */
  public updateBackupJob: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const job = await this.repository.updateBackupJob(id, updates);

      if (!job) {
        const serviceResponse = ServiceResponse.failure("Backup job not found", null, StatusCodes.NOT_FOUND);
        return handleServiceResponse(serviceResponse, res);
      }

      // Reschedule the job
      const scheduler = getScheduler();
      if (job.enabled) {
        await scheduler.rescheduleJob(job);
      } else {
        scheduler.unscheduleJob(id);
      }

      const serviceResponse = ServiceResponse.success("Backup job updated", job);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to update backup job");
      const serviceResponse = ServiceResponse.failure(
        "Failed to update backup job",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Delete a backup job
   * @route DELETE /backup/jobs/:id
   */
  public deleteBackupJob: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Unschedule the job first
      const scheduler = getScheduler();
      scheduler.unscheduleJob(id);

      const deleted = await this.repository.deleteBackupJob(id);

      if (!deleted) {
        const serviceResponse = ServiceResponse.failure("Backup job not found", null, StatusCodes.NOT_FOUND);
        return handleServiceResponse(serviceResponse, res);
      }

      const serviceResponse = ServiceResponse.success("Backup job deleted", null);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to delete backup job");
      const serviceResponse = ServiceResponse.failure(
        "Failed to delete backup job",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Manually trigger a backup job
   * @route POST /backup/jobs/:id/trigger
   */
  public triggerBackupJob: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const scheduler = getScheduler();
      await scheduler.triggerBackup(id);

      const serviceResponse = ServiceResponse.success("Backup job triggered", null);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to trigger backup job");
      const serviceResponse = ServiceResponse.failure(
        "Failed to trigger backup job",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  // ============================================
  // Manual Backup Operations
  // ============================================

  /**
   * Create a manual backup
   * @route POST /backup/create
   */
  public createManualBackup: RequestHandler = async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      const { collections, storageType, encryptionEnabled, password } = req.body;

      // Create a temporary job configuration for manual backup
      const jobConfig = {
        name: "Manual Backup",
        storageType: storageType || "local",
        collections: collections || [],
        encryptionEnabled: encryptionEnabled || false,
        encryptionPasswordHash: password ? await this.hashPassword(password) : undefined,
      };

      const result = await this.backupService.createBackup(jobConfig, userId);

      const serviceResponse = ServiceResponse.success("Backup created successfully", result);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to create manual backup");
      const serviceResponse = ServiceResponse.failure(
        "Failed to create backup",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Get backup history
   * @route GET /backup/history
   */
  public getBackupHistory: RequestHandler = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 100;
      const history = await this.repository.findAllBackupHistory({}, limit);

      const serviceResponse = ServiceResponse.success("Backup history retrieved", history);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to get backup history");
      const serviceResponse = ServiceResponse.failure(
        "Failed to retrieve backup history",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Get backup metadata
   * @route GET /backup/:id/metadata
   */
  public getBackupMetadata: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const metadata = await this.backupService.getBackupMetadata(id);

      const serviceResponse = ServiceResponse.success("Backup metadata retrieved", metadata);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to get backup metadata");
      const serviceResponse = ServiceResponse.failure(
        "Failed to retrieve backup metadata",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Download a backup file
   * @route GET /backup/:id/download
   */
  public downloadBackup: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const filePath = await this.backupService.getBackupFilePath(id);

      // Send file as download
      res.download(filePath, (err) => {
        if (err) {
          logger.error(err, "Failed to download backup file");
          res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to download backup file",
          });
        }
      });
    } catch (error) {
      logger.error(error, "Failed to download backup");
      const serviceResponse = ServiceResponse.failure(
        "Failed to download backup",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Upload and restore a backup
   * @route POST /backup/upload
   */
  public uploadBackup: RequestHandler = async (req: Request, res: Response) => {
    try {
      // File upload handling would be done by multer middleware
      // The uploaded file would be in req.file
      const file = (req as any).file;
      
      if (!file) {
        const serviceResponse = ServiceResponse.failure("No file uploaded", null, StatusCodes.BAD_REQUEST);
        return handleServiceResponse(serviceResponse, res);
      }

      // TODO: Process uploaded file and create backup history record
      // This would involve extracting metadata and storing in the database

      const serviceResponse = ServiceResponse.success("Backup uploaded successfully", {
        filename: file.originalname,
        size: file.size,
      });
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to upload backup");
      const serviceResponse = ServiceResponse.failure(
        "Failed to upload backup",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Restore a backup
   * @route POST /backup/:id/restore
   */
  public restoreBackup: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { collections, mode, password } = req.body;
      const userId = req.session?.userId;

      if (!userId) {
        const serviceResponse = ServiceResponse.failure(
          "Authentication required",
          null,
          StatusCodes.UNAUTHORIZED
        );
        return handleServiceResponse(serviceResponse, res);
      }

      const result = await this.backupService.restoreBackup(id, collections, mode, userId, password);

      const serviceResponse = ServiceResponse.success("Backup restored successfully", result);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to restore backup");
      const serviceResponse = ServiceResponse.failure(
        "Failed to restore backup",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Get restore history
   * @route GET /backup/restore/history
   */
  public getRestoreHistory: RequestHandler = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 100;
      const history = await this.repository.findAllRestoreHistory(limit);

      const serviceResponse = ServiceResponse.success("Restore history retrieved", history);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to get restore history");
      const serviceResponse = ServiceResponse.failure(
        "Failed to retrieve restore history",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  // ============================================
  // Credentials Management
  // ============================================

  /**
   * Get all credentials (without sensitive data)
   * @route GET /backup/credentials
   */
  public getAllCredentials: RequestHandler = async (req: Request, res: Response) => {
    try {
      const credentials = await this.repository.findAllCredentials();
      
      // Remove sensitive encrypted data from response
      const sanitized = credentials.map((cred) => ({
        _id: cred._id,
        name: cred.name,
        storageType: cred.storageType,
        createdAt: cred.createdAt,
        updatedAt: cred.updatedAt,
      }));

      const serviceResponse = ServiceResponse.success("Credentials retrieved", sanitized);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to get credentials");
      const serviceResponse = ServiceResponse.failure(
        "Failed to retrieve credentials",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Create new credentials
   * @route POST /backup/credentials
   */
  public createCredentials: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { name, storageType, credentials } = req.body;

      const credential = await this.backupService.createEncryptedCredential(name, storageType, credentials);

      const serviceResponse = ServiceResponse.success(
        "Credentials created",
        {
          _id: credential._id,
          name: credential.name,
          storageType: credential.storageType,
        },
        StatusCodes.CREATED
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to create credentials");
      const serviceResponse = ServiceResponse.failure(
        "Failed to create credentials",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Delete credentials
   * @route DELETE /backup/credentials/:id
   */
  public deleteCredentials: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.backupService.deleteCredential(id);

      const serviceResponse = ServiceResponse.success("Credentials deleted", null);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to delete credentials");
      const serviceResponse = ServiceResponse.failure(
        error instanceof Error ? error.message : "Failed to delete credentials",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  // ============================================
  // Database Info
  // ============================================

  /**
   * Get database collections info
   * @route GET /backup/collections
   */
  public getCollections: RequestHandler = async (req: Request, res: Response) => {
    try {
      const collections = await this.repository.getAllCollections();
      const metadata = await this.repository.getCollectionsMetadata(collections);

      const serviceResponse = ServiceResponse.success("Collections retrieved", metadata);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to get collections");
      const serviceResponse = ServiceResponse.failure(
        "Failed to retrieve collections",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  /**
   * Get database statistics
   * @route GET /backup/stats
   */
  public getDatabaseStats: RequestHandler = async (req: Request, res: Response) => {
    try {
      const stats = await this.repository.getDatabaseStats();

      const serviceResponse = ServiceResponse.success("Database statistics retrieved", stats);
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      logger.error(error, "Failed to get database stats");
      const serviceResponse = ServiceResponse.failure(
        "Failed to retrieve database statistics",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(serviceResponse, res);
    }
  };

  // ============================================
  // Utility Methods
  // ============================================

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import("bcrypt");
    return await bcrypt.hash(password, 10);
  }
}

export const backupController = new BackupController();
