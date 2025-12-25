import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { Patient } from "@/api/patient/patientModel";
import { patientRepository } from "@/api/seed/seedRouter";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import type { ObjectId } from "mongoose";

let newPatientId: string | ObjectId = "";

const newPatient = {
  externalPatientId: ["99999"],
  sex: "M",
} as Patient;

describe("Patient API Endpoints", () => {
  beforeAll(async () => {
    try {
      const res = await request(app).get("/seed/patients");
      if (res.status !== StatusCodes.OK) {
        throw new Error("Failed to insert consultation data");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Setup failed: ${error.message}`);
      } else {
        throw new Error("Setup failed: Unknown error");
      }
    }
  });

  describe("GET /patient", () => {
    it("should return a list of patients", async () => {
      // Act
      const response = await request(app).get("/patient");
      const responseBody: ServiceResponse<Patient[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Patients found");
      expect(responseBody.responseObject.length).toEqual(patientRepository.mockPatients.length);
      responseBody.responseObject.forEach((patient, index) =>
        comparePatients(patientRepository.mockPatients[index] as Patient, patient),
      );
    });
  });

  // get patient by id
  describe("GET /patient/:id", () => {
    it("should return a patient for a valid ID", async () => {
      // Arrange
      const testId = patientRepository.mockPatients[0]._id;
      const expectedPatient = patientRepository.mockPatients.find(
        (patient: Patient) => patient._id === testId,
      ) as Patient;

      // Act
      const response = await request(app).get(`/patient/${testId}`);
      const responseBody: ServiceResponse<Patient> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Patient found");
      if (!expectedPatient) throw new Error("Invalid test data: expectedPatient is undefined");
      comparePatients(expectedPatient, responseBody.responseObject);
    });

    it("should return a NOT FOUND for nonexistent ID", async () => {
      // Arrange
      const testId = "123412341234123412341234";

      // Act
      const response = await request(app).get(`/patient/${testId}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Patient not found");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return a BAD REQUEST for number instead ID", async () => {
      // Arrange
      const testId = Number.MAX_SAFE_INTEGER;

      // Act
      const response = await request(app).get(`/patient/${testId}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
      expect(Array.isArray(responseBody.responseObject)).toBeTruthy();
      expect(responseBody.responseObject.length).toBeGreaterThan(0);
    });

    it("should return a BAD REQUEST for invalid ID format", async () => {
      // Act
      const invalidInput = "abc";
      const response = await request(app).get(`/patient/${invalidInput}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
      expect(Array.isArray(responseBody.responseObject)).toBeTruthy();
      expect(responseBody.responseObject.length).toBeGreaterThan(0);
    });
  });

  // get patient by external id
  describe("GET /patient/externalId/:externalPatientId", () => {
    it("should return a patient for a valid external ID", async () => {
      // Arrange
      const testExternalId = patientRepository.mockPatients[1].externalPatientId?.[0];
      if (!testExternalId) {
        throw new Error("Test requires a mock patient with external ID");
      }
      const expectedPatient = patientRepository.mockPatients.find((patient: Patient) =>
        patient.externalPatientId?.includes(testExternalId),
      ) as Patient;

      // Act
      const response = await request(app).get(`/patient/externalId/${testExternalId}`);
      const responseBody: ServiceResponse<Patient> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Patient found");
      if (!expectedPatient) throw new Error("Invalid test data: expectedPatient is undefined");
      comparePatients(expectedPatient, responseBody.responseObject);
    });

    it("should return a NOT FOUND for nonexistent external ID", async () => {
      // Arrange
      const testExternalId = "nonexistent-external-id";

      // Act
      const response = await request(app).get(`/patient/externalId/${testExternalId}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("No patient found with the given external ID");
      expect(responseBody.responseObject).toBeNull();
    });
  });

  // create patient
  describe("POST /patient", () => {
    it("should create a patient successfully", async () => {
      // Act
      const response = await request(app).post("/patient").send(newPatient);
      const responseBody: ServiceResponse<Patient> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.CREATED);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Patient created successfully");
      expect(responseBody.responseObject).toMatchObject({
        externalPatientId: newPatient.externalPatientId,
        sex: newPatient.sex,
      });
      newPatientId = responseBody.responseObject._id as string;
    });

    it("should create a patient without external ID (GDPR compliant)", async () => {
      // Arrange
      const patientWithoutExternalId = {
        sex: "F",
      };

      // Act
      const response = await request(app).post("/patient").send(patientWithoutExternalId);
      const responseBody: ServiceResponse<Patient> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.CREATED);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Patient created successfully");
      expect(responseBody.responseObject.sex).toBe("F");
      expect(responseBody.responseObject.externalPatientId).toBeUndefined();

      // Clean up
      await request(app).delete(`/patient/${responseBody.responseObject._id}`);
    });

    it("should create a patient with minimal data (all fields optional)", async () => {
      // Arrange - since all fields are optional, we can create a patient with an empty object
      const minimalPatient = {};

      // Act
      const response = await request(app).post("/patient").send(minimalPatient);
      const responseBody: ServiceResponse<Patient> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.CREATED);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Patient created successfully");
      expect(responseBody.responseObject.externalPatientId).toBeUndefined();
      expect(responseBody.responseObject.sex).toBeUndefined();

      // Clean up
      await request(app).delete(`/patient/${responseBody.responseObject._id}`);
    });

    // clean up and delete the newly created patient
    afterAll(async () => {
      await request(app).delete(`/patient/${newPatientId}`);
    });
  });

  // update patient
  describe("PUT /patient/:id", () => {
    it("should update a patient successfully", async () => {
      // Arrange
      const testId = patientRepository.mockPatients[0]._id;
      const updatedData = { sex: "diverse" };
      // does not work otherwise because copies are shallow
      const expectedPatient = JSON.parse(JSON.stringify(patientRepository.mockPatients[0])) as Patient;
      expectedPatient.sex = "diverse";

      // Act
      const response = await request(app).put(`/patient/${testId}`).send(updatedData);
      const responseBody: ServiceResponse<Patient> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Patient updated successfully");
      comparePatients(expectedPatient, responseBody.responseObject);

      // Reset the name back to original
      await request(app).put(`/patient/${testId}`).send(patientRepository.mockPatients[0]);
    });

    // restore the original data
    afterAll(async () => {
      await request(app)
        .put(`/patient/${patientRepository.mockPatients[0]._id}`)
        .send(patientRepository.mockPatients[0]);
    });
  });

  // delete patient
  describe("DELETE /patient/:id", () => {
    // create a patient to delete
    beforeAll(async () => {
      const response = await request(app).post("/patient").send(newPatient);
      newPatientId = response.body.responseObject._id;
    });

    it("should delete a patient successfully", async () => {
      // Arrange
      const testId = newPatientId;

      // Act
      const response = await request(app).delete(`/patient/${testId}`);
      const responseBody: ServiceResponse<Patient> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Patient deleted successfully");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return not found if patient does not exist", async () => {
      // Arrange
      const testId = "nonexistent-id";

      // Act
      const response = await request(app).delete(`/patient/${testId}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
      expect(Array.isArray(responseBody.responseObject)).toBeTruthy();
      expect(responseBody.responseObject.length).toBeGreaterThan(0);
    });
  });
});

function comparePatients(mockPatient: Patient, responsePatient: Patient) {
  if (!mockPatient || !responsePatient) {
    throw new Error("Invalid test data: mockPatient or responsePatient is undefined");
  }

  expect(responsePatient._id).toEqual(mockPatient._id);
  expect(responsePatient.externalPatientId).toEqual(mockPatient.externalPatientId);
  expect(responsePatient.sex).toEqual(mockPatient.sex);
}
