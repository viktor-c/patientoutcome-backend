import cron from "node-cron";

import type { BackupJob } from "@/api/backup/backupModel";
import { BackupRepository } from "@/api/backup/backupRepository";
import { BackupService } from "@/api/backup/backupService";
import { logger } from "@/common/utils/logger";

/**
 * Cron schedule presets
 */
export const CRON_PRESETS = {
  daily: "0 2 * * *", // 2 AM every day
  weekly: "0 2 * * 0", // 2 AM every Sunday
  monthly: "0 2 1 * *", // 2 AM on the 1st of every month
} as const;

/**
 * Scheduled backup job instance
 */
interface ScheduledJob {
  jobId: string;
  cronJob: ReturnType<typeof cron.schedule>;
}

/**
 * Backup scheduler service
 * Manages scheduled backup jobs using node-cron
 */
export class BackupSchedulerService {
  private repository: BackupRepository;
  private backupService: BackupService;
  private scheduledJobs: Map<string, ScheduledJob>;
  private initialized = false;

  constructor() {
    this.repository = new BackupRepository();
    this.backupService = new BackupService();
    this.scheduledJobs = new Map();
  }

  /**
   * Initialize the scheduler and load all enabled backup jobs
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn("Backup scheduler already initialized");
      return;
    }

    try {
      // Load all enabled backup jobs
      const jobs = await this.repository.findAllBackupJobs({ enabled: true });
      
      logger.info(`Found ${jobs.length} enabled backup jobs to schedule`);

      for (const job of jobs) {
        try {
          await this.scheduleJob(job);
        } catch (error) {
          logger.error(error, `Failed to schedule backup job ${job._id}`);
        }
      }

      this.initialized = true;
      logger.info("Backup scheduler initialized successfully");
    } catch (error) {
      logger.error(error, "Failed to initialize backup scheduler");
      throw error;
    }
  }

  /**
   * Schedule a backup job
   */
  async scheduleJob(job: BackupJob): Promise<void> {
    const jobId = job._id!.toString();

    // Stop existing schedule if any
    this.unscheduleJob(jobId);

    if (!job.enabled) {
      logger.info(`Backup job ${jobId} is disabled, not scheduling`);
      return;
    }

    // Get cron expression
    const cronExpression = this.getCronExpression(job);

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Create scheduled task
    const cronJob = cron.schedule(
      cronExpression,
      async () => {
        await this.executeBackup(job);
      },
      {
        timezone: "UTC", // Use UTC for consistency
      }
    );

    this.scheduledJobs.set(jobId, { jobId, cronJob });

    logger.info(`Scheduled backup job ${jobId} (${job.name}) with cron: ${cronExpression}`);
  }

  /**
   * Unschedule a backup job
   */
  unscheduleJob(jobId: string): void {
    const scheduled = this.scheduledJobs.get(jobId);
    if (scheduled) {
      scheduled.cronJob.stop();
      this.scheduledJobs.delete(jobId);
      logger.info(`Unscheduled backup job ${jobId}`);
    }
  }

  /**
   * Reschedule a backup job (after update)
   */
  async rescheduleJob(job: BackupJob): Promise<void> {
    await this.scheduleJob(job);
  }

