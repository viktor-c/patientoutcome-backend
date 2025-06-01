import { StatusCodes } from "http-status-codes";
import request from "supertest";

import { codeRepository, consultationRepository } from "@/api/seed/seedRouter";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import mongoose from "mongoose";
import type { Code } from "../codeModel";

describe("Code API Endpoints", () => {
  beforeAll(async () => {
    // Seed the database with mock data
    const res = await request(app).get("/seed/form-access-codes");
    if (res.status !== StatusCodes.OK) {
      throw new Error("Failed to seed codes");
    }
  });

  describe("GET /form-access-code", () => {
    it("should retrieve all codes", async () => {
      // Act
      const response = await request(app).get("/form-access-code");
      const responseBody: ServiceResponse<Code[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Codes retrieved successfully");
      expect(responseBody.responseObject).toBeInstanceOf(Array);
      expect(responseBody.responseObject?.length).toBe(codeRepository.codeMockData.length);
    });

    // it("should return an empty array if no codes exist", async () => {
    //   // Arrange
    //   await codeRepository.deleteAllCodes(); // Assuming this method exists to clear the database

    //   // Act
    //   const response = await request(app).get("/form-access-code");
    //   const responseBody: ServiceResponse<Code[]> = response.body;

    //   // Assert
    //   expect(response.statusCode).toEqual(StatusCodes.OK);
    //   expect(responseBody.success).toBeTruthy();
    //   expect(responseBody.message).toContain("Codes retrieved successfully");
    //   expect(responseBody.responseObject).toEqual([]);
    // });
  });

  describe("CodeService - getAllAvailableCodes", () => {
    it("should return available codes successfully", async () => {
      const response = await request(app).get("/form-access-code");
      const responseBody: ServiceResponse<Code[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Codes retrieved successfully");
      expect(responseBody.responseObject).toBeInstanceOf(Array);
      expect(responseBody.responseObject?.length).toBe(codeRepository.codeMockData.length);
    });
  });

  describe("GET /form-access-code/activate", () => {
    it("should activate a valid code", async () => {
      // Arrange
      const testCode = codeRepository.codeMockData[0].internalCode;
      const consultationId = consultationRepository.mockConsultations[0]._id;

      // Act
      const response = await request(app).put(`/form-access-code/activate/${testCode}/consultation/${consultationId}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(response.body.success).toBeTruthy();
      expect(response.body.message).toContain("Code activated successfully");
      expect(response.body.responseObject?.activatedOn).toBeDefined();
      expect(response.body.responseObject?.consultationId).toEqual(consultationId);
      expect(response.body.responseObject?.expiresOn).toBeDefined();
      expect(response.body.responseObject?.internalCode).toEqual(testCode);
    });

    it("should return code already activated", async () => {
      // Arrange
      const testCode = codeRepository.codeMockData[0].internalCode;
      const consultationId = consultationRepository.mockConsultations[0]._id;
      // Act
      const response = await request(app).put(`/form-access-code/activate/${testCode}/consultation/${consultationId}`);
      const responseBody: ServiceResponse = response.body;
      // Assert
      expect(response.statusCode).toEqual(StatusCodes.CONFLICT);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Code already activated");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return NOT FOUND for a non existing code", async () => {
      // Arrange
      const invalidCode = "INVALID";
      const consultationId = consultationRepository.mockConsultations[0]._id;
      // Act
      const response = await request(app).put(
        `/form-access-code/activate/${invalidCode}/consultation/${consultationId}`,
      );
      const responseBody: ServiceResponse = response.body;

      // Assert/
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Internal code not found");
    });

    it("should return NOT FOUND for an invalid consultationId", async () => {
      // Arrange
      const internalCode = codeRepository.codeMockData[0].internalCode;
      const consultationId = `${consultationRepository.mockConsultations[0]._id}INVALID`; // Invalid consultationId
      // Act
      const response = await request(app).put(
        `/form-access-code/activate/${internalCode}/consultation/${consultationId}`,
      );
      const responseBody: ServiceResponse = response.body;

      // Assert/
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
    });

    it("should return NOT FOUND for a not existing consultationId", async () => {
      // Arrange
      const internalCode = codeRepository.codeMockData[0].internalCode;
      const consultationId = new mongoose.Types.ObjectId(); // Nonexistent consultationId
      // Act
      const response = await request(app).put(
        `/form-access-code/activate/${internalCode}/consultation/${consultationId}`,
      );
      const responseBody: ServiceResponse = response.body;

      // Assert/
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Consultation not found");
    });

    it("should return CONFLICT for a consultation that already has an active code", async () => {
      // Arrange
      // by this time in the test suite, codeMockData[0] should be activated
      const consultationId = consultationRepository.mockConsultations[0]._id;

      const newCode = codeRepository.codeMockData[2].internalCode;
      // Act
      const response = await request(app).put(`/form-access-code/activate/${newCode}/consultation/${consultationId}`);
      const responseBody: ServiceResponse = response.body;
      // Assert
      expect(response.statusCode).toEqual(StatusCodes.CONFLICT);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Consultation already has an active code");
    });
  });

  describe("PUT /form-access-code/deactivate", () => {
    it("should deactivate a valid code", async () => {
      // Arrange
      const internalCode = codeRepository.codeMockData[0].internalCode;

      // Act
      const response = await request(app).put(`/form-access-code/deactivate/${internalCode}`);
      const responseBody: ServiceResponse<Code> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Code deactivated successfully");
      expect(responseBody.responseObject?.activatedOn).toBeUndefined();
      expect(responseBody.responseObject?.expiresOn).toBeUndefined();
      expect(responseBody.responseObject?.consultationId).toBeUndefined();
      expect(responseBody.responseObject?.internalCode).toEqual(internalCode);
    });

    it("should return NOT FOUND for an invalid code", async () => {
      // Arrange
      const invalidCode = "INVALID";

      // Act
      const response = await request(app).put(`/form-access-code/deactivate/${invalidCode}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Code not found");
    });
  });

  describe("POST /form-access-code", () => {
    it("should create a new code", async () => {
      // Arrange
      const newCode: Code = {
        externalCode: "ABC12",
        internalCode: "123e4567-e89b-12d3-a456-426614174000",
      };

      // Act
      const response = await request(app).post("/form-access-code").send(newCode);
      const responseBody: ServiceResponse<Code> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.CREATED);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Code added successfully");
      expect(responseBody.responseObject).toMatchObject(newCode);
    });
  });

  describe("DELETE /form-access-code/:externalCode", () => {
    it("should delete a code successfully", async () => {
      // Arrange
      const testCode = codeRepository.codeMockData[1].externalCode;

      // Act
      const response = await request(app).delete(`/form-access-code/${testCode}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Code deleted successfully");
    });

    it("should return NOT FOUND for a nonexistent code", async () => {
      // Arrange
      const invalidCode = "INVALID";

      // Act
      const response = await request(app).delete(`/form-access-code/${invalidCode}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Code not found");
    });
  });

  describe("GET /form-access-code/:internalCode", () => {
    it("should retrieve a code by internalCode", async () => {
      // Arrange
      const testInternalCode = codeRepository.codeMockData[0].internalCode;

      // Act
      const response = await request(app).get(`/form-access-code/${testInternalCode}`);
      const responseBody: ServiceResponse<Code> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Code retrieved successfully");
      expect(responseBody.responseObject?.internalCode).toEqual(testInternalCode);
    });

    it("should return NOT FOUND for a nonexistent internalCode", async () => {
      // Arrange
      const invalidInternalCode = "123e4567-e89b-12d3-a456-426614174999";

      // Act
      const response = await request(app).get(`/form-access-code/${invalidInternalCode}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Code not found");
    });
  });
});
