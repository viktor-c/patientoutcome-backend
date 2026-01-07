import mongoose, { type HydratedDocument } from "mongoose";

import {
  type BackupCredential,
  type BackupHistory,
  type BackupJob,
  backupCredentialModel,
  backupHistoryModel,
  backupJobModel,
  type CollectionMetadata,
  type RestoreHistory,
  restoreHistoryModel,
} from "@/api/backup/backupModel";
import { logger } from "@/common/utils/logger";

/**
 * Repository for backup-related database operations
 * Handles CRUD operations for backup jobs, credentials, and history
 */
export class BackupRepository {
  // ============================================
  // Backup Jobs
  // ============================================

  /**
   * Create a new backup job
   */
  async createBackupJob(jobData: Partial<BackupJob>): Promise<BackupJob> {
    const job = await backupJobModel.create(jobData);
    return job.toObject() as unknown as BackupJob;
  }

  /**
   * Find all backup jobs
   */
  async findAllBackupJobs(filter: Record<string, any> = {}): Promise<BackupJob[]> {
    const jobs = await backupJobModel.find(filter).sort({ createdAt: -1 }).lean();
    return jobs as unknown as BackupJob[];
  }

  /**
   * Find backup job by ID
   */
  async findBackupJobById(jobId: string): Promise<BackupJob | null> {
    const job = await backupJobModel.findById(jobId).lean();
    return job as BackupJob | null;
  }

  /**
   * Find enabled backup jobs that need to run
   */
  async findJobsDueForExecution(): Promise<BackupJob[]> {
    const jobs = await backupJobModel.find({ enabled: true }).lean();
    return jobs as unknown as BackupJob[];
  }

  /**
   * Update a backup job
   */
  async updateBackupJob(jobId: string, updates: Partial<BackupJob>): Promise<BackupJob | null> {
    const job = await backupJobModel.findByIdAndUpdate(jobId, updates, { new: true }).lean();
    return job as BackupJob | null;
  }

  /**
   * Delete a backup job
   */
  async deleteBackupJob(jobId: string): Promise<boolean> {
    const result = await backupJobModel.findByIdAndDelete(jobId);
    return result !== null;
  }

  /**
   * Update job's last run information
   */
  async updateJobLastRun(
    jobId: string,
    status: "success" | "failed" | "running",
    error?: string
  ): Promise<void> {
    await backupJobModel.findByIdAndUpdate(jobId, {
      lastRunAt: new Date(),
      lastRunStatus: status,
      lastRunError: error || null,
    });
  }

  // ============================================
  // Backup Credentials
  // ============================================

  /**
   * Create encrypted credentials
   */
  async createCredential(credentialData: Partial<BackupCredential>): Promise<BackupCredential> {
    const credential = await backupCredentialModel.create(credentialData);
    return credential.toObject() as unknown as BackupCredential;
  }

  /**
   * Find all credentials
   */
  async findAllCredentials(): Promise<BackupCredential[]> {
    const credentials = await backupCredentialModel.find().sort({ createdAt: -1 }).lean();
    return credentials as unknown as BackupCredential[];
  }

  /**
   * Find credential by ID
   */
  async findCredentialById(credentialId: string): Promise<BackupCredential | null> {
    const credential = await backupCredentialModel.findById(credentialId).lean();
    return credential as BackupCredential | null;
  }

  /**
   * Update credential
   */
  async updateCredential(
    credentialId: string,
    updates: Partial<BackupCredential>
  ): Promise<BackupCredential | null> {
    const credential = await backupCredentialModel
      .findByIdAndUpdate(credentialId, updates, { new: true })
      .lean();
    return credential as BackupCredential | null;
  }

  /**
   * Delete credential
   */
  async deleteCredential(credentialId: string): Promise<boolean> {
    const result = await backupCredentialModel.findByIdAndDelete(credentialId);
    return result !== null;
  }

