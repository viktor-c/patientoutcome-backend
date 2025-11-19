import { StatusCodes } from "http-status-codes";
import request from "supertest";

import { clinicalStudyRepository } from "@/api/seed/seedRouter";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import type { ClinicalStudy } from "../clinicalStudyModel";

describe("ClinicalStudy API Endpoints", () => {
  beforeAll(async () => {
    try {
      const res = await request(app).get("/seed/clinicalStudy");
      if (res.status !== 200) {
        throw new Error("Failed to seed clinical studies");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Setup clinical study seed has failed ${error.message}`);
      } else {
        console.error("Setup clinical study seed has failed");
        throw new Error("Setup clinical study seed has failed");
      }
    }
  });

  const mockClinicalStudies = clinicalStudyRepository.mockClinicalStudies;

  describe("GET /clinicalstudy", () => {
    it("should return a list of clinical studies", async () => {
      // Act
      const response = await request(app).get("/clinicalstudy");
      const responseBody: ServiceResponse<ClinicalStudy[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Clinical Studies found");
      expect(responseBody.responseObject.length).toEqual(mockClinicalStudies.length);
      responseBody.responseObject.forEach((clinicalStudy, index) =>
        compareClinicalStudies(mockClinicalStudies[index] as ClinicalStudy, clinicalStudy),
      );
    });
  });

  describe("GET /clinicalstudy/:studyId", () => {
    it("should return the clinical study by id", async () => {
      const studyId = mockClinicalStudies[0]._id; // Replace with a valid user ID
      const expectedStudy = mockClinicalStudies.find((study: ClinicalStudy) => study._id === studyId) as ClinicalStudy;

      // Act
      const response = await request(app).get(`/clinicalstudy/${studyId}`);
      const responseBody: ServiceResponse<ClinicalStudy> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Clinical Study found");
      if (!expectedStudy) throw new Error("Invalid test data: expectedStudy is undefined");
      compareClinicalStudies(expectedStudy, responseBody.responseObject);
      // Add more assertions based on your mock data
    });
  });

  describe("GET /clinicalstudy/supervisor/:supervisorId", () => {
    it("should return a list of clinical studies for a given supervisor", async () => {
      const supervisorId = "676336bea497301f6eff8c8f";

      // Act
      const response = await request(app).get(`/clinicalstudy/supervisor/${supervisorId}`);
      const responseBody: ServiceResponse<ClinicalStudy[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Clinical Studies found for supervisor");
      // Add more assertions based on your mock data
    });
    it("should return not found if the supervisorId is not found", async () => {
      const supervisorId = "123456789012345678910123";

      // Act
      const response = await request(app).get(`/clinicalstudy/supervisor/${supervisorId}`);
      const responseBody: ServiceResponse<ClinicalStudy[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("No Clinical Studies found for supervisor");
    });
  });

  describe("GET /clinicalstudy/studynurse/:studyNurseId", () => {
    it("should return a list of clinical studies for a given study nurse", async () => {
      const studyNurseId = "676336bea497301f6eff8c8e";

      // Act
      const response = await request(app).get(`/clinicalstudy/studynurse/${studyNurseId}`);
      const responseBody: ServiceResponse<ClinicalStudy[]> = response.body;

      // Assert
      expect(responseBody.message).toContain("Clinical Studies found for study nurse");
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.length).toBe(2);

      expect(responseBody.responseObject[0].studyNurses).toContain(studyNurseId);
      expect(responseBody.responseObject[1].studyNurses).toContain(studyNurseId);
    });

    it("should return 404 because the id cannot be found", async () => {
      const studyNurseId = "123456789012345678910123";

      // Act
      const response = await request(app).get(`/clinicalstudy/studynurse/${studyNurseId}`);
      const responseBody: ServiceResponse<ClinicalStudy[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("No Clinical Studies found for study nurse");
      // Add more assertions based on your mock data
    });
  });

  describe("GET /clinicalstudy/diagnosis/:diagnosis", () => {
    it("should return a list of clinical studies for a given diagnosis", async () => {
      const diagnosis = "A00"; // Replace with a valid diagnosis code

      // Act
      const response = await request(app).get(`/clinicalstudy/diagnosis/${diagnosis}`);
      const responseBody: ServiceResponse<ClinicalStudy[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Clinical Studies found for diagnosis");
      // Add more assertions based on your mock data
    });
  });

  // Add more tests for other endpoints
});

function compareClinicalStudies(mockClinicalStudy: ClinicalStudy, responseClinicalStudy: ClinicalStudy) {
  if (!mockClinicalStudy || !responseClinicalStudy) {
    throw new Error("Invalid test data: mockClinicalStudy or responseClinicalStudy is undefined");
  }

  expect(responseClinicalStudy._id).toEqual(mockClinicalStudy._id);
  expect(responseClinicalStudy.name).toEqual(mockClinicalStudy.name);
  expect(responseClinicalStudy.description).toEqual(mockClinicalStudy.description);
  expect(new Date(responseClinicalStudy.beginDate)).toEqual(mockClinicalStudy.beginDate);
  expect(responseClinicalStudy.studyType).toEqual(mockClinicalStudy.studyType);
  expect(responseClinicalStudy.studyNurses.length).toEqual(mockClinicalStudy.studyNurses.length);
  expect(responseClinicalStudy.supervisors.length).toEqual(mockClinicalStudy.supervisors.length);
}
