import { describe, it, expect, beforeAll } from "vitest";
import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { ServiceResponse } from "@/common/models/serviceResponse";
import type { IcdOpsPaginatedResponse } from "@/api/icdops/icdopsModel";
import { app } from "@/server";
import { icdopsService } from "@/api/icdops/icdopsService";

// ──────────────────────────────────────────────────────────────
// ICD-OPS Router Integration Tests
//
// These tests hit the real Express app with the in-memory
// ICD/OPS data loaded from the ClaML XML files.
// ──────────────────────────────────────────────────────────────

describe("ICD-OPS API Endpoints", () => {
  // Ensure data is loaded before running tests
  beforeAll(async () => {
    await icdopsService.initialize();
  }, 30_000); // XML parsing can take a few seconds

  // ─── ICD-10 Search ─────────────────────────────────────

  describe("GET /icdops/icd/search", () => {
    it("returns paginated results for a valid query", async () => {
      const response = await request(app)
        .get("/icdops/icd/search")
        .query({ q: "Cholera" });

      expect(response.statusCode).toEqual(StatusCodes.OK);

      const result: ServiceResponse<IcdOpsPaginatedResponse> = response.body;
      expect(result.success).toBe(true);
      expect(result.responseObject).toBeDefined();
      expect(result.responseObject.type).toBe("icd");
      expect(result.responseObject.version).toBe("2026");
      expect(result.responseObject.items.length).toBeGreaterThan(0);
      expect(result.responseObject.items.length).toBeLessThanOrEqual(10);
      expect(result.responseObject.total).toBeGreaterThan(0);
      expect(result.responseObject.page).toBe(1);

      // Check that items have the right shape
      const firstItem = result.responseObject.items[0];
      expect(firstItem).toHaveProperty("code");
      expect(firstItem).toHaveProperty("label");
      expect(firstItem).toHaveProperty("kind");
    });

    it("supports searching by ICD code", async () => {
      const response = await request(app)
        .get("/icdops/icd/search")
        .query({ q: "A00" });

      expect(response.statusCode).toEqual(StatusCodes.OK);

      const result: ServiceResponse<IcdOpsPaginatedResponse> = response.body;
      expect(result.success).toBe(true);
      expect(result.responseObject.items.length).toBeGreaterThan(0);

      // All results should contain "A00" in the code
      for (const item of result.responseObject.items) {
        expect(item.code.toLowerCase()).toContain("a00");
      }
    });

    it("respects the limit parameter", async () => {
      const response = await request(app)
        .get("/icdops/icd/search")
        .query({ q: "A", limit: 5 });

      expect(response.statusCode).toEqual(StatusCodes.OK);

      const result: ServiceResponse<IcdOpsPaginatedResponse> = response.body;
      expect(result.responseObject.items.length).toBeLessThanOrEqual(5);
      expect(result.responseObject.limit).toBe(5);
    });

    it("supports pagination", async () => {
      const page1 = await request(app)
        .get("/icdops/icd/search")
        .query({ q: "A", limit: 5, page: 1 });

      const page2 = await request(app)
        .get("/icdops/icd/search")
        .query({ q: "A", limit: 5, page: 2 });

      expect(page1.statusCode).toEqual(StatusCodes.OK);
      expect(page2.statusCode).toEqual(StatusCodes.OK);

      const result1: ServiceResponse<IcdOpsPaginatedResponse> = page1.body;
      const result2: ServiceResponse<IcdOpsPaginatedResponse> = page2.body;

      expect(result1.responseObject.page).toBe(1);
      expect(result2.responseObject.page).toBe(2);

      // Pages should have different items
      if (result1.responseObject.items.length > 0 && result2.responseObject.items.length > 0) {
        expect(result1.responseObject.items[0].code).not.toBe(
          result2.responseObject.items[0].code,
        );
      }
    });

    it("supports kind filter 'all'", async () => {
      const response = await request(app)
        .get("/icdops/icd/search")
        .query({ q: "A00", kind: "all" });

      expect(response.statusCode).toEqual(StatusCodes.OK);

      const result: ServiceResponse<IcdOpsPaginatedResponse> = response.body;
      const kinds = new Set(result.responseObject.items.map((i) => i.kind));
      // With 'all' we should get more variety (blocks + categories)
      expect(kinds.size).toBeGreaterThanOrEqual(1);
    });

    it("returns empty results for a non-matching query", async () => {
      const response = await request(app)
        .get("/icdops/icd/search")
        .query({ q: "xyznonexistent12345" });

      expect(response.statusCode).toEqual(StatusCodes.OK);

      const result: ServiceResponse<IcdOpsPaginatedResponse> = response.body;
      expect(result.success).toBe(true);
      expect(result.responseObject.items).toHaveLength(0);
      expect(result.responseObject.total).toBe(0);
    });

    it("returns 400 when q parameter is missing", async () => {
      const response = await request(app).get("/icdops/icd/search");

      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });
  });

  // ─── OPS Search ────────────────────────────────────────

  describe("GET /icdops/ops/search", () => {
    it("returns paginated results for a valid query", async () => {
      const response = await request(app)
        .get("/icdops/ops/search")
        .query({ q: "Untersuchung" });

      expect(response.statusCode).toEqual(StatusCodes.OK);

      const result: ServiceResponse<IcdOpsPaginatedResponse> = response.body;
      expect(result.success).toBe(true);
      expect(result.responseObject).toBeDefined();
      expect(result.responseObject.type).toBe("ops");
      expect(result.responseObject.version).toBe("2026");
      expect(result.responseObject.items.length).toBeGreaterThan(0);
    });

    it("supports searching by OPS code", async () => {
      const response = await request(app)
        .get("/icdops/ops/search")
        .query({ q: "1-20" });

      expect(response.statusCode).toEqual(StatusCodes.OK);

      const result: ServiceResponse<IcdOpsPaginatedResponse> = response.body;
      expect(result.success).toBe(true);
      expect(result.responseObject.items.length).toBeGreaterThan(0);
    });

    it("returns empty results for a non-matching query", async () => {
      const response = await request(app)
        .get("/icdops/ops/search")
        .query({ q: "zzznonexistent99999" });

      expect(response.statusCode).toEqual(StatusCodes.OK);

      const result: ServiceResponse<IcdOpsPaginatedResponse> = response.body;
      expect(result.success).toBe(true);
      expect(result.responseObject.items).toHaveLength(0);
    });
  });

  // ─── Status Endpoints ──────────────────────────────────

  describe("GET /icdops/icd/status", () => {
    it("returns ICD data status", async () => {
      const response = await request(app).get("/icdops/icd/status");

      expect(response.statusCode).toEqual(StatusCodes.OK);

      const result: ServiceResponse<{ version: string; loaded: boolean; entryCount: number }> =
        response.body;
      expect(result.success).toBe(true);
      expect(result.responseObject.version).toBe("2026");
      expect(result.responseObject.loaded).toBe(true);
      expect(result.responseObject.entryCount).toBeGreaterThan(10000);
    });
  });

  describe("GET /icdops/ops/status", () => {
    it("returns OPS data status", async () => {
      const response = await request(app).get("/icdops/ops/status");

      expect(response.statusCode).toEqual(StatusCodes.OK);

      const result: ServiceResponse<{ version: string; loaded: boolean; entryCount: number }> =
        response.body;
      expect(result.success).toBe(true);
      expect(result.responseObject.version).toBe("2026");
      expect(result.responseObject.loaded).toBe(true);
      expect(result.responseObject.entryCount).toBeGreaterThan(15000);
    });
  });
});
