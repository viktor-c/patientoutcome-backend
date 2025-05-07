import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import request from "supertest";

import { consultationRepository, patientCaseRepository } from "@/api/seed/seedRouter";
import type { Consultation } from "../consultationModel";
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

    const response = await request(app).get(`/patient/${patientId}/case/${caseId}/consultation/${consultationId}`);
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
    const response = await request(app).get(`/patient/${patientId}/case/${caseId}/consultations`);
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.message).toBe("Consultations retrieved successfully");
    expect(Array.isArray(response.body.responseObject)).toBe(true);

    const areEqual = response.body.responseObject.every((consultation: Consultation, index: number) =>
      consultationService.compareConsultations(consultation, consultationRepository.mockConsultations[index]),
    );
    expect(areEqual).toBe(true);
  });

  it("should create and delete a consultation", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const newConsultation = {
      ...consultationRepository.mockConsultations[0],
      formTemplates: ["67b4e612d0feb4ad99ae2e83"],
    } as Consultation;
    newConsultation._id = undefined; // Reset _id to undefined to create a new consultation
    // Create a new consultation
    const createResponse = await request(app)
      .post(`/patient/${patientId}/case/${caseId}/consultation/`)
      .send(newConsultation);

    expect(createResponse.status).toBe(StatusCodes.CREATED);
    expect(createResponse.body.message).toBe("Consultation created successfully");
    expect(createResponse.body.responseObject).toBeDefined();
    expect(createResponse.body.responseObject._id).toBeDefined();
    //expect(createResponse.body.responseObject._id).toEqual(newConsultation._id);

    // Delete the created consultation
    const deleteResponse = await request(app).delete(
      `/patient/${patientId}/case/${caseId}/consultation/${createResponse.body.responseObject._id}`,
    );
    expect(deleteResponse.status).toBe(StatusCodes.NO_CONTENT);
  });

  it("should update a consultation by ID", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const consultationId = consultationRepository.mockConsultations[0]._id;
    const response = await request(app)
      .put(`/patient/${patientId}/case/${caseId}/consultation/${consultationId}`)
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
      `/patient/${patientId}/case/${caseId}/consultation/${invalidConsultationId}`,
    );
    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.message).toBe("Consultation not found");
  });
});
