import archiver from "archiver";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { extract as tarExtract } from "tar";

import type { BackupCredential, BackupJob, CollectionMetadata } from "@/api/backup/backupModel";
import { BackupRepository } from "@/api/backup/backupRepository";
import {
  LocalStorageAdapter,
  type IStorageAdapter,
  StorageAdapterFactory,
} from "@/api/backup/storageAdapters";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";

/**
 * Encryption configuration
 */
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const AUTH_TAG_LENGTH = 16;

/**
 * Backup metadata stored in the archive
 */
interface BackupMetadata {
  version: string;
  createdAt: string;
  collections: CollectionMetadata[];
  databaseName: string;
  isEncrypted: boolean;
  encryptedWithPassword: boolean;
}

/**
 * Restore operation result
 */
export interface RestoreResult {
  collections: string[];
  totalDocumentsRestored: number;
  totalDocumentsSkipped: number;
  errors: string[];
}

/**
 * Backup service - handles backup creation, encryption, compression, and restore operations
 */
export class BackupService {
  private repository: BackupRepository;
  private tempDir: string;

  constructor() {
    this.repository = new BackupRepository();
    this.tempDir = path.join(env.BACKUP_STORAGE_PATH, "temp");
  }

  // ============================================
  // Credential Management
  // ============================================

  /**
   * Encrypt and store credentials
   */
  async createEncryptedCredential(
    name: string,
    storageType: string,
    credentialData: Record<string, any>
  ): Promise<BackupCredential> {
    // Encrypt the credential data
    const { encryptedData, iv, authTag } = this.encryptData(
      JSON.stringify(credentialData),
      env.BACKUP_MASTER_KEY
    );

    return await this.repository.createCredential({
      name,
      storageType: storageType as 'local' | 's3' | 'sftp' | 'webdav',
      encryptedData,
      iv,
      authTag,
    });
  }

  /**
   * Decrypt stored credentials
   */
  async getDecryptedCredential(credentialId: string): Promise<Record<string, any>> {
    const credential = await this.repository.findCredentialById(credentialId);
    if (!credential) {
      throw new Error("Credential not found");
    }

    const decryptedJson = this.decryptData(
      credential.encryptedData,
      credential.iv,
      credential.authTag,
      env.BACKUP_MASTER_KEY
    );

    return JSON.parse(decryptedJson);
  }

  /**
   * Delete a credential (checks if it's in use first)
   */
  async deleteCredential(credentialId: string): Promise<void> {
    const inUse = await this.repository.isCredentialInUse(credentialId);
    if (inUse) {
      throw new Error("Cannot delete credential: it is currently used by one or more backup jobs");
    }
    await this.repository.deleteCredential(credentialId);
  }

  // ============================================
  // Backup Creation
  // ============================================

