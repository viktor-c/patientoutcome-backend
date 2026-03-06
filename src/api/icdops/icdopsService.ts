import { logger } from "@/common/utils/logger";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { StatusCodes } from "http-status-codes";
import type { IcdOpsEntry, IcdOpsPaginatedResponse, IcdOpsPrefixResponse } from "./icdopsModel";
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

  /**
   * Hierarchical / prefix-based ICD-10 code navigation.
   *
   * Short prefixes (1-2 alphanumeric chars, e.g. "M", "M2") return one
   * representative entry per next-level group so the user can drill down.
   * Longer prefixes return all matching entries sorted broadest-first.
   */
  searchIcdByCodePrefix(rawPrefix: string, limit = 20): ServiceResponse<IcdOpsPrefixResponse> {
    return this.searchByCodePrefix("icd", this.icdEntries, rawPrefix, limit);
  }

  /**
   * Hierarchical / prefix-based OPS code navigation.
   *
   * User types plain digits; the hyphen is inserted automatically:
   *   "5"   → looks up "5-"   → groups 5-0x, 5-1x, 5-2x …
   *   "52"  → looks up "5-2"  → groups 5-20, 5-21 …
   *   "521" → looks up "5-21" → all codes starting with 5-21
   */
  searchOpsByCodePrefix(rawPrefix: string, limit = 20): ServiceResponse<IcdOpsPrefixResponse> {
    return this.searchByCodePrefix("ops", this.opsEntries, rawPrefix, limit);
  }

  // ─── Private helpers ─────────────────────────────────────

  /**
   * Normalize an OPS user-typed prefix to the stored code format.
   * Strips hyphens and dots, then rebuilds the canonical form:
   *   "5"      → "5-"
   *   "52"     → "5-2"
   *   "521"    → "5-21"
   *   "5788"   → "5-788"
   *   "57886"  → "5-788.6"   ← also handles direct code entry without punctuation
   *   "5-788.6" → "5-788.6"  ← idempotent
   */
  private normalizeOpsPrefix(input: string): string {
    const alphanum = input.replace(/[-\.]/g, "");
    if (!alphanum) return input;
    if (alphanum.length === 1) return `${alphanum}-`;
    if (alphanum.length <= 4) return `${alphanum[0]}-${alphanum.slice(1)}`;
    // 5+ chars: D-NNN.NN...
    return `${alphanum[0]}-${alphanum.slice(1, 4)}.${alphanum.slice(4)}`;
  }

  /**
   * Derive the immediate parent code one level up in the hierarchy.
   * Context is only meaningful for terminal codes that carry a dot suffix.
   *
   * Hierarchy examples for OPS:
   *   "5-788.52" → "5-788.5"  (multi-char decimal: strip last char)
   *   "5-788.5"  → "5-788"    (single-char decimal: strip entire dot-segment)
   *   "5-788.6"  → "5-788"    (single-char decimal: strip entire dot-segment)
   *
   * Hierarchy examples for ICD:
   *   "M20.1"    → "M20"      (single-char decimal: strip entire dot-segment)
   *   "M20.10"   → "M20.1"    (multi-char decimal: strip last char)
   *
   * For codes without a dot (e.g. "5-788", "M20") the caller is navigating
   * a mid-level group; no context entry is returned.
   */
  private computeParentCode(normalizedCode: string): string | null {
    const dotIdx = normalizedCode.lastIndexOf(".");
    if (dotIdx < 0) return null; // no dot → mid-level navigation, no context

    const decimalPart = normalizedCode.slice(dotIdx + 1);
    if (decimalPart.length > 1) {
      // Multi-char decimal suffix: step up one char within the decimal part
      // "5-788.52" → "5-788.5",  "M20.10" → "M20.1"
      return normalizedCode.slice(0, -1);
    }
    // Single-char decimal suffix: remove entire dot segment
    // "5-788.5" → "5-788",  "M20.1" → "M20"
    return normalizedCode.slice(0, dotIdx) || null;
  }

  /**
   * True when the prefix is short enough that results should be grouped into
   * next-level navigation buckets rather than shown as individual entries.
   * Threshold: ≤ 2 alphanumeric characters (hyphens/dots excluded).
   */
  private shouldGroup(rawPrefix: string): boolean {
    return rawPrefix.replace(/[^A-Za-z0-9]/g, "").length <= 2;
  }

  /**
   * Core prefix search used by both ICD and OPS variants.
   * Returns next-level group representatives for short prefixes, or all
   * matching entries (shortest/broadest first) for longer prefixes.
   */
  private searchByCodePrefix(
    type: "icd" | "ops",
    entries: IcdOpsEntry[],
    rawPrefix: string,
    limit: number,
  ): ServiceResponse<IcdOpsPrefixResponse> {
    try {
      const prefix =
        type === "ops"
          ? this.normalizeOpsPrefix(rawPrefix)
          : rawPrefix.toUpperCase();

      const isGroup = this.shouldGroup(rawPrefix);

      // All entries whose code starts with the (normalized) prefix
      const matching = entries.filter((e) => e.code.startsWith(prefix));

      let items: IcdOpsEntry[];

      if (isGroup) {
        // Return one representative entry per next-character bucket
        const prefixLen = prefix.length;
        const groups = new Map<string, IcdOpsEntry>();

        for (const entry of matching) {
          if (entry.code.length <= prefixLen) continue;
          const groupKey = entry.code.slice(0, prefixLen + 1);
          if (!groups.has(groupKey)) {
            groups.set(groupKey, entry);
          } else {
            // Prefer the shortest code as representative (broadest category)
            const existing = groups.get(groupKey)!;
            if (entry.code.length < existing.code.length) {
              groups.set(groupKey, entry);
            }
          }
        }

        items = Array.from(groups.values())
          .sort((a, b) => a.code.localeCompare(b.code))
          .slice(0, limit);
      } else {
        // Show all matching entries – shortest (broadest) first
        items = matching
          .sort(
            (a, b) =>
              a.code.length - b.code.length || a.code.localeCompare(b.code),
          )
          .slice(0, limit);
      }

      // When showing terminal (non-group) results, include the immediate parent
      // category entry as context so the UI can display "5-788 Arthroplastik"
      // above a list of "5-788.6", "5-788.7" etc.
      let context: IcdOpsEntry | undefined;
      if (!isGroup) {
        const parentCode = this.computeParentCode(prefix);
        if (parentCode) {
          context = entries.find((e) => e.code === parentCode);
        }
      }

      const response: IcdOpsPrefixResponse = {
        items,
        prefix,
        type,
        version: DATA_VERSION,
        isGroup,
        ...(context ? { context } : {}),
      };

      return ServiceResponse.success(
        `Found ${items.length} ${type.toUpperCase()} entries for prefix "${prefix}"`,
        response,
      );
    } catch (error) {
      const message = `Error searching ${type.toUpperCase()} by prefix`;
      logger.error({ error, rawPrefix }, `${TAG}: ${message}`);
      return ServiceResponse.failure(message, null as any, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

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
