import { codeRepository } from "@/api/code/codeRepository";
import { consultationRepository } from "@/api/consultation/consultationRepository";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import { loginUserAgent } from "@/utils/unitTesting";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";
import { beforeAll, describe, expect, it } from "vitest";
import type { Code } from "../codeModel";

describe("Code API Endpoints", () => {
  let agent: TestAgent;

  beforeAll(async () => {
    // Login with MFA role and get agent that handles sessions automatically
    agent = await loginUserAgent("mfa");

    // Seed the database with mock data
    const res = await agent.get("/seed/form-access-codes");
    if (res.status !== StatusCodes.OK) {
      throw new Error("Failed to seed codes");
    }
    //also need to seed consultations, because it depends on them
    const resConsultations = await agent.get("/seed/consultation");
    if (resConsultations.status !== StatusCodes.OK) {
      throw new Error("Failed to seed consultations");
    }
  });

  describe("GET /form-access-code/all", () => {
    it("should retrieve all codes", async () => {
      // Act
      const response = await agent.get("/form-access-code/all");
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
    //   const response = await agent.get("/form-access-code/all");
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
      const response = await agent.get("/form-access-code/all-available");
      const responseBody: ServiceResponse<Code[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Available codes retrieved successfully");
      expect(responseBody.responseObject).toBeInstanceOf(Array);
    });
  });

  describe("GET /form-access-code/activate", () => {
    it("should return code already activated", async () => {
      // Arrange
      const testCode = codeRepository.codeMockData[0].code;
      const consultationId = consultationRepository.mockConsultations[4]._id;
      // Act
      const response = await agent.put(`/form-access-code/activate/${testCode}/consultation/${consultationId}`);
      const responseBody: ServiceResponse = response.body;
      // Assert
      expect(response.statusCode).toEqual(StatusCodes.CONFLICT);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Code already activated");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return NOT FOUND for a non existing code", async () => {
      // Arrange
      const invalidCode = "INV12";
      const consultationId = consultationRepository.mockConsultations[4]._id;
      // Act
      const response = await agent.put(`/form-access-code/activate/${invalidCode}/consultation/${consultationId}`);
      const responseBody: ServiceResponse = response.body;

      // Assert/
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Code not found");
    });

    it("should return NOT FOUND for an invalid consultationId", async () => {
      // Arrange
      const codeString = codeRepository.codeMockData[0].code;
      const consultationId = `${consultationRepository.mockConsultations[0]._id}INVALID`; // Invalid consultationId
      // Act
      const response = await agent.put(`/form-access-code/activate/${codeString}/consultation/${consultationId}`);
      const responseBody: ServiceResponse = response.body;

      // Assert/
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
    });

    it("should return NOT FOUND for a not existing consultationId", async () => {
      // Arrange
      const codeString = codeRepository.codeMockData[1].code;
      const consultationId = new mongoose.Types.ObjectId(); // Nonexistent consultationId
      // Act
      const response = await agent.put(`/form-access-code/activate/${codeString}/consultation/${consultationId}`);
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

      const newCode = codeRepository.codeMockData[2].code;
      // Act
      const response = await agent.put(`/form-access-code/activate/${newCode}/consultation/${consultationId}`);
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
      const addCodesResponse = await agent.post("/form-access-code/addCodes/5");
      expect(addCodesResponse.status).toBe(StatusCodes.CREATED);
      expect(Array.isArray(addCodesResponse.body.responseObject)).toBe(true);
      expect(addCodesResponse.body.responseObject.length).toBe(5);

      // Check that all codes have "activatedOn" = undefined
      addCodesResponse.body.responseObject.forEach((code: any) => {
        expect(code.activatedOn).toBeUndefined();
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

      const activateResponse = await agent.put(
        `/form-access-code/activate/${codeToActivate.code}/consultation/${consultation._id}`,
      );

      expect(activateResponse.status).toBe(StatusCodes.OK);
      expect(activateResponse.body.responseObject.activatedOn).toBeDefined();
      expect(activateResponse.body.responseObject.expiresOn).toBeDefined();
      expect(activateResponse.body.responseObject.consultationId).toEqual(consultation._id);
      expect(activateResponse.body.responseObject.code).toEqual(codeToActivate.code);
      expect(activateResponse.body.responseObject._id).toBeUndefined(); // _id should not be returned
    });

    it("should deactivate the code", async () => {
      const codeToDeactivate = addedCodes[0];
      const deactivateResponse = await agent.put(`/form-access-code/deactivate/${codeToDeactivate.code}`);

      expect(deactivateResponse.status).toBe(StatusCodes.OK);
      expect(deactivateResponse.body.success).toBeTruthy();
      expect(deactivateResponse.body.message).toContain("Code deactivated successfully");
      expect(deactivateResponse.body.responseObject.activatedOn).toBeUndefined();
      expect(deactivateResponse.body.responseObject.expiresOn).toBeUndefined();
      expect(deactivateResponse.body.responseObject.consultationId).toBeUndefined();
      expect(deactivateResponse.body.responseObject.code).toEqual(codeToDeactivate.code);
    });
    it("should delete a code successfully", async () => {
      // Arrange
      const testCode = addedCodes[0].code;

      // Act
      const response = await agent.delete(`/form-access-code/${testCode}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NO_CONTENT);
    });

    it("should return NOT FOUND for a nonexistent code", async () => {
      // Arrange
      const invalidCode = "INV12";

      // Act
      const response = await agent.delete(`/form-access-code/${invalidCode}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Code not found");
    });

    it("cannot deactivate an non existent code", async () => {
      const invalidCode = "INV12";
      const response = await agent.put(`/form-access-code/deactivate/${invalidCode}`);
      const responseBody: ServiceResponse = response.body;

      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.responseObject).toBeNull();
      expect(responseBody.message).toContain("Code not found");
    });
  });

  describe("GET /form-access-code/byId/:id", () => {
    it("should retrieve a code by its internalCode", async () => {
      // Arrange
      const testInternalCode = codeRepository.codeMockData[0]._id;

      // Act
      const response = await agent.get(`/form-access-code/byId/${testInternalCode}`);
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
      const response = await agent.get(`/form-access-code/byId/${invalidInternalCode}`);
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
      const response = await agent.get(`/form-access-code/byId/${nonExistentInternalCode}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Internal code not found");
    });
  });
});