  /**
   * Check if credential is in use by any backup job
   */
  async isCredentialInUse(credentialId: string): Promise<boolean> {
    const count = await backupJobModel.countDocuments({ credentialId });
    return count > 0;
  }

  // ============================================
  // Backup History
  // ============================================

  /**
   * Create backup history record
   */
  async createBackupHistory(historyData: Partial<BackupHistory>): Promise<BackupHistory> {
    const doc = await backupHistoryModel.create(historyData as unknown as Parameters<typeof backupHistoryModel.create>[0]);
    const history = Array.isArray(doc) ? doc[0] : doc;
    return history.toJSON() as BackupHistory;
  }

  /**
   * Find all backup history records
   */
  async findAllBackupHistory(
    filter: Record<string, any> = {},
    limit = 100
  ): Promise<BackupHistory[]> {
    const history = await backupHistoryModel.find(filter).sort({ startedAt: -1 }).limit(limit).lean();
    return history as unknown as BackupHistory[];
  }

  /**
   * Find backup history by ID
   */
  async findBackupHistoryById(historyId: string): Promise<BackupHistory | null> {
    const history = await backupHistoryModel.findById(historyId).lean();
    return history as BackupHistory | null;
  }

  /**
   * Update backup history
   */
  async updateBackupHistory(
    historyId: string,
    updates: Partial<BackupHistory>
  ): Promise<BackupHistory | null> {
    const history = await backupHistoryModel.findByIdAndUpdate(historyId, updates, { new: true }).lean();
    return history as BackupHistory | null;
  }

  /**
   * Mark backup as completed
   */
  async completeBackup(historyId: string, error?: string): Promise<void> {
    await backupHistoryModel.findByIdAndUpdate(historyId, {
      completedAt: new Date(),
      status: error ? "failed" : "completed",
      error: error || null,
    });
  }

  /**
   * Delete old backup history records
   */
  async deleteOldBackupHistory(olderThanDate: Date): Promise<number> {
    const result = await backupHistoryModel.deleteMany({
      startedAt: { $lt: olderThanDate },
      status: { $in: ["completed", "failed"] },
    });
    return result.deletedCount || 0;
  }

  /**
   * Delete a specific backup history record
   */
  async deleteBackupHistory(historyId: string): Promise<boolean> {
    const result = await backupHistoryModel.findByIdAndDelete(historyId);
    return !!result;
  }

  /**
   * Find backups by storage type and location
   */
  async findBackupsByStorage(storageType: string, storageLocation?: string): Promise<BackupHistory[]> {
    const filter: Record<string, any> = { storageType };
    if (storageLocation) {
      filter.storageLocation = storageLocation;
    }
    const backups = await backupHistoryModel.find(filter).sort({ startedAt: -1 }).lean();
    return backups as unknown as BackupHistory[];
  }

  // ============================================
  // Restore History
  // ============================================

  /**
   * Create restore history record
   */
  async createRestoreHistory(historyData: Partial<RestoreHistory>): Promise<RestoreHistory> {
    const doc = await restoreHistoryModel.create(historyData as unknown as Parameters<typeof restoreHistoryModel.create>[0]);
    const history = Array.isArray(doc) ? doc[0] : doc;
    return history.toJSON() as RestoreHistory;
  }

  /**
   * Find all restore history records
   */
  async findAllRestoreHistory(limit = 100): Promise<RestoreHistory[]> {
    const history = await restoreHistoryModel.find().sort({ startedAt: -1 }).limit(limit).lean();
    return history as unknown as RestoreHistory[];
  }

  /**
   * Update restore history
   */
  async updateRestoreHistory(
    historyId: string,
    updates: Partial<RestoreHistory>
  ): Promise<RestoreHistory | null> {
    const history = await restoreHistoryModel.findByIdAndUpdate(historyId, updates, { new: true }).lean();
    return history as RestoreHistory | null;
  }

