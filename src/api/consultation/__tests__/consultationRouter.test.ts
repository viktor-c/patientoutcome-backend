import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { codeRepository } from "@/api/code/codeRepository";
import type { Consultation } from "@/api/consultation/consultationModel";
import { consultationRepository } from "@/api/consultation/consultationRepository";
import { patientCaseRepository } from "@/api/seed/seedRouter";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { consultationService } from "../consultationService";

vi.mock("@/api/consultation/consultationService");
vi.mock("@/api/code/codeRepository");

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

  describe("Consultation Router", () => {
    describe("createConsultation", () => {
      it("should create a consultation and activate the code if valid", async () => {
        const mockCode = { internalCode: "123", activatedOn: null };
        const mockConsultation = { id: "1", patientId: "p1", caseId: "c1" };

        vi.spyOn(codeRepository, "findByExternalCode").mockResolvedValue(mockCode);
        vi.spyOn(codeRepository, "activateCode").mockResolvedValue(mockCode);
        vi.spyOn(consultationRepository, "createConsultation").mockResolvedValue(mockConsultation);

        const result = await consultationService.createConsultation("p1", "c1", { formAccessCode: "123" });

        expect(result).toEqual(ServiceResponse.created("Consultation created successfully", mockConsultation));
        expect(codeRepository.activateCode).toHaveBeenCalledWith("123", mockConsultation.id);
      });

      it("should fail to create a consultation if the code is already active", async () => {
        const mockCode = { internalCode: "123", activatedOn: new Date() };

        vi.spyOn(codeRepository, "findByExternalCode").mockResolvedValue(mockCode);

        const result = await consultationService.createConsultation("p1", "c1", { formAccessCode: "123" });

        expect(result).toEqual(ServiceResponse.failure("Code is already active", null, StatusCodes.CONFLICT));
      });

      it("should deactivate the code if an error occurs during consultation creation", async () => {
        const mockCode = { internalCode: "123", activatedOn: null };

        vi.spyOn(codeRepository, "findByExternalCode").mockResolvedValue(mockCode);
        vi.spyOn(codeRepository, "activateCode").mockResolvedValue(mockCode);
        vi.spyOn(consultationRepository, "createConsultation").mockRejectedValue(new Error("DB Error"));
        vi.spyOn(codeRepository, "deactivateCode").mockResolvedValue(mockCode);

        const result = await consultationService.createConsultation("p1", "c1", { formAccessCode: "123" });

        expect(result).toEqual(
          ServiceResponse.failure(
            "An error occurred while creating consultation.",
            null,
            StatusCodes.INTERNAL_SERVER_ERROR,
          ),
        );
        expect(codeRepository.deactivateCode).toHaveBeenCalledWith("123");
      });
    });

    describe("updateConsultation", () => {
      it("should update a consultation and activate a new code if provided", async () => {
        const mockCode = { internalCode: "123", activatedOn: null };
        const mockOriginalConsultation = { id: "1", formAccessCode: "456" };
        const mockUpdatedConsultation = { id: "1", formAccessCode: "123" };

        vi.spyOn(consultationRepository, "getConsultationById").mockResolvedValue(mockOriginalConsultation);
        vi.spyOn(codeRepository, "findByExternalCode").mockResolvedValue(mockCode);
        vi.spyOn(codeRepository, "activateCode").mockResolvedValue(mockCode);
        vi.spyOn(consultationRepository, "updateConsultation").mockResolvedValue(mockUpdatedConsultation);

        const result = await consultationService.updateConsultation("1", { formAccessCode: "123" });

        expect(result).toEqual(ServiceResponse.success("Consultation updated successfully", mockUpdatedConsultation));
        expect(codeRepository.activateCode).toHaveBeenCalledWith("123", "1");
      });

      it("should deactivate the original code if no new code is provided", async () => {
        const mockOriginalConsultation = { id: "1", formAccessCode: "456" };
        const mockUpdatedConsultation = { id: "1", formAccessCode: null };

        vi.spyOn(consultationRepository, "getConsultationById").mockResolvedValue(mockOriginalConsultation);
        vi.spyOn(codeRepository, "deactivateCode").mockResolvedValue(mockOriginalConsultation);
        vi.spyOn(consultationRepository, "updateConsultation").mockResolvedValue(mockUpdatedConsultation);

        const result = await consultationService.updateConsultation("1", { formAccessCode: null });

        expect(result).toEqual(ServiceResponse.success("Consultation updated successfully", mockUpdatedConsultation));
        expect(codeRepository.deactivateCode).toHaveBeenCalledWith("456");
      });

      it("should fail to update a consultation if the new code is already active", async () => {
        const mockCode = { internalCode: "123", activatedOn: new Date() };
        const mockOriginalConsultation = { id: "1", formAccessCode: "456" };

        vi.spyOn(consultationRepository, "getConsultationById").mockResolvedValue(mockOriginalConsultation);
        vi.spyOn(codeRepository, "findByExternalCode").mockResolvedValue(mockCode);

        const result = await consultationService.updateConsultation("1", { formAccessCode: "123" });

        expect(result).toEqual(ServiceResponse.failure("Code is already active", null, StatusCodes.CONFLICT));
      });
    });
  });
});
