import { z } from "zod";

// ──────────────────────────────────────────────────────────────
// Single entry returned by the search endpoint
// ──────────────────────────────────────────────────────────────

export const IcdOpsEntrySchema = z.object({
  /** ICD-10 / OPS code, e.g. "A00.0" or "5-820.00" */
  code: z.string(),
  /** Human-readable label in German, e.g. "Cholera durch Vibrio cholerae O:1, Biovar cholerae" */
  label: z.string(),
  /** Classification kind: "chapter", "block", or "category" */
  kind: z.enum(["chapter", "block", "category"]),
});

export type IcdOpsEntry = z.infer<typeof IcdOpsEntrySchema>;

// ──────────────────────────────────────────────────────────────
// Paginated response
// ──────────────────────────────────────────────────────────────

export const IcdOpsPaginatedResponseSchema = z.object({
  /** Array of matching entries for the current page */
  items: z.array(IcdOpsEntrySchema),
  /** Total number of entries matching the query */
  total: z.number(),
  /** Current page number (1-based) */
  page: z.number(),
  /** Number of items per page */
  limit: z.number(),
  /** Total number of pages */
  totalPages: z.number(),
  /** Data version identifier (e.g. "2026") */
  version: z.string(),
  /** Type of the database: "icd" or "ops" */
  type: z.enum(["icd", "ops"]),
});

export type IcdOpsPaginatedResponse = z.infer<typeof IcdOpsPaginatedResponseSchema>;

// ──────────────────────────────────────────────────────────────
// Query validation schemas for the endpoints
// ──────────────────────────────────────────────────────────────

export const SearchQuerySchema = z.object({
  query: z.object({
    /** Search term – matched against code and label */
    q: z.string().min(1, "Search query must not be empty"),
    /** Page number (1-based), defaults to 1 */
    page: z.coerce.number().int().min(1).optional().default(1),
    /** Items per page, defaults to 10, max 50 */
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    /** Filter by kind, defaults to "category" (most useful for users) */
    kind: z.enum(["chapter", "block", "category", "all"]).optional().default("category"),
  }),
});

export const VersionQuerySchema = z.object({
  query: z.object({}).optional(),
});

// ──────────────────────────────────────────────────────────────
// Prefix / hierarchical-navigation response
// ──────────────────────────────────────────────────────────────

export const IcdOpsPrefixResponseSchema = z.object({
  /** Entries for navigation – one per next-level group when isGroup=true */
  items: z.array(IcdOpsEntrySchema),
  /** Normalized prefix used for the lookup */
  prefix: z.string(),
  /** Classification type */
  type: z.enum(["icd", "ops"]),
  /** Data version identifier */
  version: z.string(),
  /**
   * True when the prefix is short enough that results are grouped into
   * next-level buckets (one representative entry per group).
   * False when the prefix is specific enough to show all matching entries.
   */
  isGroup: z.boolean(),
});

export type IcdOpsPrefixResponse = z.infer<typeof IcdOpsPrefixResponseSchema>;

/** Query schema for the prefix/navigation endpoint */
export const PrefixQuerySchema = z.object({
  query: z.object({
    /** Code prefix typed by the user, e.g. "M", "M2", "5", "52" */
    q: z.string().min(1, "Prefix must not be empty"),
    /** Max items returned (default 20, max 50) */
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  }),
});