  /**
   * Complete restore operation
   */
  async completeRestore(
    historyId: string,
    stats: { documentsRestored: number; documentsSkipped: number },
    error?: string
  ): Promise<void> {
    await restoreHistoryModel.findByIdAndUpdate(historyId, {
      completedAt: new Date(),
      status: error ? "failed" : "completed",
      error: error || null,
      documentsRestored: stats.documentsRestored,
      documentsSkipped: stats.documentsSkipped,
    });
  }

  // ============================================
  // Database Utilities
  // ============================================

  /**
   * Get list of all collections in the database
   */
  async getAllCollections(): Promise<string[]> {
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    const collections = await mongoose.connection.db.listCollections().toArray();
    return collections.map((col) => col.name);
  }

  /**
   * Get collection metadata (document count and last modified)
   */
  async getCollectionMetadata(collectionName: string): Promise<CollectionMetadata> {
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }
    const collection = mongoose.connection.db.collection(collectionName);

    // Get document count
    const documentCount = await collection.countDocuments();

    // Get last modified date (from the most recent document's updatedAt or _id)
    let lastModified: Date | null = null;
    const latestDoc = await collection
      .find()
      .sort({ updatedAt: -1, _id: -1 })
      .limit(1)
      .toArray();

    if (latestDoc.length > 0) {
      const doc = latestDoc[0];
      // Try updatedAt first, fallback to extracting timestamp from ObjectId
      if (doc.updatedAt) {
        lastModified = new Date(doc.updatedAt);
      } else if (doc._id && typeof doc._id.getTimestamp === "function") {
        lastModified = doc._id.getTimestamp();
      }
    }

    // Get collection stats for size
    const stats = await mongoose.connection.db.command({ collStats: collectionName });
    const sizeBytes = stats.size || 0;

    return {
      name: collectionName,
      documentCount,
      lastModified,
      sizeBytes,
    };
  }

  /**
   * Get metadata for multiple collections
   */
  async getCollectionsMetadata(collectionNames: string[]): Promise<CollectionMetadata[]> {
    const metadata = await Promise.all(
      collectionNames.map(async (name) => {
        try {
          return await this.getCollectionMetadata(name);
        } catch (error) {
          logger.error(error, `Failed to get metadata for collection ${name}`);
          return {
            name,
            documentCount: 0,
            lastModified: null,
            sizeBytes: 0,
          };
        }
      })
    );
    return metadata;
  }

  /**
   * Export collection data as JSON array
   */
  async exportCollectionData(collectionName: string): Promise<any[]> {    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }    const collection = mongoose.connection.db.collection(collectionName);
    const documents = await collection.find().toArray();
    return documents;
  }

  /**
   * Import data into a collection
   * @param mode 'merge' = skip existing _id, 'replace' = drop collection first
   */
  async importCollectionData(
    collectionName: string,
    documents: any[],
    mode: "merge" | "replace" = "merge"
  ): Promise<{ inserted: number; skipped: number }> {
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }
    const collection = mongoose.connection.db.collection(collectionName);

    if (mode === "replace") {
      await collection.drop().catch(() => {
        // Collection might not exist, that's fine
      });
    }

    let inserted = 0;
    let skipped = 0;

    if (documents.length === 0) {
      return { inserted, skipped };
    }

    if (mode === "replace") {
      // Bulk insert all documents
      const result = await collection.insertMany(documents, { ordered: false });
      inserted = result.insertedCount;
    } else {
      // Insert one by one, skip duplicates
      for (const doc of documents) {
        try {
          await collection.insertOne(doc);
          inserted++;
        } catch (error: any) {
          // Duplicate key error (code 11000)
          if (error.code === 11000) {
            skipped++;
          } else {
            throw error;
          }
        }
      }
    }

    return { inserted, skipped };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    collections: number;
    totalDocuments: number;
    dataSize: number;
    indexSize: number;
  }> {
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }
    const stats = await mongoose.connection.db.stats();

    return {
      collections: stats.collections || 0,
      totalDocuments: stats.objects || 0,
      dataSize: stats.dataSize || 0,
      indexSize: stats.indexSize || 0,
    };
  }
}
