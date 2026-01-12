import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { app } from "@/server";
import { SurgeryRepository } from "../surgeryRepository";

describe("Surgery API", () => {
  beforeAll(async () => {
    // Reset surgery mock data using SurgeryRepository
    const surgeryRepository = new SurgeryRepository();
    await surgeryRepository.createMockSurgeryData();
  });
  describe("GET /surgeries", () => {
    it("should return 200 for successful retrieval", async () => {
      // Act
      const response = await request(app).get("/surgeries");

      // Assert
      expect(response.status).toBe(StatusCodes.OK);
    });
  });

  describe("GET /surgery/:surgeryId", () => {
    it("should return 400 for invalid surgery ID", async () => {
      // Act
      const response = await request(app).get("/surgery/invalid-id");

      // Assert
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it("should return 404 for non-existent surgery", async () => {
      // Act
      const response = await request(app).get("/surgery/507f1f77bcf86cd799439011");

      // Assert
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe("POST /surgery", () => {
    it("should return 400 for missing required fields", async () => {
      // Arrange
      const invalidSurgery = {
        // Missing required fields like side, surgeryDate, patientCase
        therapy: "Test therapy",
      };

      // Act
      const response = await request(app).post("/surgery").send(invalidSurgery);

      // Assert
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe("PUT /surgery/:surgeryId", () => {
    it("should return 400 for invalid surgery ID", async () => {
      // Arrange
      const updateData = {
        therapy: "Updated therapy",
      };

      // Act
      const response = await request(app).put("/surgery/invalid-id").send(updateData);

      // Assert
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe("DELETE /surgery/:surgeryId", () => {
    it("should return 400 for invalid surgery ID", async () => {
      // Act
      const response = await request(app).delete("/surgery/invalid-id");

      // Assert
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it("should return 404 for non-existent surgery", async () => {
      // Act
      const response = await request(app).delete("/surgery/507f1f77bcf86cd799439011");

      // Assert
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe("GET /surgeries/case/:patientCaseId", () => {
    it("should return 400 for invalid patient case ID", async () => {
      // Act
      const response = await request(app).get("/surgeries/case/invalid-id");

      // Assert
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe("GET /surgeries/diagnosis/:diagnosis", () => {
    it("should return surgeries by diagnosis", async () => {
      // Act
      const response = await request(app).get("/surgeries/diagnosis/test-diagnosis");

      // Assert
      expect(response.status).toBe(StatusCodes.OK); // Returns empty array if no surgeries exist
      expect(response.body.responseObject).toBeInstanceOf(Array);
    });
  });

  describe("GET /surgeries/surgeon/:surgeonId", () => {
    it("should return 400 for invalid surgeon ID", async () => {
      // Act
      const response = await request(app).get("/surgeries/surgeon/invalid-id");

      // Assert
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe("GET /surgeries/side/:side", () => {
    it("should return surgeries by side", async () => {
      // Act
      const response = await request(app).get("/surgeries/side/left");

      // Assert
      expect(response.status).toBe(StatusCodes.OK); // Since no surgeries exist
      expect(response.body.responseObject).toBeInstanceOf(Array);
      expect(response.body.responseObject).toHaveLength(1);
    });

    it("should return 400 for invalid side", async () => {
      // Act
      const response = await request(app).get("/surgeries/side/invalid-side");

      // Assert
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });
  });
});
