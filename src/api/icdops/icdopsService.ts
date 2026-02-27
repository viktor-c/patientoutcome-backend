import { logger } from "@/common/utils/logger";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { StatusCodes } from "http-status-codes";
import type { IcdOpsEntry, IcdOpsPaginatedResponse } from "./icdopsModel";
import { parseIcdData, parseOpsData } from "./icdopsClamlParser";

// ──────────────────────────────────────────────────────────────
// ICD-OPS Service
//
// Manages the in-memory cache of ICD-10-GM and OPS classification
// data. Data is loaded once at startup from the ClaML XML files.
// If loading fails, the service degrades gracefully – search
// endpoints return empty results instead of crashing the app.
// ──────────────────────────────────────────────────────────────

const TAG = "icdopsService";

/** Data version – updated yearly when new XML files are deployed */
const DATA_VERSION = "2026";

export class IcdOpsService {
  private icdEntries: IcdOpsEntry[] = [];
  private opsEntries: IcdOpsEntry[] = [];
  private icdLoaded = false;
  private opsLoaded = false;

  // ─── Initialisation ──────────────────────────────────────

  /**
   * Load both ICD and OPS datasets into memory.
   * Called at application startup from server.ts.
   * Never throws – logs errors and continues with empty datasets.
   */
  async initialize(): Promise<void> {
    await this.loadIcd();
    await this.loadOps();
  }

  private async loadIcd(): Promise<void> {
    try {
      this.icdEntries = parseIcdData();
      this.icdLoaded = true;
      logger.info(`${TAG}: ICD-10-GM data loaded – ${this.icdEntries.length} entries`);
    } catch (error) {
      this.icdLoaded = false;
      logger.error({ error }, `${TAG}: Failed to load ICD-10-GM data – search will return empty results`);
    }
  }

  private async loadOps(): Promise<void> {
    try {
      this.opsEntries = parseOpsData();
      this.opsLoaded = true;
      logger.info(`${TAG}: OPS data loaded – ${this.opsEntries.length} entries`);
    } catch (error) {
      this.opsLoaded = false;
      logger.error({ error }, `${TAG}: Failed to load OPS data – search will return empty results`);
    }
  }

  // ─── Public API ──────────────────────────────────────────

  /**
   * Search ICD-10 codes by query string.
   * Matches against code and label (case-insensitive).
   */
  searchIcd(
    query: string,
    page = 1,
    limit = 10,
    kindFilter: "chapter" | "block" | "category" | "all" = "category",
  ): ServiceResponse<IcdOpsPaginatedResponse> {
    return this.search("icd", this.icdEntries, query, page, limit, kindFilter);
  }

  /**
   * Search OPS codes by query string.
   * Matches against code and label (case-insensitive).
   */
  searchOps(
    query: string,
    page = 1,
    limit = 10,
    kindFilter: "chapter" | "block" | "category" | "all" = "category",
  ): ServiceResponse<IcdOpsPaginatedResponse> {
    return this.search("ops", this.opsEntries, query, page, limit, kindFilter);
  }

  /**
   * Get ICD version info and load status.
   */
  getIcdStatus(): ServiceResponse<{ version: string; loaded: boolean; entryCount: number }> {
    return ServiceResponse.success("ICD status", {
      version: DATA_VERSION,
      loaded: this.icdLoaded,
      entryCount: this.icdEntries.length,
    });
  }

  /**
   * Get OPS version info and load status.
   */
  getOpsStatus(): ServiceResponse<{ version: string; loaded: boolean; entryCount: number }> {
    return ServiceResponse.success("OPS status", {
      version: DATA_VERSION,
      loaded: this.opsLoaded,
      entryCount: this.opsEntries.length,
    });
  }

  // ─── Private helpers ─────────────────────────────────────

  private search(
    type: "icd" | "ops",
    entries: IcdOpsEntry[],
    query: string,
    page: number,
    limit: number,
    kindFilter: "chapter" | "block" | "category" | "all",
  ): ServiceResponse<IcdOpsPaginatedResponse> {
    try {
      const lowerQuery = query.toLowerCase().trim();

      // Filter by kind first
      let filtered = kindFilter === "all" ? entries : entries.filter((e) => e.kind === kindFilter);

      // Then filter by search query – matches code or label
      if (lowerQuery.length > 0) {
        filtered = filtered.filter(
          (entry) =>
            entry.code.toLowerCase().includes(lowerQuery) ||
            entry.label.toLowerCase().includes(lowerQuery),
        );
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const safePage = Math.min(page, totalPages);
      const startIndex = (safePage - 1) * limit;
      const items = filtered.slice(startIndex, startIndex + limit);

      const response: IcdOpsPaginatedResponse = {
        items,
        total,
        page: safePage,
        limit,
        totalPages,
        version: DATA_VERSION,
        type,
      };

      return ServiceResponse.success(
        `Found ${total} ${type.toUpperCase()} entries matching "${query}"`,
        response,
      );
    } catch (error) {
      const message = `Error searching ${type.toUpperCase()} data`;
      logger.error({ error, query }, `${TAG}: ${message}`);
      return ServiceResponse.failure(message, null as any, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}

/** Singleton instance – imported by controller */
export const icdopsService = new IcdOpsService();
