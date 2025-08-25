import { consultationRepository } from "@/api/consultation/consultationRepository";
import { codeRepository } from "@/api/seed/seedRouter";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { Code } from "../codeModel";

describe("Code API Endpoints", () => {
  beforeAll(async () => {
    // Seed the database with mock data
    const res = await request(app).get("/seed/form-access-codes");
    if (res.status !== StatusCodes.OK) {
      throw new Error("Failed to seed codes");
    }
    //also need to seed consultations, because it depends on them
    const resConsultations = await request(app).get("/seed/consultation");
    if (resConsultations.status !== StatusCodes.OK) {
      throw new Error("Failed to seed consultations");
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
    it("should return code already activated", async () => {
      // Arrange
      const testCode = codeRepository.codeMockData[0].externalCode;
      const consultationId = consultationRepository.mockConsultations[4]._id;
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
      // Arrange, must be a valid ObjectId
      const invalidCode = "677da5efcb4569adaa655560";
      const consultationId = consultationRepository.mockConsultations[4]._id;
      // Act
      const response = await request(app).put(
        `/form-access-code/activate/${invalidCode}/consultation/${consultationId}`,
      );
      const responseBody: ServiceResponse = response.body;

      // Assert/
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("External code not found");
    });

    it("should return NOT FOUND for an invalid consultationId", async () => {
      // Arrange
      const internalCode = codeRepository.codeMockData[0]._id;
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
      const internalCode = codeRepository.codeMockData[1]._id;
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

      const newCode = codeRepository.codeMockData[2]._id;
      // Act
      const response = await request(app).put(`/form-access-code/activate/${newCode}/consultation/${consultationId}`);
      const responseBody: ServiceResponse = response.body;
      // Assert
      expect(response.statusCode).toEqual(StatusCodes.CONFLICT);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Consultation already has an active code");
    });
  });

  describe("Add 5 Codes, activate and deactivate them, then delete them", () => {
    let addedCodes: Code[];
    it("should add 5 codes using backend 'addCodes' and verify their initial state", async () => {
      // Add 5 codes
      const addCodesResponse = await request(app).post("/form-access-code/addCodes/5");
      expect(addCodesResponse.status).toBe(StatusCodes.CREATED);
      expect(Array.isArray(addCodesResponse.body.responseObject)).toBe(true);
      expect(addCodesResponse.body.responseObject.length).toBe(5);

      // Check that all codes have "activated" = undefined
      addCodesResponse.body.responseObject.forEach((code: any) => {
        expect(code.activated).toBeUndefined();
        expect(code.expiresOn).toBeUndefined();
        expect(code.consultationId).toBeUndefined();
      });
      addedCodes = addCodesResponse.body.responseObject;
    });

    it("should activate the first code in the list for a given consultation ID", async () => {
      const codeToActivate = addedCodes[0];
      const consultation = consultationRepository.mockConsultations[3];
      expect(consultation).toBeDefined();
      expect(consultation._id).toBeDefined();

      const activateResponse = await request(app).put(
        `/form-access-code/activate/${codeToActivate.externalCode}/consultation/${consultation._id}`,
      );

      expect(activateResponse.status).toBe(StatusCodes.OK);
      expect(activateResponse.body.responseObject.activatedOn).toBeDefined();
      expect(activateResponse.body.responseObject.expiresOn).toBeDefined();
      expect(activateResponse.body.responseObject.consultationId).toEqual(consultation._id);
      expect(activateResponse.body.responseObject.externalCode).toEqual(codeToActivate.externalCode);
      expect(activateResponse.body.responseObject._id).toBeUndefined(); // _id should not be returned
    });

    it("should deactivate the code", async () => {
      const codeToDeactivate = addedCodes[0];
      const deactivateResponse = await request(app).put(
        `/form-access-code/deactivate/${codeToDeactivate.externalCode}`,
      );

      expect(deactivateResponse.status).toBe(StatusCodes.OK);
      expect(deactivateResponse.body.success).toBeTruthy();
      expect(deactivateResponse.body.message).toContain("Code deactivated successfully");
      expect(deactivateResponse.body.responseObject.activated).toBeUndefined();
      expect(deactivateResponse.body.responseObject.expiresOn).toBeUndefined();
      expect(deactivateResponse.body.responseObject.consultationId).toBeUndefined();
      expect(deactivateResponse.body.responseObject.externalCode).toEqual(codeToDeactivate.externalCode);
    });
    it("should delete a code successfully", async () => {
      // Arrange
      const testCode = addedCodes[0].externalCode;

      // Act
      const response = await request(app).delete(`/form-access-code/code/${testCode}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NO_CONTENT);
    });

    it("should return NOT FOUND for a nonexistent code", async () => {
      // Arrange
      const invalidCode = "INV12";

      // Act
      const response = await request(app).delete(`/form-access-code/code/${invalidCode}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("External code not found");
    });

    it("cannot deactivate an non existent code", async () => {
      const invalidCode = "INV12";
      const response = await request(app).put(`/form-access-code/deactivate/${invalidCode}`);
      const responseBody: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.responseObject).toBeNull();
      expect(responseBody.message).toContain("External code not found");
    });
  });

  describe("GET /form-access-code/internal-code/:internalCode", () => {
    it("should retrieve a code by its internalCode", async () => {
      // Arrange
      const testInternalCode = codeRepository.codeMockData[0]._id;

      // Act
      const response = await request(app).get(`/form-access-code/internal-code/${testInternalCode}`);
      const responseBody: ServiceResponse<Code> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Code retrieved successfully");
      expect(responseBody.responseObject?._id).toEqual(testInternalCode);
    });

    it("should return BAD REQUEST for an invalid code", async () => {
      // Arrange
      const invalidInternalCode = "123e4567-e89b-12d3-a456-426614174999";

      // Act
      const response = await request(app).get(`/form-access-code/internal-code/${invalidInternalCode}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
    });
    it("should return NOT FOUND for a nonexistent internalCode", async () => {
      // Arrange
      const nonExistentInternalCode = new mongoose.Types.ObjectId();

      // Act
      const response = await request(app).get(`/form-access-code/internal-code/${nonExistentInternalCode}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Internal code not found");
    });
  });
});
