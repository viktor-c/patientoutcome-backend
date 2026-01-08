import { zId, zodSchemaRaw } from "@zodyac/zod-mongoose";
import mongoose from "mongoose";
import { z } from "zod";

/**
 * Storage type enum for backup destinations
 */
export const StorageTypeSchema = z.enum(["local", "s3", "sftp", "webdav"]);
export type StorageType = z.infer<typeof StorageTypeSchema>;

/**
 * Backup schedule frequency
 */
export const BackupFrequencySchema = z.enum(["daily", "weekly", "monthly", "custom"]);
export type BackupFrequency = z.infer<typeof BackupFrequencySchema>;

/**
 * Encrypted credentials for remote storage
 * The actual credential values are encrypted using AES-256-GCM
 */
export const BackupCredentialSchema = z.object({
  _id: zId().optional(),
  name: z.string().min(1).max(100),
  storageType: StorageTypeSchema,
  // Encrypted credential data (JSON stringified then encrypted)
  encryptedData: z.string(),
  // IV (Initialization Vector) for decryption
  iv: z.string(),
  // Auth tag for GCM mode
  authTag: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type BackupCredential = z.infer<typeof BackupCredentialSchema>;

/**
 * Backup job configuration
 * Defines automated backup schedules and their settings
 */
export const BackupJobSchema = z.object({
  _id: zId().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(true),
  
  // Schedule configuration
  frequency: BackupFrequencySchema,
  cronExpression: z.string().optional(), // For custom schedules
  
  // Storage configuration
  storageType: StorageTypeSchema,
  credentialId: zId("BackupCredential").optional().nullable(), // Reference to encrypted credentials
  
  // Backup options
  encryptionEnabled: z.boolean().default(false),
  encryptionPasswordHash: z.string().optional(), // bcrypt hash of the encryption password
  
  // Collections to include (empty array = all collections)
  collections: z.array(z.string()).default([]),
  
  // Department filter for future granular backups
  departmentId: zId("UserDepartment").optional().nullable(),
  
  // Retention policy
  retentionDays: z.number().int().min(1).max(365).default(30),
  
  // Last execution info
  lastRunAt: z.date().optional().nullable(),
  lastRunStatus: z.enum(["success", "failed", "running"]).optional().nullable(),
  lastRunError: z.string().optional().nullable(),
  
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  createdBy: zId("User").optional(),
});

export type BackupJob = z.infer<typeof BackupJobSchema>;

/**
 * Collection metadata for backup archives
 * Stores information about each collection in a backup
 */
export const CollectionMetadataSchema = z.object({
  name: z.string(),
  documentCount: z.number().int().min(0),
  lastModified: z.date().optional().nullable(),
  sizeBytes: z.number().int().min(0).optional(),
});

export type CollectionMetadata = z.infer<typeof CollectionMetadataSchema>;

/**
 * Backup history record
 * Tracks all backup executions for audit and management
 */
export const BackupHistorySchema = z.object({
  _id: zId().optional(),
  jobId: zId("BackupJob").optional().nullable(), // null for manual backups
  jobName: z.string().optional().nullable(),
  
  // Backup file information
  filename: z.string(),
  filePath: z.string(), // Relative path or storage identifier
  sizeBytes: z.number().int().min(0),
  
  // Backup metadata
  collections: z.array(CollectionMetadataSchema),
  isEncrypted: z.boolean().default(false),
  encryptedWithPassword: z.boolean().default(false),
  
  // Storage information
  storageType: StorageTypeSchema,
  storageLocation: z.string().optional(), // S3 bucket, SFTP path, etc.
  credentialId: zId("Credential").optional().nullable(), // For remote storage
  
  // Execution details
  startedAt: z.date(),
  completedAt: z.date().optional().nullable(),
  status: z.enum(["running", "completed", "failed"]),
  error: z.string().optional().nullable(),
  
  // Department filter (for future use)
  departmentId: zId("UserDepartment").optional().nullable(),
  
  createdBy: zId("User").optional(),
});

export type BackupHistory = z.infer<typeof BackupHistorySchema>;

/**
 * Restore operation tracking
 * Logs all restore operations for audit purposes
 */
export const RestoreHistorySchema = z.object({
  _id: zId().optional(),
  backupId: zId("BackupHistory"),
  backupFilename: z.string(),
  
  // Collections restored
  collectionsRestored: z.array(z.string()),
  
  // Restore mode: 'merge' or 'replace'
  restoreMode: z.enum(["merge", "replace"]),
  
  // Execution details
  startedAt: z.date(),
  completedAt: z.date().optional().nullable(),
  status: z.enum(["running", "completed", "failed"]),
  error: z.string().optional().nullable(),
  
  // Statistics
  documentsRestored: z.number().int().min(0).optional(),
  documentsSkipped: z.number().int().min(0).optional(),
  
  restoredBy: zId("User"),
});

export type RestoreHistory = z.infer<typeof RestoreHistorySchema>;

// Create Mongoose Schemas and Models

const MongooseBackupCredentialSchema = new mongoose.Schema(
  zodSchemaRaw(BackupCredentialSchema.omit({ _id: true })),
  { timestamps: true }
);

const MongooseBackupJobSchema = new mongoose.Schema(
  zodSchemaRaw(BackupJobSchema.omit({ _id: true })),
  { timestamps: true }
);

const MongooseBackupHistorySchema = new mongoose.Schema(
  zodSchemaRaw(BackupHistorySchema.omit({ _id: true })),
  { timestamps: false } // We manage timestamps manually for startedAt/completedAt
);

const MongooseRestoreHistorySchema = new mongoose.Schema(
  zodSchemaRaw(RestoreHistorySchema.omit({ _id: true })),
  { timestamps: false }
);

// Add indexes for performance
MongooseBackupJobSchema.index({ enabled: 1, lastRunAt: 1 });
MongooseBackupHistorySchema.index({ jobId: 1, startedAt: -1 });
MongooseBackupHistorySchema.index({ storageType: 1, status: 1 });
MongooseRestoreHistorySchema.index({ backupId: 1, startedAt: -1 });

export const backupCredentialModel = mongoose.model(
  "BackupCredential",
  MongooseBackupCredentialSchema,
  "backupcredentials"
);

export const backupJobModel = mongoose.model(
  "BackupJob",
  MongooseBackupJobSchema,
  "backupjobs"
);

export const backupHistoryModel = mongoose.model(
  "BackupHistory",
  MongooseBackupHistorySchema,
  "backuphistory"
);

export const restoreHistoryModel = mongoose.model(
  "RestoreHistory",
  MongooseRestoreHistorySchema,
  "restorehistory"
);
