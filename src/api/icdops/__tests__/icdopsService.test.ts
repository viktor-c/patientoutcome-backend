import { describe, it, expect, beforeAll } from "vitest";
import { IcdOpsService } from "@/api/icdops/icdopsService";
import { StatusCodes } from "http-status-codes";

// ──────────────────────────────────────────────────────────────
// ICD-OPS Service Unit Tests
// ──────────────────────────────────────────────────────────────

describe("IcdOpsService", () => {
  let service: IcdOpsService;

  beforeAll(async () => {
    service = new IcdOpsService();
    await service.initialize();
  }, 30_000);

  // ─── ICD Search ────────────────────────────────────────

  describe("searchIcd", () => {
    it("finds entries matching a text query", () => {
      const result = service.searchIcd("Cholera");
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(StatusCodes.OK);
      expect(result.responseObject.items.length).toBeGreaterThan(0);
      expect(result.responseObject.type).toBe("icd");

      const labels = result.responseObject.items.map((i) => i.label.toLowerCase());
      expect(labels.some((l) => l.includes("cholera"))).toBe(true);
    });

    it("finds entries matching a code query", () => {
      const result = service.searchIcd("A00.0");
      expect(result.success).toBe(true);
      expect(result.responseObject.items.length).toBeGreaterThan(0);
      expect(result.responseObject.items[0].code).toBe("A00.0");
    });

    it("returns correct pagination metadata", () => {
      const result = service.searchIcd("A", 1, 5);
      expect(result.responseObject.page).toBe(1);
      expect(result.responseObject.limit).toBe(5);
      expect(result.responseObject.items.length).toBeLessThanOrEqual(5);
      expect(result.responseObject.totalPages).toBeGreaterThan(1);
      expect(result.responseObject.total).toBeGreaterThan(5);
    });

    it("returns different results on page 2", () => {
      const page1 = service.searchIcd("A", 1, 5);
      const page2 = service.searchIcd("A", 2, 5);

      expect(page1.responseObject.items[0].code).not.toBe(
        page2.responseObject.items[0].code,
      );
    });

    it("returns empty items for non-matching query", () => {
      const result = service.searchIcd("xyznonexistent12345");
      expect(result.success).toBe(true);
      expect(result.responseObject.items).toHaveLength(0);
      expect(result.responseObject.total).toBe(0);
    });

    it("filters by kind when specified", () => {
      const resultAll = service.searchIcd("A", 1, 50, "all");
      const resultCat = service.searchIcd("A", 1, 50, "category");

      // "all" should return more or equal items (includes blocks, chapters)
      expect(resultAll.responseObject.total).toBeGreaterThanOrEqual(
        resultCat.responseObject.total,
      );
    });

    it("case-insensitive search works", () => {
      const lower = service.searchIcd("cholera");
      const upper = service.searchIcd("CHOLERA");
      const mixed = service.searchIcd("Cholera");

      expect(lower.responseObject.total).toBe(upper.responseObject.total);
      expect(lower.responseObject.total).toBe(mixed.responseObject.total);
    });

    it("sets version to 2026", () => {
      const result = service.searchIcd("A");
      expect(result.responseObject.version).toBe("2026");
    });
  });

  // ─── OPS Search ────────────────────────────────────────

  describe("searchOps", () => {
    it("finds entries matching a text query", () => {
      const result = service.searchOps("Untersuchung");
      expect(result.success).toBe(true);
      expect(result.responseObject.items.length).toBeGreaterThan(0);
      expect(result.responseObject.type).toBe("ops");
    });

    it("finds entries matching a code query", () => {
      const result = service.searchOps("1-100");
      expect(result.success).toBe(true);
      expect(result.responseObject.items.length).toBeGreaterThan(0);
    });

    it("returns correct pagination metadata", () => {
      const result = service.searchOps("1", 1, 5);
      expect(result.responseObject.page).toBe(1);
      expect(result.responseObject.limit).toBe(5);
      expect(result.responseObject.items.length).toBeLessThanOrEqual(5);
    });
  });

  // ─── Status ────────────────────────────────────────────

  describe("getIcdStatus", () => {
    it("reports ICD data as loaded", () => {
      const result = service.getIcdStatus();
      expect(result.success).toBe(true);
      expect(result.responseObject.loaded).toBe(true);
      expect(result.responseObject.entryCount).toBeGreaterThan(10000);
      expect(result.responseObject.version).toBe("2026");
    });
  });

  describe("getOpsStatus", () => {
    it("reports OPS data as loaded", () => {
      const result = service.getOpsStatus();
      expect(result.success).toBe(true);
      expect(result.responseObject.loaded).toBe(true);
      expect(result.responseObject.entryCount).toBeGreaterThan(15000);
      expect(result.responseObject.version).toBe("2026");
    });
  });

  // ─── Graceful failure ──────────────────────────────────

  describe("graceful degradation", () => {
    it("returns empty results when data is not loaded", () => {
      const emptyService = new IcdOpsService();
      // Don't initialize – simulating failed load

      const icdResult = emptyService.searchIcd("A");
      expect(icdResult.success).toBe(true);
      expect(icdResult.responseObject.items).toHaveLength(0);
      expect(icdResult.responseObject.total).toBe(0);

      const opsResult = emptyService.searchOps("1");
      expect(opsResult.success).toBe(true);
      expect(opsResult.responseObject.items).toHaveLength(0);
    });

    it("reports data as not loaded when not initialized", () => {
      const emptyService = new IcdOpsService();

      const icdStatus = emptyService.getIcdStatus();
      expect(icdStatus.responseObject.loaded).toBe(false);
      expect(icdStatus.responseObject.entryCount).toBe(0);

      const opsStatus = emptyService.getOpsStatus();
      expect(opsStatus.responseObject.loaded).toBe(false);
      expect(opsStatus.responseObject.entryCount).toBe(0);
    });
  });

  // ─── ICD Prefix Navigation ─────────────────────────────

  describe("searchIcdByCodePrefix", () => {
    it("returns grouped entries for a single-letter prefix", () => {
      const result = service.searchIcdByCodePrefix("M");
      expect(result.success).toBe(true);
      expect(result.responseObject.isGroup).toBe(true);
      expect(result.responseObject.prefix).toBe("M");
      expect(result.responseObject.type).toBe("icd");
      // Should return groups like M0, M1, M2 ... (one per next-char bucket)
      const codes = result.responseObject.items.map((i) => i.code);
      // All codes start with M
      expect(codes.every((c) => c.startsWith("M"))).toBe(true);
      // Each item represents a distinct second-character group
      const seconds = codes.map((c) => c[1]);
      expect(new Set(seconds).size).toBe(seconds.length);
    });

    it("returns grouped entries for a two-char prefix", () => {
      const result = service.searchIcdByCodePrefix("M2");
      expect(result.success).toBe(true);
      expect(result.responseObject.isGroup).toBe(true);
      // Codes should start with M2 and be one per third-char bucket
      const codes = result.responseObject.items.map((i) => i.code);
      expect(codes.every((c) => c.startsWith("M2"))).toBe(true);
      const thirds = codes.map((c) => c.slice(0, 3));
      expect(new Set(thirds).size).toBe(thirds.length);
    });

    it("returns direct entries (no grouping) for a three-char prefix", () => {
      const result = service.searchIcdByCodePrefix("M20");
      expect(result.success).toBe(true);
      expect(result.responseObject.isGroup).toBe(false);
      const codes = result.responseObject.items.map((i) => i.code);
      expect(codes.every((c) => c.startsWith("M20"))).toBe(true);
    });

    it("includes parent context entry when isGroup=false and prefix has a dot", () => {
      // Single-char decimal: "M20.1" → parent = "M20" (strip dot-segment)
      const singleDecimal = service.searchIcdByCodePrefix("M20.1");
      expect(singleDecimal.responseObject.isGroup).toBe(false);
      expect(singleDecimal.responseObject.context).toBeDefined();
      if (singleDecimal.responseObject.context) {
        expect(singleDecimal.responseObject.context.code).toBe("M20");
      }

      // No-dot prefix: context is absent (parent "M2" is not a discrete ICD entry)
      const noDotResult = service.searchIcdByCodePrefix("M20");
      expect(noDotResult.responseObject.isGroup).toBe(false);
      expect(noDotResult.responseObject.context).toBeUndefined();
    });

    it("computes two-level context for multi-char decimal OPS code", () => {
      // "578852" → normalizes to "5-788.52"
      // computeParentCode("5-788.52") → "5-788.5" (strip last char, not whole decimal)
      // so the context banner should show the "5-788.5" category (osteotomy), not "5-788"
      const result = service.searchOpsByCodePrefix("578852");
      expect(result.responseObject.isGroup).toBe(false);
      expect(result.responseObject.prefix).toBe("5-788.52");
      if (result.responseObject.context) {
        expect(result.responseObject.context.code).toBe("5-788.5");
      }
    });

    it("respects the limit parameter", () => {
      const result = service.searchIcdByCodePrefix("M", 5);
      expect(result.responseObject.items.length).toBeLessThanOrEqual(5);
    });

    it("returns empty items for a prefix that matches nothing", () => {
      const result = service.searchIcdByCodePrefix("XYZ999");
      expect(result.success).toBe(true);
      expect(result.responseObject.items).toHaveLength(0);
    });

    it("is case-insensitive for ICD (normalizes to uppercase)", () => {
      const upper = service.searchIcdByCodePrefix("M");
      const lower = service.searchIcdByCodePrefix("m");
      expect(upper.responseObject.items.length).toBe(lower.responseObject.items.length);
    });

    it("returns empty list when data not loaded", () => {
      const emptyService = new IcdOpsService();
      const result = emptyService.searchIcdByCodePrefix("M");
      expect(result.success).toBe(true);
      expect(result.responseObject.items).toHaveLength(0);
    });
  });

  // ─── OPS Prefix Navigation ─────────────────────────────

  describe("searchOpsByCodePrefix", () => {
    it("normalizes single-digit prefix and returns groups", () => {
      const result = service.searchOpsByCodePrefix("5");
      expect(result.success).toBe(true);
      expect(result.responseObject.isGroup).toBe(true);
      // Normalized prefix should be "5-"
      expect(result.responseObject.prefix).toBe("5-");
      const codes = result.responseObject.items.map((i) => i.code);
      expect(codes.every((c) => c.startsWith("5-"))).toBe(true);
      // Each item is from a distinct third-char bucket (5-0, 5-1, ...)
      const groups = codes.map((c) => c.slice(0, 3));
      expect(new Set(groups).size).toBe(groups.length);
    });

    it("normalizes two-digit prefix to hyphenated form", () => {
      const result = service.searchOpsByCodePrefix("55");
      expect(result.success).toBe(true);
      expect(result.responseObject.prefix).toBe("5-5");
      const codes = result.responseObject.items.map((i) => i.code);
      expect(codes.every((c) => c.startsWith("5-5"))).toBe(true);
    });

    it("normalizes five-digit input (no hyphen/dot) with dot insertion", () => {
      // "57886" should become "5-788.6" – same result as typing "5-788.6"
      const withFormatting = service.searchOpsByCodePrefix("5-788.6");
      const withoutFormatting = service.searchOpsByCodePrefix("57886");
      expect(withoutFormatting.responseObject.prefix).toBe("5-788.6");
      expect(withoutFormatting.responseObject.items.length).toBe(
        withFormatting.responseObject.items.length,
      );
    });

    it("returns direct entries for three-digit prefix", () => {
      const result = service.searchOpsByCodePrefix("558");
      expect(result.responseObject.isGroup).toBe(false);
      expect(result.responseObject.prefix).toBe("5-58");
      const codes = result.responseObject.items.map((i) => i.code);
      expect(codes.every((c) => c.startsWith("5-58"))).toBe(true);
    });

    it("respects the limit parameter", () => {
      const result = service.searchOpsByCodePrefix("5", 3);
      expect(result.responseObject.items.length).toBeLessThanOrEqual(3);
    });

    it("returns empty list when data not loaded", () => {
      const emptyService = new IcdOpsService();
      const result = emptyService.searchOpsByCodePrefix("5");
      expect(result.success).toBe(true);
      expect(result.responseObject.items).toHaveLength(0);
    });
  });
});
