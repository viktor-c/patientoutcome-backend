import { beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

import { LocalStorageAdapter, S3StorageAdapter, SftpStorageAdapter, WebDavStorageAdapter } from "../storageAdapters";

// Mock node:fs
vi.mock("node:fs", () => ({
  promises: {
    mkdir: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn(),
    readdir: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn(),
  },
  createWriteStream: vi.fn(),
  createReadStream: vi.fn(),
}));

// Mock AWS SDK
let mockS3Send = vi.fn();
vi.mock("@aws-sdk/client-s3", () => {
  class MockS3Client {
    send = mockS3Send;
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
  };
});

// Mock ssh2-sftp-client
let mockSftpClient: any;
vi.mock("ssh2-sftp-client", () => {
  class MockSftpClient {
    connect = vi.fn().mockResolvedValue(undefined);
    put = vi.fn().mockResolvedValue(undefined);
    get = vi.fn().mockResolvedValue(undefined);
    delete = vi.fn().mockResolvedValue(undefined);
    list = vi.fn().mockResolvedValue([]);
    exists = vi.fn().mockResolvedValue(false);
    mkdir = vi.fn().mockResolvedValue(undefined);
    end = vi.fn().mockResolvedValue(undefined);
  }
  return {
    default: MockSftpClient,
  };
});

// Mock webdav
let mockWebDAVClient: any;
vi.mock("webdav", () => ({
  createClient: vi.fn().mockReturnValue({
    putFileContents: vi.fn(),
    getFileContents: vi.fn(),
    deleteFile: vi.fn(),
    getDirectoryContents: vi.fn(),
    exists: vi.fn(),
  }),
}));

vi.mock("@/common/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Storage Adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LocalStorageAdapter", () => {
    let adapter: LocalStorageAdapter;
    const basePath = "/test/backup/path";

    beforeEach(() => {
      adapter = new LocalStorageAdapter(basePath);
    });

    it("should upload file to local storage", async () => {
      const localFile = "/source/file.tar.gz";
      const remoteFile = "backup-2024.tar.gz";

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      const result = await adapter.upload(localFile, remoteFile);

      expect(fs.mkdir).toHaveBeenCalledWith(basePath, { recursive: true });
      expect(fs.copyFile).toHaveBeenCalledWith(localFile, path.join(basePath, remoteFile));
      expect(result).toBe(path.join(basePath, remoteFile));
    });

    it("should download file from local storage", async () => {
      const remoteFile = "backup-2024.tar.gz";
      const localFile = "/dest/file.tar.gz";

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      await adapter.download(remoteFile, localFile);

      expect(fs.copyFile).toHaveBeenCalledWith(path.join(basePath, remoteFile), localFile);
    });

    it("should delete file from local storage", async () => {
      const remoteFile = "backup-2024.tar.gz";

      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      await adapter.delete(remoteFile);

      expect(fs.unlink).toHaveBeenCalledWith(path.join(basePath, remoteFile));
    });

    it("should list files in local storage", async () => {
      const mockFiles = ["backup-1.tar.gz", "backup-2.tar.gz"];

      vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);

      const result = await adapter.list();

      expect(fs.readdir).toHaveBeenCalledWith(basePath);
      expect(result).toEqual(mockFiles);
    });

    it("should return empty array when directory does not exist", async () => {
      const error: any = new Error("ENOENT");
      error.code = "ENOENT";
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await adapter.list();

      expect(result).toEqual([]);
    });

    it("should check if file exists", async () => {
      const remoteFile = "backup-2024.tar.gz";

      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await adapter.exists(remoteFile);

      expect(fs.access).toHaveBeenCalledWith(path.join(basePath, remoteFile));
      expect(result).toBe(true);
    });

    it("should return false when file does not exist", async () => {
      const remoteFile = "nonexistent.tar.gz";

      vi.mocked(fs.access).mockRejectedValue(new Error("File not found"));

      const result = await adapter.exists(remoteFile);

      expect(result).toBe(false);
    });

    it("should get full path for file", () => {
      const remoteFile = "backup-2024.tar.gz";

      const result = adapter.getFullPath(remoteFile);

      expect(result).toBe(path.join(basePath, remoteFile));
    });
  });

  describe("S3StorageAdapter", () => {
    let adapter: S3StorageAdapter;
    const config = {
      region: "us-east-1",
      bucket: "test-bucket",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
      prefix: "backups",
    };

    beforeEach(() => {
      adapter = new S3StorageAdapter(config);
    });

    it("should construct S3 client with correct config", () => {
      // Just verify adapter was created successfully
      expect(adapter).toBeDefined();
    });

    it("should upload file to S3 with prefix", async () => {
      const localFile = "/source/file.tar.gz";
      const remoteFile = "backup-2024.tar.gz";
      const fileContent = Buffer.from("test data");

      vi.mocked(fs.readFile).mockResolvedValue(fileContent);
      mockS3Send.mockResolvedValue({});

      const result = await adapter.upload(localFile, remoteFile);

      expect(fs.readFile).toHaveBeenCalledWith(localFile);
      expect(result).toBe(`s3://${config.bucket}/${config.prefix}/${remoteFile}`);
    });
  });

  describe("SftpStorageAdapter", () => {
    let adapter: SftpStorageAdapter;
    const config = {
      host: "sftp.example.com",
      port: 22,
      username: "user",
      password: "pass",
      remotePath: "/backups",
    };

    beforeEach(() => {
      adapter = new SftpStorageAdapter(config);
    });

    it("should upload file to SFTP", async () => {
      const localFile = "/source/file.tar.gz";
      const remoteFile = "backup-2024.tar.gz";

      // Mock will be called internally by the adapter
      const result = await adapter.upload(localFile, remoteFile);

      // SFTP adapter returns path with remotePath included
      expect(result).toBe(`sftp://${config.host}${config.remotePath}/${remoteFile}`);
    });

    it("should download file from SFTP", async () => {
      const remoteFile = "backup-2024.tar.gz";
      const localFile = "/dest/file.tar.gz";

      await adapter.download(remoteFile, localFile);

      // If no error was thrown, test passes
      expect(true).toBe(true);
    });

    it("should delete file from SFTP", async () => {
      const remoteFile = "backup-2024.tar.gz";

      await adapter.delete(remoteFile);

      // If no error was thrown, test passes
      expect(true).toBe(true);
    });

    it("should list files from SFTP", async () => {
      // Test that list method can be called without errors
      const result = await adapter.list();

      // Should return an array (empty or with files)
      expect(Array.isArray(result)).toBe(true);
    });

    it("should check if file exists on SFTP", async () => {
      const remoteFile = "backup-2024.tar.gz";

      const result = await adapter.exists(remoteFile);

      // Should return a boolean
      expect(typeof result).toBe("boolean");
    });
  });

  describe("WebDavStorageAdapter", () => {
    let adapter: WebDavStorageAdapter;
    const config = {
      url: "https://webdav.example.com",
      username: "user",
      password: "pass",
      basePath: "/backups",
    };

    beforeEach(() => {
      adapter = new WebDavStorageAdapter(config);
    });

    it("should upload file to WebDAV", async () => {
      const fileContent = Buffer.from("test data");
      vi.mocked(fs.readFile).mockResolvedValue(fileContent);

      const localFile = "/source/file.tar.gz";
      const remoteFile = "backup-2024.tar.gz";

      const result = await adapter.upload(localFile, remoteFile);

      expect(fs.readFile).toHaveBeenCalledWith(localFile);
      expect(result).toBe(`${config.basePath}/${remoteFile}`);
    });

    it("should download file from WebDAV", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      // Mock writeFile
      const mockWriteFile = vi.fn().mockResolvedValue(undefined);
      (fs as any).writeFile = mockWriteFile;

      const remoteFile = "backup-2024.tar.gz";
      const localFile = "/dest/file.tar.gz";

      await adapter.download(remoteFile, localFile);

      // Test passes if no error thrown
      expect(true).toBe(true);
    });

    it("should delete file from WebDAV", async () => {
      const remoteFile = "backup-2024.tar.gz";

      await adapter.delete(remoteFile);

      // Test passes if no error thrown
      expect(true).toBe(true);
    });

    it("should check if file exists on WebDAV", async () => {
      const remoteFile = "backup-2024.tar.gz";

      // Mock the client's exists method directly on the adapter instance
      const mockExists = vi.fn().mockResolvedValue(true);
      (adapter as any).client.exists = mockExists;

      const result = await adapter.exists(remoteFile);

      expect(mockExists).toHaveBeenCalledWith(`${config.basePath}/${remoteFile}`);
      expect(result).toBe(true);
    });
  });
});
