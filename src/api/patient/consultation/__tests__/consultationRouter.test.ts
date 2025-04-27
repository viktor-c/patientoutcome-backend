import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import request from "supertest";

import { consultationRepository, patientCaseRepository } from "@/api/seed/seedRouter";
import type { PatientCaseConsultation } from "../consultationModel";
import { consultationService } from "../consultationService";

describe("Patient Case Consultation API", () => {
  beforeAll(async () => {
    try {
      const res = await request(app).get("/seed/consultation");
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

  it("should get a consultation by ID", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const consultationId = consultationRepository.mockConsultations[0]._id;

    const response = await request(app).get(`/patient/${patientId}/cases/${caseId}/consultations/${consultationId}`);
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.message).toBe("Consultation found");
    expect(
      consultationService.compareConsultations(
        response.body.responseObject,
        consultationRepository.mockConsultations[0],
      ),
    ).toBe(true);
  });

  it("should get all consultations", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const response = await request(app).get(`/patient/${patientId}/cases/${caseId}/consultations`);
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.message).toBe("Consultations retrieved successfully");
    expect(Array.isArray(response.body.responseObject)).toBe(true);

    const areEqual = response.body.responseObject.every((consultation: PatientCaseConsultation, index: number) =>
      consultationService.compareConsultations(consultation, consultationRepository.mockConsultations[index]),
    );
    expect(areEqual).toBe(true);
  });

  it("should create and delete a consultation", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    // Create a new consultation
    const createResponse = await request(app)
      .post(`/patient/${patientId}/cases/${caseId}/consultations/`)
      .send({
        patientCaseId: caseId,
        dateAndTime: new Date().toISOString(),
        reasonForConsultation: ["planned"],
        notes: [],
        proms: [],
        images: [],
        visitedBy: [new mongoose.Types.ObjectId()],
      });
    expect(createResponse.status).toBe(StatusCodes.CREATED);
    expect(createResponse.body.message).toBe("Consultation created successfully");

    const consultationId = createResponse.body.responseObject._id;

    // Delete the created consultation
    const deleteResponse = await request(app).delete(
      `/patient/${patientId}/cases/${caseId}/consultations/${consultationId}`,
    );
    expect(deleteResponse.status).toBe(StatusCodes.NO_CONTENT);
  });

  it("should update a consultation by ID", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const consultationId = consultationRepository.mockConsultations[0]._id;
    const response = await request(app)
      .put(`/patient/${patientId}/cases/${caseId}/consultations/${consultationId}`)
      .send({ reasonForConsultation: ["unplanned"] });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Consultation updated successfully");
    expect(response.body.responseObject.reasonForConsultation).toEqual(["unplanned"]);
  });

  it("should return 404 for an invalid consultation ID", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const invalidConsultationId = new mongoose.Types.ObjectId().toString();

    const response = await request(app).get(
      `/patient/${patientId}/cases/${caseId}/consultations/${invalidConsultationId}`,
    );
    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.message).toBe("Consultation not found");
  });
});
