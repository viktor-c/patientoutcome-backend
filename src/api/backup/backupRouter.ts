/**
 * @file Backup Router
 * @module api/backup
 * @description Manages database backup and restore operations. Handles manual and automated backups,
 * backup job scheduling, storage configuration, and restore operations with granular collection selection.
 */

import { AclMiddleware } from "@/common/middleware/globalAclMiddleware";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import multer from "multer";
import path from "path";
import { z } from "zod";

import { createApiResponses } from "@/api-docs/openAPIResponseBuilders";
import {
  BackupCredentialSchema,
  BackupFrequencySchema,
  BackupHistorySchema,
  BackupJobSchema,
  CollectionMetadataSchema,
  RestoreHistorySchema,
  StorageTypeSchema,
} from "@/api/backup/backupModel";
import { backupController } from "./backupController";
import { env } from "@/common/utils/envConfig";
import { validateRequest } from "@/common/utils/httpHandlers";

// Initialize OpenAPI registry
export const backupRegistry = new OpenAPIRegistry();

// Create Express router
export const backupRouter: Router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(env.BACKUP_STORAGE_PATH, "uploads"),
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
  },
  fileFilter: (req, file, cb) => {
    // Only accept tar.gz files
    if (file.originalname.endsWith(".tar.gz") || file.originalname.endsWith(".tgz")) {
      cb(null, true);
    } else {
      cb(new Error("Only .tar.gz files are allowed"));
    }
  },
});

// Register schemas
backupRegistry.register("BackupJob", BackupJobSchema);
backupRegistry.register("BackupHistory", BackupHistorySchema);
backupRegistry.register("RestoreHistory", RestoreHistorySchema);
backupRegistry.register("BackupCredential", BackupCredentialSchema);
backupRegistry.register("CollectionMetadata", CollectionMetadataSchema);
backupRegistry.register("BackupJobArray", z.array(BackupJobSchema));
backupRegistry.register("BackupHistoryArray", z.array(BackupHistorySchema));

// ============================================
// Backup Jobs Routes
// ============================================

const CreateBackupJobSchema = z.object({
  body: BackupJobSchema.omit({ _id: true, createdAt: true, updatedAt: true, lastRunAt: true, lastRunStatus: true, lastRunError: true }),
});

backupRegistry.registerPath({
  method: "get",
  path: "/backup/jobs",
  tags: ["Backup"],
  operationId: "getAllBackupJobs",
  description: "Get all backup jobs",
  summary: "Get all backup jobs",
  responses: createApiResponses([
    {
      schema: z.array(BackupJobSchema),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.get(
  "/jobs",
  validateRequest(z.object({})),
  AclMiddleware("backup-jobs-get-all"),
  backupController.getAllBackupJobs
);

backupRegistry.registerPath({
  method: "get",
  path: "/backup/jobs/{id}",
  tags: ["Backup"],
  operationId: "getBackupJob",
  description: "Get a backup job by ID",
  summary: "Get backup job",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: createApiResponses([
    {
      schema: BackupJobSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Backup job not found",
      statusCode: 404,
    },
  ]),
});

backupRouter.get(
  "/jobs/:id",
  validateRequest(z.object({ params: z.object({ id: z.string() }) })),
  AclMiddleware("backup-jobs-get"),
  backupController.getBackupJob
);

backupRegistry.registerPath({
  method: "post",
  path: "/backup/jobs",
  tags: ["Backup"],
  operationId: "createBackupJob",
  description: "Create a new backup job",
  summary: "Create backup job",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateBackupJobSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: BackupJobSchema,
      description: "Created",
      statusCode: 201,
    },
  ]),
});

backupRouter.post(
  "/jobs",
  validateRequest(z.object({ body: CreateBackupJobSchema.shape.body })),
  AclMiddleware("backup-jobs-create"),
  backupController.createBackupJob
);

backupRegistry.registerPath({
  method: "put",
  path: "/backup/jobs/{id}",
  tags: ["Backup"],
  operationId: "updateBackupJob",
  description: "Update a backup job",
  summary: "Update backup job",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": { schema: BackupJobSchema.partial() },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: BackupJobSchema,
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Backup job not found",
      statusCode: 404,
    },
  ]),
});

backupRouter.put(
  "/jobs/:id",
  validateRequest(z.object({ params: z.object({ id: z.string() }), body: BackupJobSchema.partial() })),
  AclMiddleware("backup-jobs-update"),
  backupController.updateBackupJob
);