  /**
   * Create a backup (manual or scheduled)
   */
  async createBackup(
    job: Partial<BackupJob>,
    userId?: string
  ): Promise<{ backupId: string; filename: string; sizeBytes: number }> {
    const startedAt = new Date();

    try {
      // Determine which collections to backup
      const allCollections = await this.repository.getAllCollections();
      const collectionsToBackup =
        job.collections && job.collections.length > 0 ? job.collections : allCollections;

      // Get collection metadata
      const collectionMetadata = await this.repository.getCollectionsMetadata(collectionsToBackup);

      // Create backup file
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `backup-${timestamp}.tar.gz`;
      const tempFilePath = path.join(this.tempDir, filename);

      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Create the backup archive
      await this.createBackupArchive(tempFilePath, collectionsToBackup, collectionMetadata, job);

      // Get file size
      const stats = await fs.stat(tempFilePath);
      const sizeBytes = stats.size;

      // Upload to storage
      const storageAdapter = await this.getStorageAdapter(job);
      const storageLocation = await storageAdapter.upload(tempFilePath, filename);

      // Create backup history record with complete data
      const history = await this.repository.createBackupHistory({
        jobId: job._id?.toString(),
        jobName: job.name,
        filename,
        filePath: job.storageType === "local" ? storageLocation : filename,
        storageLocation,
        sizeBytes,
        collections: collectionMetadata,
        isEncrypted: job.encryptionEnabled || false,
        encryptedWithPassword: !!job.encryptionPasswordHash,
        storageType: job.storageType || "local",
        credentialId: job.credentialId?.toString() || null,
        status: "completed",
        startedAt,
        completedAt: new Date(),
        createdBy: userId,
        departmentId: job.departmentId,
      });

      // Clean up temp file
      await fs.unlink(tempFilePath).catch(() => {});

      logger.info(`Backup created successfully: ${filename}`);

      return {
        backupId: history._id!.toString(),
        filename,
        sizeBytes,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(error, `Backup failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Create the backup archive (tar.gz)
   */
  private async createBackupArchive(
    outputPath: string,
    collections: string[],
    collectionMetadata: CollectionMetadata[],
    job: Partial<BackupJob>
  ): Promise<void> {
    // Create temp directory for JSON files
    const tempDataDir = path.join(this.tempDir, `backup-data-${Date.now()}`);
    await fs.mkdir(tempDataDir, { recursive: true });

    try {
      // Export each collection to JSON
      for (const collectionName of collections) {
        const data = await this.repository.exportCollectionData(collectionName);
        const jsonPath = path.join(tempDataDir, `${collectionName}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));
      }

      // Create metadata file
      const metadata: BackupMetadata = {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        collections: collectionMetadata,
        databaseName: "patientoutcome",
        isEncrypted: job.encryptionEnabled || false,
        encryptedWithPassword: !!job.encryptionPasswordHash,
      };
      const metadataPath = path.join(tempDataDir, "metadata.json");
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Create tar.gz archive
      if (job.encryptionEnabled && job.encryptionPasswordHash) {
        // Create encrypted archive
        await this.createEncryptedArchive(tempDataDir, outputPath, job.encryptionPasswordHash);
      } else {
        // Create regular tar.gz archive
        await this.createTarGzArchive(tempDataDir, outputPath);
      }
    } finally {
      // Clean up temp data directory
      await fs.rm(tempDataDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Create a tar.gz archive from a directory
   */
  private async createTarGzArchive(sourceDir: string, outputPath: string): Promise<void> {
    const output = createWriteStream(outputPath);
    const archive = archiver("tar", {
      gzip: true,
      gzipOptions: { level: 9 },
    });

    return new Promise((resolve, reject) => {
      output.on("close", () => resolve());
      output.on("error", reject);
      archive.on("error", reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Create an encrypted tar.gz archive
   */
  private async createEncryptedArchive(
    sourceDir: string,
    outputPath: string,
    passwordHash: string
  ): Promise<void> {
    // First create unencrypted tar.gz
    const tempArchivePath = `${outputPath}.tmp`;
    await this.createTarGzArchive(sourceDir, tempArchivePath);

    // Read the archive
    const archiveData = await fs.readFile(tempArchivePath);

    // Encrypt it (we'll use the password hash as the key - in production, derive key from password)
    const password = passwordHash.slice(0, 32); // Use first 32 chars of hash as key
    const { encryptedData, iv, authTag } = this.encryptData(archiveData.toString("base64"), password);

    // Write encrypted file with IV and auth tag prepended
    const encryptedBuffer = Buffer.concat([
      Buffer.from(iv, "hex"),
      Buffer.from(authTag, "hex"),
      Buffer.from(encryptedData, "hex"),
    ]);
    await fs.writeFile(outputPath, encryptedBuffer);

    // Clean up temp archive
    await fs.unlink(tempArchivePath).catch(() => {});
  }

  // ============================================
  // Backup Restore
  // ============================================

  /**
   * Get backup metadata without restoring
   */
  async getBackupMetadata(backupId: string): Promise<BackupMetadata> {
    const history = await this.repository.findBackupHistoryById(backupId);
    if (!history) {
      throw new Error("Backup not found");
    }

    // Download backup file to temp location
    const tempFilePath = path.join(this.tempDir, `restore-${Date.now()}-${history.filename}`);
    await fs.mkdir(this.tempDir, { recursive: true });

    try {
      const storageAdapter = await this.getStorageAdapterForBackup(history);
      await storageAdapter.download(history.filename, tempFilePath);

      // Extract and read metadata
      const extractDir = `${tempFilePath}-extracted`;
      await this.extractArchive(tempFilePath, extractDir, history.isEncrypted);

      const metadataPath = path.join(extractDir, "metadata.json");
      const metadataContent = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(metadataContent) as BackupMetadata;

      // Clean up
      await fs.unlink(tempFilePath).catch(() => {});
      await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});

      return metadata;
    } catch (error) {
      await fs.unlink(tempFilePath).catch(() => {});
      throw error;
    }
  }

  /**
   * Validate a backup is available and completed before attempting restore
   */
  async validateBackupForRestore(backupId: string): Promise<any> {
    const history = await this.repository.findBackupHistoryById(backupId);
    if (!history) {
      throw new Error("Backup not found");
    }
    if (history.status !== "completed") {
      throw new Error("Backup is not in a valid state for restore");
    }
    return history;
  }

  /**
   * Restore backup
   */
  async restoreBackup(
    backupId: string,
    collectionsToRestore: string[],
    mode: "merge" | "replace",
    userId: string,
    password?: string
  ): Promise<RestoreResult> {
    const history = await this.repository.findBackupHistoryById(backupId);
    if (!history) {
      throw new Error("Backup not found");
    }

    // Create restore history record
    const restoreHistory = await this.repository.createRestoreHistory({
      backupId: history._id!.toString(),
      backupFilename: history.filename,
      collectionsRestored: collectionsToRestore,
      restoreMode: mode,
      status: "running",
      startedAt: new Date(),
      restoredBy: userId,
    });

    const result: RestoreResult = {
      collections: [],
      totalDocumentsRestored: 0,
      totalDocumentsSkipped: 0,
      errors: [],
    };

    try {
      // Download backup file
      const tempFilePath = path.join(this.tempDir, `restore-${Date.now()}-${history.filename}`);
      await fs.mkdir(this.tempDir, { recursive: true });

      const storageAdapter = await this.getStorageAdapterForBackup(history);
      await storageAdapter.download(history.filename, tempFilePath);

      // Extract archive
      const extractDir = `${tempFilePath}-extracted`;
      await this.extractArchive(tempFilePath, extractDir, history.isEncrypted, password);

      // Restore each collection
      for (const collectionName of collectionsToRestore) {
        try {
          const jsonPath = path.join(extractDir, `${collectionName}.json`);
          const jsonContent = await fs.readFile(jsonPath, "utf-8");
          const documents = JSON.parse(jsonContent);

          const stats = await this.repository.importCollectionData(collectionName, documents, mode);
          result.collections.push(collectionName);
          result.totalDocumentsRestored += stats.inserted;
          result.totalDocumentsSkipped += stats.skipped;

          logger.info(
            `Restored collection ${collectionName}: ${stats.inserted} inserted, ${stats.skipped} skipped`
          );
        } catch (error) {
          const errorMsg = `Failed to restore collection ${collectionName}: ${error}`;
          result.errors.push(errorMsg);
          logger.error(error, errorMsg);
        }
      }

      // Complete restore history
      await this.repository.completeRestore(
        restoreHistory._id!.toString(),
        {
          documentsRestored: result.totalDocumentsRestored,
          documentsSkipped: result.totalDocumentsSkipped,
        },
        result.errors.length > 0 ? result.errors.join("; ") : undefined
      );

      // Clean up
      await fs.unlink(tempFilePath).catch(() => {});
      await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});

      logger.info(`Restore completed: ${result.collections.length} collections restored`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.repository.completeRestore(
        restoreHistory._id!.toString(),
        { documentsRestored: 0, documentsSkipped: 0 },
        errorMessage
      );
      throw error;
    }
  }

  /**
   * Extract a tar.gz archive
   */
  private async extractArchive(
    archivePath: string,
    extractDir: string,
    isEncrypted: boolean,
    password?: string
  ): Promise<void> {
    await fs.mkdir(extractDir, { recursive: true });

    if (isEncrypted) {
      if (!password) {
        throw new Error("Password required for encrypted backup");
      }

      // Read encrypted file
      const encryptedBuffer = await fs.readFile(archivePath);

      // Extract IV, auth tag, and encrypted data
      const iv = encryptedBuffer.subarray(0, IV_LENGTH).toString("hex");
      const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH).toString("hex");
      const encryptedData = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH).toString("hex");

      // Decrypt
      const passwordKey = password.slice(0, 32).padEnd(32, "0");
      const decryptedBase64 = this.decryptData(encryptedData, iv, authTag, passwordKey);
      const decryptedBuffer = Buffer.from(decryptedBase64, "base64");

      // Write decrypted tar.gz to temp file
      const tempArchivePath = `${archivePath}.decrypted`;
      await fs.writeFile(tempArchivePath, decryptedBuffer);

      // Extract decrypted archive
      await tarExtract({
        file: tempArchivePath,
        cwd: extractDir,
      });

      // Clean up temp decrypted file
      await fs.unlink(tempArchivePath).catch(() => {});
    } else {
      // Extract regular tar.gz
      await tarExtract({
        file: archivePath,
        cwd: extractDir,
      });
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Encrypt data using AES-256-GCM
   */
  private encryptData(
    data: string,
    key: string
  ): { encryptedData: string; iv: string; authTag: string } {
    // Ensure key is 32 bytes
    const keyBuffer = Buffer.from(key.slice(0, 32).padEnd(32, "0"));
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decryptData(encryptedData: string, iv: string, authTag: string, key: string): string {
    const keyBuffer = Buffer.from(key.slice(0, 32).padEnd(32, "0"));
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      keyBuffer,
      Buffer.from(iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Get storage adapter for a backup job
   */
  private async getStorageAdapter(job: Partial<BackupJob>): Promise<IStorageAdapter> {
    const storageType = job.storageType || "local";

    if (storageType === "local") {
      return new LocalStorageAdapter(env.BACKUP_STORAGE_PATH);
    }

    // Get credentials for remote storage
    if (!job.credentialId) {
      throw new Error("Credential ID required for remote storage");
    }

    const credentials = await this.getDecryptedCredential(job.credentialId.toString());

    return StorageAdapterFactory.create(storageType, credentials);
  }

  /**
   * Get storage adapter for an existing backup (from history)
   */
  private async getStorageAdapterForBackup(history: any): Promise<IStorageAdapter> {
    if (history.storageType === "local") {
      return new LocalStorageAdapter(env.BACKUP_STORAGE_PATH);
    }

    // For remote storage, we'd need to look up the job and get credentials
    // This is simplified - in production, might want to store credential ID in history
    throw new Error("Remote storage restore not fully implemented");
  }

  /**
   * Verify backup password
   */
  async verifyBackupPassword(backupId: string, password: string): Promise<boolean> {
    const history = await this.repository.findBackupHistoryById(backupId);
    if (!history || !history.jobId) {
      return false;
    }

    const job = await this.repository.findBackupJobById(history.jobId.toString());
    if (!job || !job.encryptionPasswordHash) {
      return false;
    }

    return await bcrypt.compare(password, job.encryptionPasswordHash);
  }

  /**
   * Get backup file path (for downloads)
   */
  async getBackupFilePath(backupId: string): Promise<string> {
    const history = await this.repository.findBackupHistoryById(backupId);
    if (!history) {
      throw new Error("Backup not found");
    }

    if (history.storageType === "local") {
      return history.filePath;
    }

    // For remote storage, download to temp location
    const tempFilePath = path.join(this.tempDir, history.filename);
    const storageAdapter = await this.getStorageAdapterForBackup(history);
    await storageAdapter.download(history.filename, tempFilePath);
    return tempFilePath;
  }

  /**
   * Delete a backup (removes both the file and database record)
   */
  async deleteBackup(backupId: string): Promise<void> {
    const history = await this.repository.findBackupHistoryById(backupId);
    if (!history) {
      throw new Error("Backup not found");
    }

    try {
      // Delete the backup file from storage
      if (history.storageType === "local") {
        // Delete local file
        const localAdapter = new LocalStorageAdapter(env.BACKUP_STORAGE_PATH);
        await localAdapter.delete(history.filename);
      } else {
        // Delete remote file
        const storageAdapter = await this.getStorageAdapterForBackup(history);
        await storageAdapter.delete(history.filename);
      }

      logger.info(`Backup file deleted: ${history.filename}`);
    } catch (error) {
      // Log error but continue to delete database record
      logger.error(error, `Failed to delete backup file: ${history.filename}`);
    }

    // Delete the backup history record from database
    await this.repository.deleteBackupHistory(backupId);
    
    logger.info(`Backup history deleted: ${backupId}`);
  }
}
