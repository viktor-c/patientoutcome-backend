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
});
