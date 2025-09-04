import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { KioskRepository } from "@/api/kiosk/kioskRepository";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";

const kioskRepository = new KioskRepository();

describe("Seed Kiosk API", () => {
  describe("GET /seed/kiosks", () => {
    it("should seed kiosk mock data successfully", async () => {
      // Test seeding
      const response = await request(app).get("/seed/kiosks");

      const responseBody: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toEqual("Kiosk mock data inserted successfully");

      // Verify data was actually inserted
      const allKiosks = await kioskRepository.getAllKiosks();
      expect(allKiosks.length).toBeGreaterThan(0);
    });
  });

  describe("GET /seed/reset-all", () => {
    it("should include kiosk data in reset-all operation", async () => {
      // Test reset-all
      const response = await request(app).get("/seed/reset-all");

      const responseBody: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toEqual("All mock data reset successfully");

      // Verify kiosk data was also seeded
      const allKiosks = await kioskRepository.getAllKiosks();
      expect(allKiosks.length).toBeGreaterThan(0);
    });
  });
});
