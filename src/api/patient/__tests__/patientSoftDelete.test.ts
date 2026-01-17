import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { Patient } from "@/api/patient/patientModel";
import type { PaginatedResult } from "@/api/patient/patientRepository";
import { patientRepository } from "@/api/seed/seedRouter";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";

describe("Patient Soft Delete API Endpoints", () => {
  let testPatientId: string;
  let testPatientId2: string;
  let testPatientId3: string;

  beforeAll(async () => {
    // Seed test data
    try {
      const res = await request(app).get("/seed/patients");
      if (res.status !== StatusCodes.OK) {
        throw new Error("Failed to insert patient data");
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
    // Use seeded mock patients for testing
    testPatientId = patientRepository.mockPatients[2]._id as string;
    testPatientId2 = patientRepository.mockPatients[3]._id as string;
    testPatientId3 = patientRepository.mockPatients[4]._id as string;
  });

  describe("POST /patient/:id/soft-delete", () => {
    it("should soft delete a patient successfully", async () => {
      // Act
      const response = await request(app).post(`/patient/${testPatientId}/soft-delete`);
      const responseBody: ServiceResponse<Patient> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("soft deleted successfully");
      expect(responseBody.responseObject).toBeDefined();
      expect(responseBody.responseObject?.deletedAt).toBeDefined();
      expect(responseBody.responseObject?.deletedAt).not.toBeNull();
    });

    it("should return 404 for non-existent patient", async () => {
      // Act
      const response = await request(app).post("/patient/507f1f77bcf86cd799439011/soft-delete");

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it("should return 400 for invalid patient ID", async () => {
      // Act
      const response = await request(app).post("/patient/invalid-id/soft-delete");

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });

    it("should exclude soft-deleted patient from regular queries", async () => {
      // Arrange
      await request(app).post(`/patient/${testPatientId}/soft-delete`);

      // Act
      const response = await request(app).get(`/patient/${testPatientId}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });
  });

  describe("POST /patient/soft-delete (batch)", () => {
    it("should soft delete multiple patients successfully", async () => {
      // Act
      const response = await request(app)
        .post("/patient/soft-delete")
        .send({ patientIds: [testPatientId, testPatientId2] });
      const responseBody: ServiceResponse<{ count: number }> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject?.count).toBe(2);
    });

    it("should handle empty array", async () => {
      // Act
      const response = await request(app).post("/patient/soft-delete").send({ patientIds: [] });
      const responseBody: ServiceResponse<{ count: number }> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.responseObject?.count).toBe(0);
    });

    it("should validate patientIds parameter", async () => {
      // Act
      const response = await request(app).post("/patient/soft-delete").send({});

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });
  });

  describe("GET /patient/deleted", () => {
    beforeEach(async () => {
      // Soft delete test patients
      await request(app).post(`/patient/${testPatientId}/soft-delete`);
      await request(app).post(`/patient/${testPatientId2}/soft-delete`);
    });

    it("should return paginated list of soft-deleted patients", async () => {
      // Act
      const response = await request(app).get("/patient/deleted");
      const responseBody: ServiceResponse<PaginatedResult<Patient>> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Deleted patients found");
      expect(responseBody.responseObject?.patients).toBeDefined();
      expect(responseBody.responseObject?.patients.length).toBeGreaterThanOrEqual(2);
      
      // Verify all returned patients have deletedAt set
      responseBody.responseObject?.patients.forEach((patient) => {
        expect(patient.deletedAt).toBeDefined();
        expect(patient.deletedAt).not.toBeNull();
      });
    });

    it("should support pagination parameters", async () => {
      // Act
      const response = await request(app).get("/patient/deleted?page=1&limit=1");
      const responseBody: ServiceResponse<PaginatedResult<Patient>> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.responseObject?.patients).toHaveLength(1);
      expect(responseBody.responseObject?.page).toBe(1);
      expect(responseBody.responseObject?.limit).toBe(1);
    });

    it("should not include non-deleted patients", async () => {
      // Act
      const response = await request(app).get("/patient/deleted");
      const responseBody: ServiceResponse<PaginatedResult<Patient>> = response.body;

      // Assert - testPatientId3 was not deleted
      const notDeletedPatient = responseBody.responseObject?.patients.find(
        (p) => p._id?.toString() === testPatientId3
      );
      expect(notDeletedPatient).toBeUndefined();
    });
  });

  describe("POST /patient/:id/restore", () => {
    beforeEach(async () => {
      // Soft delete a patient first
      await request(app).post(`/patient/${testPatientId}/soft-delete`);
    });

    it("should restore a soft-deleted patient successfully", async () => {
      // Act
      const response = await request(app).post(`/patient/${testPatientId}/restore`);
      const responseBody: ServiceResponse<Patient> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("restored successfully");
      expect(responseBody.responseObject?.deletedAt).toBeNull();
    });

    it("should make restored patient available in regular queries", async () => {
      // Arrange
      await request(app).post(`/patient/${testPatientId}/restore`);

      // Act
      const response = await request(app).get(`/patient/${testPatientId}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(response.body.responseObject).toBeDefined();
    });

    it("should return 404 for non-existent patient", async () => {
      // Act
      const response = await request(app).post("/patient/507f1f77bcf86cd799439011/restore");

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it("should handle restoring already active patient", async () => {
      // Arrange - restore once
      await request(app).post(`/patient/${testPatientId}/restore`);

      // Act - restore again
      const response = await request(app).post(`/patient/${testPatientId}/restore`);

      // Assert - should still succeed
      expect(response.statusCode).toEqual(StatusCodes.OK);
    });
  });

  describe("GET /patient with includeDeleted parameter", () => {
    beforeEach(async () => {
      await request(app).post(`/patient/${testPatientId}/soft-delete`);
    });

    it("should exclude deleted patients by default", async () => {
      // Act
      const response = await request(app).get("/patient");
      const responseBody: ServiceResponse<PaginatedResult<Patient>> = response.body;

      // Assert
      const deletedPatient = responseBody.responseObject?.patients.find(
        (p) => p._id?.toString() === testPatientId
      );
      expect(deletedPatient).toBeUndefined();
    });

    it("should include deleted patients when includeDeleted=true", async () => {
      // Arrange - Get counts
      const withoutDeleted = await request(app).get("/patient");
      const withDeleted = await request(app).get("/patient?includeDeleted=true");

      // Assert - includeDeleted should return more results
      expect(withDeleted.statusCode).toEqual(StatusCodes.OK);
      expect(withoutDeleted.statusCode).toEqual(StatusCodes.OK);
      expect(withDeleted.body.responseObject.total).toBeGreaterThan(
        withoutDeleted.body.responseObject.total
      );
    });
  });

  describe("Soft delete integration with external ID search", () => {
    beforeEach(async () => {
      await request(app).post(`/patient/${testPatientId}/soft-delete`);
    });

    it("should not return soft-deleted patients in external ID search", async () => {
      // Use the external ID from the seeded mock patient (index 2 = "q1w2e")
      const externalId = patientRepository.mockPatients[2].externalPatientId?.[0];
      
      // Act
      const response = await request(app).get(`/patient/externalId/${externalId}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it("should not return soft-deleted patients in partial search", async () => {
      // Use valid 3+ character search query from seeded mock patient (index 2 = "q1w2e")
      const searchQuery = "q1w";
      
      // Act
      const response = await request(app).get(`/patient/search/${searchQuery}`);
      const responseBody: ServiceResponse<Patient[]> = response.body;

      // Assert - soft deleted patient should not appear in search results
      // Search may return OK with empty results or 404 if no matches
      if (response.statusCode === StatusCodes.OK) {
        const foundPatient = responseBody.responseObject?.find(
          (p) => p._id?.toString() === testPatientId
        );
        expect(foundPatient).toBeUndefined();
      } else {
        // 404 is also acceptable if no results
        expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      }
    });
  });

  describe("DELETE /patient/:id (permanent delete)", () => {
    beforeEach(async () => {
      await request(app).post(`/patient/${testPatientId}/soft-delete`);
    });

    it("should permanently delete a patient", async () => {
      // Act
      const response = await request(app).delete(`/patient/${testPatientId}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);

      // Verify patient is gone from deleted list too
      const deletedListResponse = await request(app).get("/patient/deleted");
      const deletedPatient = deletedListResponse.body.responseObject?.patients.find(
        (p: Patient) => p._id?.toString() === testPatientId
      );
      expect(deletedPatient).toBeUndefined();
    });
  });
});
