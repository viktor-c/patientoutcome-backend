import { patientCaseRepository } from "@/api/seed/seedRouter";
import { app } from "@/server"; // Assuming you have an Express app instance
import mongoose from "mongoose";
import request from "supertest";
import { type PatientCase, PatientCaseSchema } from "../patientCaseModel";

describe("PatientCase API", () => {
  // seed the mongodb table "patientcases"; if it fails, then fail all tests
  beforeAll(async () => {
    try {
      const res = await request(app).get("/seed/patientCase");
      if (res.status !== 200) {
        throw new Error("Failed to insert mock data");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Setup failed: ${error.message}`);
      } else {
        throw new Error("Setup failed: Unknown error");
      }
    }
  });

  it("should get all cases", async () => {
    const patientId = patientCaseRepository.mockCases[0].patient;
    const res = await request(app).get(`/patient/${patientId}/cases`);
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toBeInstanceOf(Array);
    expect(res.body.responseObject).length(1);
    expect(PatientCaseSchema.safeParse(res.body.responseObject[0]).success).toBeTruthy();
    expect(res.body.responseObject[0]._id).toEqual(patientCaseRepository.mockCases[0]._id);
    //TODO add indepth compare of objects
  });

  it("should get a case by ID", async () => {
    const patientId = patientCaseRepository.mockCases[0].patient;
    const caseId = patientCaseRepository.mockCases[0]._id;
    const res = await request(app).get(`/patient/${patientId}/cases/${caseId}`);
    expect(res.status).toBe(200);
    comparePatientCases(res.body.responseObject, patientCaseRepository.mockCases[0] as unknown as PatientCase);
  });

  it("should create and delete a case", async () => {
    const newCase = {
      patient: new mongoose.Types.ObjectId(patientCaseRepository.mockCases[0].patient),
      MainDiagnosis: ["Diagnosis"],
      StudyDiagnosis: ["Hallux valgus"],
      MainDiagnosisICD10: ["A123"],
      StudyDiagnosisICD10: ["B456"],
      surgeries: [
        {
          externalId: "12345",
          diagnosis: ["Diagnosis"],
          surgeryDate: new Date().toISOString(),
          side: "none",
          roentgenDosis: 10,
          roentgenTime: "00:00:10.000",
          anaesthesiaType: { id: 1, type: "block" },
          surgeons: [new mongoose.Types.ObjectId("676336bea497301f6eff8c91")],
        },
      ],
      medicalHistory: "History",
      notes: [
        {
          dateCreated: new Date(),
          createdBy: new mongoose.Types.ObjectId("676336bea497301f6eff8c91"),
          text: "Note text",
        },
      ],
      supervisors: ["676336bea497301f6eff8c91"],
    };
    const patientId = patientCaseRepository.mockCases[0].patient;
    const createRes = await request(app).post(`/patient/${patientId}/cases`).send(newCase);
    expect(createRes.status).toBe(201);
    expect(createRes.body.responseObject).toHaveProperty("_id");
    expect(createRes.body.responseObject.patient).toEqual(patientId);

    const caseId = createRes.body.responseObject._id;
    const deleteRes = await request(app).delete(`/patient/${patientId}/cases/${caseId}`);
    expect(deleteRes.status).toBe(204);
    expect(deleteRes.body.responseObject).toBeUndefined();
  });

  it("should update a case", async () => {
    const patientId = patientCaseRepository.mockCases[0].patient;
    const caseId = patientCaseRepository.mockCases[0]._id;
    const updateData = { MainDiagnosis: ["Updated Diagnosis"] };
    const res = await request(app).put(`/patient/${patientId}/cases/${caseId}`).send(updateData);
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toHaveProperty("MainDiagnosis", ["Updated Diagnosis"]);
  });

  it("should get all notes for a case", async () => {
    const patientId = patientCaseRepository.mockCases[0].patient;
    const caseId = patientCaseRepository.mockCases[0]._id;
    const res = await request(app).get(`/patient/${patientId}/cases/${caseId}/notes`);
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toBeInstanceOf(Array);
    expect(compareObjects(res.body.responseObject[0], patientCaseRepository.mockCases[0].notes[0])).toBeTruthy();
  });

  it("should post and delete a note for a case", async () => {
    const patientId = patientCaseRepository.mockCases[0].patient;
    const caseId = patientCaseRepository.mockCases[0]._id;
    const newNote = {
      dateCreated: new Date(),
      createdBy: "676336bea497301f6eff8c90",
      text: "New note text",
    };

    const postRes = await request(app).post(`/patient/${patientId}/cases/${caseId}/notes`).send(newNote);
    expect(postRes.status).toBe(201);
    expect(postRes.body.responseObject.notes[1]).toHaveProperty("text", "New note text");

    const noteId = postRes.body.responseObject._id;
    const deleteRes = await request(app).delete(`/patient/${patientId}/cases/${caseId}/notes/${noteId}`);
    expect(deleteRes.status).toBe(204);
  });

  function comparePatientCases(case1: PatientCase, case2: PatientCase): boolean {
    return JSON.stringify(case1) === JSON.stringify(case2);
  }

  function compareObjects(object1: any, object2: any): boolean {
    try {
      return JSON.stringify(object1) === JSON.stringify(object2);
    } catch (error) {
      return false;
    }
  }

  it("should compare two patient cases", () => {
    const case1 = patientCaseRepository.mockCases[0] as unknown as PatientCase;
    const case2 = { ...patientCaseRepository.mockCases[0] } as unknown as PatientCase;
    expect(comparePatientCases(case1, case2)).toBe(true);

    const case3 = patientCaseRepository.mockCases[1] as unknown as PatientCase;
    expect(comparePatientCases(case1, case3)).toBe(false);
  });
});