  /**
   * Execute a backup job
   */
  private async executeBackup(job: BackupJob): Promise<void> {
    const jobId = job._id!.toString();
    logger.info(`Starting scheduled backup for job ${jobId} (${job.name})`);

    try {
      // Update job status to running
      await this.repository.updateJobLastRun(jobId, "running");

      // Execute the backup
      const result = await this.backupService.createBackup(job);

      // Update job status to success
      await this.repository.updateJobLastRun(jobId, "success");

      logger.info(
        `Scheduled backup completed for job ${jobId}: ${result.filename} (${result.sizeBytes} bytes)`
      );

      // Check retention policy and delete old backups
      await this.cleanupOldBackups(job);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(error, `Scheduled backup failed for job ${jobId}`);

      // Update job status to failed
      await this.repository.updateJobLastRun(jobId, "failed", errorMessage);
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  private async cleanupOldBackups(job: BackupJob): Promise<void> {
    if (!job.retentionDays) {
      return;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - job.retentionDays);

      // Find old backups for this job
      const oldBackups = await this.repository.findAllBackupHistory(
        {
          jobId: job._id,
          startedAt: { $lt: cutoffDate },
          status: { $in: ["completed", "failed"] },
        },
        1000
      );

      logger.info(
        `Found ${oldBackups.length} old backups to delete for job ${job._id} (retention: ${job.retentionDays} days)`
      );

      // Delete old backup files and history records
      for (const backup of oldBackups) {
        try {
          // Delete the actual backup file from storage
          if (backup._id) {
            await this.backupService.deleteBackupFile(backup._id.toString());
            logger.info(`Cleaned up old backup: ${backup.filename}`);
          }
        } catch (error) {
          logger.error(error, `Failed to delete old backup ${backup.filename}`);
        }
      }
    } catch (error) {
      logger.error(error, `Failed to cleanup old backups for job ${job._id}`);
    }
  }

  /**
   * Get cron expression for a backup job
   */
  private getCronExpression(job: BackupJob): string {
    if (job.frequency === "custom" && job.cronExpression) {
      return job.cronExpression;
    }

    // Use type guard to safely access CRON_PRESETS
    const preset = job.frequency in CRON_PRESETS ? CRON_PRESETS[job.frequency as keyof typeof CRON_PRESETS] : CRON_PRESETS.daily;
    return preset;
  }

  /**
   * Get all scheduled jobs info
   */
  getScheduledJobs(): Array<{ jobId: string; isRunning: boolean }> {
    return Array.from(this.scheduledJobs.values()).map((scheduled) => ({
      jobId: scheduled.jobId,
      isRunning: true, // ScheduledTask is running if it exists in the map
    }));
  }

  /**
   * Stop the scheduler and all scheduled jobs
   */
  shutdown(): void {
    logger.info("Shutting down backup scheduler");

    for (const [jobId, scheduled] of this.scheduledJobs) {
      scheduled.cronJob.stop();
      logger.info(`Stopped scheduled job ${jobId}`);
    }

    this.scheduledJobs.clear();
    this.initialized = false;

    logger.info("Backup scheduler shutdown complete");
  }

  /**
   * Manually trigger a backup job execution (outside of schedule)
   */
  async triggerBackup(jobId: string): Promise<void> {
    const job = await this.repository.findBackupJobById(jobId);
    if (!job) {
      throw new Error("Backup job not found");
    }

    logger.info(`Manually triggering backup for job ${jobId} (${job.name})`);
    await this.executeBackup(job);
  }

  /**
   * Get next execution time for a job
   */
  getNextExecutionTime(job: BackupJob): Date | null {
    const cronExpression = this.getCronExpression(job);
    
    if (!cron.validate(cronExpression)) {
      return null;
    }

    // Parse cron expression and calculate next execution
    // This is a simplified version - for production, consider using a library like cron-parser
    const now = new Date();
    
    // For demonstration, we'll just return a rough estimate
    // In production, use proper cron parsing library
    if (job.frequency === "daily") {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(2, 0, 0, 0);
      return next;
    } else if (job.frequency === "weekly") {
      const next = new Date(now);
      next.setDate(next.getDate() + (7 - next.getDay()));
      next.setHours(2, 0, 0, 0);
      return next;
    } else if (job.frequency === "monthly") {
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1, 1);
      next.setHours(2, 0, 0, 0);
      return next;
    }

    return null;
  }

  /**
   * Validate a cron expression
   */
  static validateCronExpression(expression: string): boolean {
    return cron.validate(expression);
  }

  /**
   * Get human-readable description of a cron schedule
   */
  static describeCronSchedule(job: BackupJob): string {
    switch (job.frequency) {
      case "daily":
        return "Every day at 2:00 AM (UTC)";
      case "weekly":
        return "Every Sunday at 2:00 AM (UTC)";
      case "monthly":
        return "First day of every month at 2:00 AM (UTC)";
      case "custom":
        return job.cronExpression || "Custom schedule";
      default:
        return "Unknown schedule";
    }
  }
}

// Singleton instance
let schedulerInstance: BackupSchedulerService | null = null;

/**
 * Get the scheduler instance (singleton)
 */
export function getScheduler(): BackupSchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new BackupSchedulerService();
  }
  return schedulerInstance;
}

/**
 * Initialize the scheduler on application startup
 */
export async function initializeScheduler(): Promise<void> {
  const scheduler = getScheduler();
  await scheduler.initialize();
}

/**
 * Shutdown the scheduler on application shutdown
 */
export function shutdownScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.shutdown();
    schedulerInstance = null;
  }
}