backupRegistry.registerPath({
  method: "delete",
  path: "/backup/jobs/{id}",
  tags: ["Backup"],
  operationId: "deleteBackupJob",
  description: "Delete a backup job",
  summary: "Delete backup job",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Success",
      statusCode: 200,
    },
    {
      schema: z.object({ message: z.string() }),
      description: "Backup job not found",
      statusCode: 404,
    },
  ]),
});

backupRouter.delete(
  "/jobs/:id",
  validateRequest(z.object({ params: z.object({ id: z.string() }) })),
  AclMiddleware("backup-jobs-delete"),
  backupController.deleteBackupJob
);

backupRegistry.registerPath({
  method: "post",
  path: "/backup/jobs/{id}/trigger",
  tags: ["Backup"],
  operationId: "triggerBackupJob",
  description: "Manually trigger a backup job execution",
  summary: "Trigger backup job",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.post(
  "/jobs/:id/trigger",
  validateRequest(z.object({ params: z.object({ id: z.string() }) })),
  AclMiddleware("backup-jobs-trigger"),
  backupController.triggerBackupJob
);

// ============================================
// Manual Backup Operations
// ============================================

const CreateManualBackupSchema = z.object({
  body: z.object({
    collections: z.array(z.string()).optional(),
    storageType: StorageTypeSchema.optional(),
    encryptionEnabled: z.boolean().optional(),
    password: z.string().optional(),
  }),
});

backupRegistry.registerPath({
  method: "post",
  path: "/backup/create",
  tags: ["Backup"],
  operationId: "createManualBackup",
  description: "Create a manual database backup",
  summary: "Create manual backup",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateManualBackupSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: z.object({
        backupId: z.string(),
        filename: z.string(),
        sizeBytes: z.number(),
      }),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.post(
  "/create",
  validateRequest(z.object({ body: CreateManualBackupSchema.shape.body })),
  AclMiddleware("backup-create"),
  backupController.createManualBackup
);

backupRegistry.registerPath({
  method: "get",
  path: "/backup/history",
  tags: ["Backup"],
  operationId: "getBackupHistory",
  description: "Get backup history",
  summary: "Get backup history",
  request: {
    query: z.object({ limit: z.string().optional() }),
  },
  responses: createApiResponses([
    {
      schema: z.array(BackupHistorySchema),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.get(
  "/history",
  validateRequest(z.object({ query: z.object({ limit: z.string().optional() }) })),
  AclMiddleware("backup-history-get"),
  backupController.getBackupHistory
);

backupRegistry.registerPath({
  method: "get",
  path: "/backup/{id}/metadata",
  tags: ["Backup"],
  operationId: "getBackupMetadata",
  description: "Get backup metadata without restoring",
  summary: "Get backup metadata",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: createApiResponses([
    {
      schema: z.object({
        version: z.string(),
        createdAt: z.string(),
        collections: z.array(CollectionMetadataSchema),
        databaseName: z.string(),
        isEncrypted: z.boolean(),
      }),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.get(
  "/:id/metadata",
  validateRequest(z.object({ params: z.object({ id: z.string() }) })),
  AclMiddleware("backup-metadata-get"),
  backupController.getBackupMetadata
);

backupRegistry.registerPath({
  method: "get",
  path: "/backup/{id}/download",
  tags: ["Backup"],
  operationId: "downloadBackup",
  description: "Download a backup file",
  summary: "Download backup",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: createApiResponses([
    {
      schema: z.any(), // File download
      description: "Success - file download",
      statusCode: 200,
    },
  ]),
});

backupRouter.get(
  "/:id/download",
  validateRequest(z.object({ params: z.object({ id: z.string() }) })),
  AclMiddleware("backup-download"),
  backupController.downloadBackup
);

backupRegistry.registerPath({
  method: "post",
  path: "/backup/upload",
  tags: ["Backup"],
  operationId: "uploadBackup",
  description: "Upload a backup file",
  summary: "Upload backup",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any(),
          }),
        },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: z.object({
        filename: z.string(),
        size: z.number(),
      }),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.post(
  "/upload",
  validateRequest(z.object({})),
  AclMiddleware("backup-upload"),
  upload.single("file"),
  backupController.uploadBackup
);

const RestoreBackupSchema = z.object({
  body: z.object({
    collections: z.array(z.string()),
    mode: z.enum(["merge", "replace"]),
    password: z.string().optional(),
  }),
});

backupRegistry.registerPath({
  method: "post",
  path: "/backup/{id}/restore",
  tags: ["Backup"],
  operationId: "restoreBackup",
  description: "Restore a backup",
  summary: "Restore backup",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": { schema: RestoreBackupSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: z.object({
        collections: z.array(z.string()),
        totalDocumentsRestored: z.number(),
        totalDocumentsSkipped: z.number(),
        errors: z.array(z.string()),
      }),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.post(
  "/:id/restore",
  validateRequest(z.object({ params: z.object({ id: z.string() }), body: RestoreBackupSchema.shape.body })),
  AclMiddleware("backup-restore"),
  backupController.restoreBackup
);

backupRegistry.registerPath({
  method: "get",
  path: "/backup/restore/history",
  tags: ["Backup"],
  operationId: "getRestoreHistory",
  description: "Get restore history",
  summary: "Get restore history",
  request: {
    query: z.object({ limit: z.string().optional() }),
  },
  responses: createApiResponses([
    {
      schema: z.array(RestoreHistorySchema),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.get(
  "/restore/history",
  validateRequest(z.object({ query: z.object({ limit: z.string().optional() }) })),
  AclMiddleware("backup-restore-history-get"),
  backupController.getRestoreHistory
);

// ============================================
// Credentials Management
// ============================================

const CreateCredentialSchema = z.object({
  body: z.object({
    name: z.string(),
    storageType: StorageTypeSchema,
    credentials: z.record(z.string(), z.any()),
  }),
});

backupRegistry.registerPath({
  method: "get",
  path: "/backup/credentials",
  tags: ["Backup"],
  operationId: "getAllCredentials",
  description: "Get all backup credentials (without sensitive data)",
  summary: "Get all credentials",
  responses: createApiResponses([
    {
      schema: z.array(
        z.object({
          _id: z.string(),
          name: z.string(),
          storageType: StorageTypeSchema,
          createdAt: z.date().optional(),
          updatedAt: z.date().optional(),
        })
      ),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.get(
  "/credentials",
  validateRequest(z.object({})),
  AclMiddleware("backup-credentials-get-all"),
  backupController.getAllCredentials
);

backupRegistry.registerPath({
  method: "post",
  path: "/backup/credentials",
  tags: ["Backup"],
  operationId: "createCredentials",
  description: "Create new backup credentials",
  summary: "Create credentials",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateCredentialSchema.shape.body },
      },
    },
  },
  responses: createApiResponses([
    {
      schema: z.object({
        _id: z.string(),
        name: z.string(),
        storageType: StorageTypeSchema,
      }),
      description: "Created",
      statusCode: 201,
    },
  ]),
});

backupRouter.post(
  "/credentials",
  validateRequest(z.object({ body: CreateCredentialSchema.shape.body })),
  AclMiddleware("backup-credentials-create"),
  backupController.createCredentials
);

backupRegistry.registerPath({
  method: "delete",
  path: "/backup/credentials/{id}",
  tags: ["Backup"],
  operationId: "deleteCredentials",
  description: "Delete backup credentials",
  summary: "Delete credentials",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: createApiResponses([
    {
      schema: z.object({ message: z.string() }),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.delete(
  "/credentials/:id",
  validateRequest(z.object({ params: z.object({ id: z.string() }) })),
  AclMiddleware("backup-credentials-delete"),
  backupController.deleteCredentials
);

// ============================================
// Database Info
// ============================================

backupRegistry.registerPath({
  method: "get",
  path: "/backup/collections",
  tags: ["Backup"],
  operationId: "getCollections",
  description: "Get all database collections with metadata",
  summary: "Get collections",
  responses: createApiResponses([
    {
      schema: z.array(CollectionMetadataSchema),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.get(
  "/collections",
  validateRequest(z.object({})),
  AclMiddleware("backup-collections-get"),
  backupController.getCollections
);

backupRegistry.registerPath({
  method: "get",
  path: "/backup/stats",
  tags: ["Backup"],
  operationId: "getDatabaseStats",
  description: "Get database statistics",
  summary: "Get database stats",
  responses: createApiResponses([
    {
      schema: z.object({
        collections: z.number(),
        totalDocuments: z.number(),
        dataSize: z.number(),
        indexSize: z.number(),
      }),
      description: "Success",
      statusCode: 200,
    },
  ]),
});

backupRouter.get(
  "/stats",
  validateRequest(z.object({})),
  AclMiddleware("backup-stats-get"),
  backupController.getDatabaseStats
);
