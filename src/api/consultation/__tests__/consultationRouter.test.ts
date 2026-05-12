import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import type { Code } from "@/api/code/codeModel";
import type { Consultation } from "@/api/consultation/consultationModel";
import { consultationRepository } from "@/api/consultation/consultationRepository";
import { codeRepository, patientCaseRepository, patientRepository, userRepository } from "@/api/seed/seedRouter";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { codeModel } from "@/api/code/codeModel";
import { consultationService } from "../consultationService";

describe("Patient Case Consultation API", () => {
  const mockUser = userRepository.mockUsers[0];
  let agent: any;

  beforeAll(async () => {
    //login first user
    agent = request.agent(app);

    try {
      // Seed dependencies in correct order: templates, patient cases, forms, codes, then consultations
      // Some data might already be seeded by other tests, so attempt all but only fail on consultation seeding
      await agent.get("/seed/formTemplate").catch(() => {}); // Templates may already exist
      await agent.get("/seed/patientCase").catch(() => {}); // Patient cases may already exist
      await agent.get("/seed/form").catch(() => {}); // Forms may already exist
      await agent.get("/seed/code").catch(() => {}); // Codes may already exist

      // Now seed consultations - this is the critical one for this test
      const res = await agent.get("/seed/consultation");
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

    // Login to get session - agent automatically handles session cookies
    const loginRes = await agent.post("/user/login").send({
      username: mockUser.username,
      password: "password123#124", // plaintext for first user
    });
    expect(loginRes.status).toBe(StatusCodes.OK);
  });

  it("should get a consultation by ID", async () => {
    const consultationId = consultationRepository.mockConsultations[0]._id;

    // Agent automatically uses session cookies, no need to set manually
    const response = await agent.get(`/consultation/${consultationId}`);

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
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const response = await agent.get(`/consultations/case/${caseId}`);
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.message).toBe("Consultations retrieved successfully");
    expect(Array.isArray(response.body.responseObject)).toBe(true);

    const mockConsultationsForCase = consultationRepository.mockConsultations.filter(
      (c) => c.patientCaseId?.toString() === caseId.toString(),
    );

    const areEqual = response.body.responseObject.every((consultation: Consultation) => {
      const mockConsultation = mockConsultationsForCase.find(
        (m) => m._id?.toString() === consultation._id?.toString(),
      );
      return mockConsultation ? consultationService.compareConsultations(consultation, mockConsultation) : false;
    });
    expect(areEqual).toBe(true);
  });

  it("should create and delete a consultation", async () => {
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const newConsultation = {
      ...consultationRepository.mockConsultations[0],
      formTemplates: ["67b4e612d0feb4ad99ae2e83"],
    } as Consultation;
    newConsultation._id = undefined; // Reset _id to undefined to create a new consultation

    // create a new form access code
    const createCodeResponse = await agent.post("/form-access-code/addCodes/1");
    expect(createCodeResponse.status).toBe(StatusCodes.CREATED);
    expect(createCodeResponse.body.message).toBe("Codes created successfully");
    expect(createCodeResponse.body.responseObject).toBeDefined();

    // Assign the created code string to the new consultation
    const newCode: Code = createCodeResponse.body.responseObject;
    newConsultation.formAccessCode = newCode.code;

    // Create a new consultation
    const createResponse = await agent.post(`/consultation/case/${caseId}`).send(newConsultation);

    expect(createResponse.status).toBe(StatusCodes.CREATED);
    expect(createResponse.body.message).toBe("Consultation created successfully");
    expect(createResponse.body.responseObject).toBeDefined();
    expect(createResponse.body.responseObject._id).toBeDefined();
    //expect(createResponse.body.responseObject._id).toEqual(newConsultation._id);

    // Delete the created consultation
    const deleteResponse = await agent.delete(`/consultation/${createResponse.body.responseObject._id}`);
    expect(deleteResponse.status).toBe(StatusCodes.NO_CONTENT);

    // also check the the form access code is deleted
    const codeResponse = await agent.get(`/code/${newCode._id}`);
    expect(codeResponse.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("should update a consultation by ID", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const consultationId = consultationRepository.mockConsultations[0]._id;
    const originalReasonForConsultation = consultationRepository.mockConsultations[0].reasonForConsultation;
    const response = await agent.put(`/consultation/${consultationId}`).send({ reasonForConsultation: ["unplanned"] });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Consultation updated successfully");
    expect(response.body.responseObject.reasonForConsultation).toEqual(["unplanned"]);

    // update back to original reason for consultation
    // This is to ensure the test is idempotent and can run multiple times without issues
    const response2 = await agent
      .put(`/consultation/${consultationId}`)
      .send({ reasonForConsultation: originalReasonForConsultation });
    expect(response2.status).toBe(200);
    expect(response2.body.message).toBe("Consultation updated successfully");
    expect(response2.body.responseObject.reasonForConsultation).toEqual(originalReasonForConsultation);
  });

  it("should return 404 for an invalid consultation ID", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const invalidConsultationId = new mongoose.Types.ObjectId().toString();

    const response = await agent.get(`/consultation/${invalidConsultationId}`);
    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.message).toBe("Consultation not found");
  });

  it("should keep consultation access active based on persisted consultation window when department defaults change", async () => {
    const caseId = patientCaseRepository.mockPatientCases[0]._id?.toString() as string;
    const departmentId = patientRepository.mockPatients[0]?.departments?.[0]?.toString();
    expect(caseId).toBeTruthy();
    expect(departmentId).toBeTruthy();

    const codeResponse = await agent.post("/form-access-code/addCodes/1");
    expect(codeResponse.status).toBe(StatusCodes.CREATED);
    const externalCode = codeResponse.body.responseObject[0]?.code as string;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const createResponse = await agent.post(`/consultation/case/${caseId}`).send({
      patientCaseId: caseId,
      dateAndTime: yesterday.toISOString(),
      reasonForConsultation: ["planned"],
      notes: [],
      images: [],
      visitedBy: [],
      formTemplates: ["67b4e612d0feb4ad99ae2e83"],
      formAccessCode: externalCode,
      consultationAccessDaysBefore: 0,
      consultationAccessDaysAfter: 1,
    });

    expect(createResponse.status).toBe(StatusCodes.CREATED);

    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent.post("/user/login").send({
      username: "ewilson",
      password: "password123#124",
    });
    expect(adminLogin.status).toBe(StatusCodes.OK);

    const updateDeptResponse = await adminAgent
      .patch(`/userDepartment/${departmentId}/consultation-access-window`)
      .send({ consultationAccessDaysBefore: 0, consultationAccessDaysAfter: 0 });
    expect(updateDeptResponse.status).toBe(StatusCodes.OK);

    const consultationByCode = await agent.get(`/consultation/code/${externalCode}`);
    expect(consultationByCode.status).toBe(StatusCodes.OK);
    expect(consultationByCode.body.responseObject?.consultationAccessWindow?.isActive).toBeTruthy();

    await agent.delete(`/consultation/${createResponse.body.responseObject._id}`);
  });

  it("should normalize blueprint placeholder dateAndTime=0 to current time", async () => {
    const caseId = patientCaseRepository.mockPatientCases[0]._id;

    const beforeCreation = new Date();
    const createResponse = await agent.post(`/consultation/case/${caseId}`).send({
      patientCaseId: caseId,
      dateAndTime: 0, // Blueprint placeholder for "now"
      reasonForConsultation: ["planned"],
      notes: [],
      images: [],
      visitedBy: [],
      formTemplates: [],
    });
    const afterCreation = new Date();

    expect(createResponse.status).toBe(StatusCodes.CREATED);
    expect(createResponse.body.responseObject).toBeDefined();
    expect(createResponse.body.responseObject._id).toBeDefined();

    const consultationDateAndTime = new Date(createResponse.body.responseObject.dateAndTime).getTime();
    const beforeMs = beforeCreation.getTime();
    const afterMs = afterCreation.getTime();

    // Verify that dateAndTime was set to a time between before and after creation
    expect(consultationDateAndTime).toBeGreaterThanOrEqual(beforeMs);
    expect(consultationDateAndTime).toBeLessThanOrEqual(afterMs);

    // Cleanup
    await agent.delete(`/consultation/${createResponse.body.responseObject._id}`);
  });

  it("should create and activate a new form access code when formAccessCode='new-access-code'", async () => {
    const caseId = patientCaseRepository.mockPatientCases[0]._id;

    // First, ensure we have at least one available code
    const codeResponse = await agent.post("/form-access-code/addCodes/1");
    expect(codeResponse.status).toBe(StatusCodes.CREATED);

    const createResponse = await agent.post(`/consultation/case/${caseId}`).send({
      patientCaseId: caseId,
      dateAndTime: new Date().toISOString(),
      reasonForConsultation: ["planned"],
      notes: [],
      images: [],
      visitedBy: [],
      formTemplates: [],
      formAccessCode: "new-access-code", // Blueprint placeholder for new code
    });

    if (createResponse.status !== StatusCodes.CREATED) {
      console.error("Create consultation failed:", createResponse.body);
    }

    expect(createResponse.status).toBe(StatusCodes.CREATED);
    expect(createResponse.body.responseObject).toBeDefined();
    expect(createResponse.body.responseObject._id).toBeDefined();

    const consultationId = createResponse.body.responseObject._id;
    const formAccessCodeId = createResponse.body.responseObject.formAccessCode;

    // Verify code exists and is linked to this consultation
    expect(formAccessCodeId).toBeDefined();

    const consultationFetch = await agent.get(`/consultation/${consultationId}`);
    expect(consultationFetch.status).toBe(StatusCodes.OK);
    expect(consultationFetch.body.responseObject.formAccessCode).toBeDefined();

    // Cleanup
    await agent.delete(`/consultation/${consultationId}`);
  });

  it("should set form-access-code activation start to consultation access window start for far-future consultations", async () => {
    const caseId = patientCaseRepository.mockPatientCases[0]._id;

    const consultationDate = new Date();
    consultationDate.setFullYear(consultationDate.getFullYear() + 1);

    const createResponse = await agent.post(`/consultation/case/${caseId}`).send({
      patientCaseId: caseId,
      dateAndTime: consultationDate.toISOString(),
      reasonForConsultation: ["planned"],
      notes: [],
      images: [],
      visitedBy: [],
      formTemplates: [],
      formAccessCode: "new-access-code",
    });

    expect(createResponse.status).toBe(StatusCodes.CREATED);
    const consultationId = createResponse.body.responseObject._id;

    const consultationFetch = await agent.get(`/consultation/${consultationId}`);
    expect(consultationFetch.status).toBe(StatusCodes.OK);
    const activeFrom = consultationFetch.body.responseObject.consultationAccessWindow?.activeFrom;
    const activeUntil = consultationFetch.body.responseObject.consultationAccessWindow?.activeUntil;
    expect(activeFrom).toBeDefined();
    expect(activeUntil).toBeDefined();
    expect(new Date(activeFrom).getTime()).toBeGreaterThan(Date.now());

    const codeDocument = await codeModel.findOne({ consultationId }).lean();
    expect(codeDocument).toBeDefined();
    expect(new Date(codeDocument?.activatedOn as string | Date).toISOString()).toBe(
      new Date(activeFrom).toISOString(),
    );
    expect(new Date(codeDocument?.expiresOn as string | Date).toISOString()).toBe(
      new Date(activeUntil).toISOString(),
    );

    // Before activation start, validation must reject external access.
    const codeValidationResponse = await agent.get(`/form-access-code/validate/${codeDocument?.code}`);
    expect(codeValidationResponse.status).toBe(StatusCodes.BAD_REQUEST);

    await agent.delete(`/consultation/${consultationId}`);
  });
});
