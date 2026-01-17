import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { PatientCase } from "@/api/case/patientCaseModel";
import { patientRepository } from "@/api/seed/seedRouter";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";

describe("Patient Case Soft Delete API Endpoints", () => {
  let testPatientId: string;
  let testPatientId2: string;
  let testCaseId: string;
  let testCaseId2: string;

  beforeAll(async () => {
    // Seed test data
    try {
      const res = await request(app).get("/seed/patients");
      if (res.status !== StatusCodes.OK) {
        throw new Error("Failed to insert patient data");
      }
      const caseRes = await request(app).get("/seed/patientCase");
      if (caseRes.status !== StatusCodes.OK) {
        throw new Error("Failed to insert case data");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Setup failed: ${error.message}`);
      } else {
        throw new Error("Setup failed: Unknown error");
      }
    }
  });

  beforeEach(() => {
    // Use seeded mock patients and cases
    testPatientId = patientRepository.mockPatients[0]._id as string;
    testPatientId2 = patientRepository.mockPatients[1]._id as string;
    // First patient has one case, second patient has another
    testCaseId = patientRepository.mockPatients[0].cases?.[0] as string;
    testCaseId2 = patientRepository.mockPatients[1].cases?.[0] as string;
  });

  describe("POST /patient/:patientId/case/:caseId/soft-delete", () => {
    it("should soft delete a case successfully", async () => {
      // Act
      const response = await request(app).post(
        `/patient/${testPatientId}/case/${testCaseId}/soft-delete`
      );
      const responseBody: ServiceResponse<PatientCase> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("soft deleted successfully");
      expect(responseBody.responseObject).toBeDefined();
      expect(responseBody.responseObject?.deletedAt).toBeDefined();
      expect(responseBody.responseObject?.deletedAt).not.toBeNull();
    });

    it("should return 404 for non-existent case", async () => {
      // Act
      const response = await request(app).post(
        `/patient/${testPatientId}/case/507f1f77bcf86cd799439011/soft-delete`
      );

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it("should return 400 for invalid case ID", async () => {
      // Act
      const response = await request(app).post(
        `/patient/${testPatientId}/case/invalid-id/soft-delete`
      );

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });

    it("should exclude soft-deleted case from patient cases query", async () => {
      // Arrange
      await request(app).post(`/patient/${testPatientId}/case/${testCaseId}/soft-delete`);

      // Act
      const response = await request(app).get(`/patient/${testPatientId}/cases`);
      const responseBody: ServiceResponse<PatientCase[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      const deletedCase = responseBody.responseObject?.find(
        (c) => c._id?.toString() === testCaseId
      );
      expect(deletedCase).toBeUndefined();
    });
  });

  describe("POST /case/soft-delete (batch)", () => {
    it("should soft delete multiple cases successfully", async () => {
      // Act
      const response = await request(app)
        .post("/case/soft-delete")
        .send({ caseIds: [testCaseId, testCaseId2] });
      const responseBody: ServiceResponse<{ count: number }> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject?.count).toBe(2);
    });

    it("should handle empty array", async () => {
      // Act
      const response = await request(app).post("/case/soft-delete").send({ caseIds: [] });
      const responseBody: ServiceResponse<{ count: number }> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.responseObject?.count).toBe(0);
    });

    it("should validate caseIds parameter", async () => {
      // Act
      const response = await request(app).post("/case/soft-delete").send({});

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });
  });

  describe("GET /case/deleted", () => {
    beforeEach(async () => {
      // Soft delete both test cases for this test group
      await request(app).post(`/patient/${testPatientId}/case/${testCaseId}/soft-delete`);
      await request(app).post(`/patient/${testPatientId2}/case/${testCaseId2}/soft-delete`);
    });

    it("should return paginated list of soft-deleted cases", async () => {
      // Act
      const response = await request(app).get("/case/deleted");
      const responseBody: ServiceResponse<{
        cases: PatientCase[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Deleted cases found");
      expect(responseBody.responseObject?.cases).toBeDefined();
      expect(responseBody.responseObject?.cases.length).toBeGreaterThanOrEqual(2);

      // Verify all returned cases have deletedAt set
      responseBody.responseObject?.cases.forEach((caseItem) => {
        expect(caseItem.deletedAt).toBeDefined();
        expect(caseItem.deletedAt).not.toBeNull();
      });
    });

    it("should support pagination parameters", async () => {
      // Act
      const response = await request(app).get("/case/deleted?page=1&limit=1");
      const responseBody: ServiceResponse<{
        cases: PatientCase[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.responseObject?.cases).toHaveLength(1);
      expect(responseBody.responseObject?.page).toBe(1);
      expect(responseBody.responseObject?.limit).toBe(1);
    });

    it("should not include non-deleted cases", async () => {
      // Act
      const response = await request(app).get("/case/deleted");
      const responseBody: ServiceResponse<{
        cases: PatientCase[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }> = response.body;

      // Assert - only deleted cases should be in the list
      expect(response.statusCode).toEqual(StatusCodes.OK);
      responseBody.responseObject?.cases.forEach((caseItem) => {
        expect(caseItem.deletedAt).toBeDefined();
        expect(caseItem.deletedAt).not.toBeNull();
      });
    });
  });

  describe("POST /case/:caseId/restore", () => {
    beforeEach(async () => {
      // Soft delete a case first
      await request(app).post(`/patient/${testPatientId}/case/${testCaseId}/soft-delete`);
    });

    it("should restore a soft-deleted case successfully", async () => {
      // Act
      const response = await request(app).post(`/case/${testCaseId}/restore`);
      const responseBody: ServiceResponse<PatientCase> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("restored successfully");
      expect(responseBody.responseObject?.deletedAt).toBeNull();
    });

    it("should make restored case available in patient cases query", async () => {
      // Arrange
      await request(app).post(`/case/${testCaseId}/restore`);

      // Act
      const response = await request(app).get(`/patient/${testPatientId}/cases`);
      const responseBody: ServiceResponse<PatientCase[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      const restoredCase = responseBody.responseObject?.find(
        (c) => c._id?.toString() === testCaseId
      );
      expect(restoredCase).toBeDefined();
    });

    it("should return 404 for non-existent case", async () => {
      // Act
      const response = await request(app).post("/case/507f1f77bcf86cd799439011/restore");

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it("should handle restoring already active case", async () => {
      // Arrange - restore once
      await request(app).post(`/case/${testCaseId}/restore`);

      // Act - restore again
      const response = await request(app).post(`/case/${testCaseId}/restore`);

      // Assert - should still succeed
      expect(response.statusCode).toEqual(StatusCodes.OK);
    });
  });

  describe("Soft delete integration with case search", () => {
    beforeEach(async () => {
      await request(app).post(`/patient/${testPatientId}/case/${testCaseId}/soft-delete`);
    });

    it("should not return soft-deleted cases in external ID search", async () => {
      // Use valid 3+ character search query from seeded mock case ("84612")
      const searchQuery = "846";
      
      // Act - search should not return deleted case
      const response = await request(app).get(`/case/search/${searchQuery}`);
      const responseBody: ServiceResponse<PatientCase[]> = response.body;

      // Assert - soft deleted case should not appear in results
      // Search may return OK with empty results or 404 if no matches
      if (response.statusCode === StatusCodes.OK) {
        const foundCase = responseBody.responseObject?.find(
          (c) => c._id?.toString() === testCaseId
        );
        expect(foundCase).toBeUndefined();
      } else {
        // 404 is also acceptable if no results
        expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      }
    });
  });

  describe("DELETE /patient/:patientId/case/:caseId (permanent delete)", () => {
    beforeEach(async () => {
      await request(app).post(`/patient/${testPatientId}/case/${testCaseId}/soft-delete`);
    });

    it("should permanently delete a case", async () => {
      // Act
      const response = await request(app).delete(`/patient/${testPatientId}/case/${testCaseId}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NO_CONTENT);

      // Verify case is gone from deleted list too
      const deletedListResponse = await request(app).get("/case/deleted");
      const deletedCase = deletedListResponse.body.responseObject?.cases.find(
        (c: PatientCase) => c._id?.toString() === testCaseId
      );
      expect(deletedCase).toBeUndefined();
    });
  });

  describe("Soft delete independence", () => {
    it("should allow independent soft delete of cases without affecting patient", async () => {
      // Use mockPatients[1] case since the first patient's case may have been permanently deleted
      const independentPatientId = patientRepository.mockPatients[1]._id as string;
      const independentCaseId = patientRepository.mockPatients[1].cases?.[0] as string;
      
      // Act - Soft delete case independently
      const softDeleteResponse = await request(app).post(`/patient/${independentPatientId}/case/${independentCaseId}/soft-delete`);
      expect(softDeleteResponse.statusCode).toEqual(StatusCodes.OK);
      
      // Assert - Case should be in deleted list
      const deletedCases = await request(app).get("/case/deleted");
      expect(deletedCases.statusCode).toEqual(StatusCodes.OK);
      const deletedCase = deletedCases.body.responseObject?.cases.find(
        (c: PatientCase) => c._id?.toString() === independentCaseId
      );
      expect(deletedCase).toBeDefined();
      expect(deletedCase?.deletedAt).toBeDefined();
    });
  });
});
