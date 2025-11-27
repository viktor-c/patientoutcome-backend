import { patientCaseRepository } from "@/api/seed/seedRouter";
import { userRepository } from "@/api/seed/seedRouter";
import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { type PatientCase, PatientCaseSchema } from "../patientCaseModel";

describe("PatientCase API", () => {
  const mockUser = userRepository.mockUsers[0];
  let agent: any;

  // seed the mongodb table "patientcases"; if it fails, then fail all tests
  beforeAll(async () => {
    try {
      const res = await request(app).get("/seed/patientCase");
      if (res.status !== 200) {
        throw new Error("Failed to insert mock data");
      }

      // Login first user to get session - agent automatically handles session cookies
      agent = request.agent(app);
      const loginRes = await agent.post("/user/login").send({
        username: mockUser.username,
        password: "password123#124", // plaintext for first user
      });
      if (loginRes.status !== StatusCodes.OK) {
        throw new Error("Failed to login user");
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
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const res = await request(app).get(`/patient/${patientId}/cases`);
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toBeInstanceOf(Array);
    expect(res.body.responseObject).length(1);

    // Check that the response has the expected structure with populated surgeries
    const patientCase = res.body.responseObject[0];
    expect(patientCase._id).toEqual(patientCaseRepository.mockPatientCases[0]._id);
    expect(patientCase.surgeries).toBeInstanceOf(Array);

    // If there are surgeries, check that they are populated as objects, not just IDs
    if (patientCase.surgeries.length > 0) {
      expect(patientCase.surgeries[0]).toBeTypeOf("object");
      expect(patientCase.surgeries[0]).toHaveProperty("_id");
      expect(patientCase.surgeries[0]).toHaveProperty("surgeryDate");
    }
    //TODO add indepth compare of objects
  });

  it("should return empty array when patient has no cases", async () => {
    // Use a patient ID that exists but has no cases (from mock patients without cases)
    const patientIdWithNoCases = "6771d9d410ede2552b7bba42"; // Patient with externalPatientId "q1w2e" has no cases
    const res = await request(app).get(`/patient/${patientIdWithNoCases}/cases`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.responseObject).toBeInstanceOf(Array);
    expect(res.body.responseObject).toHaveLength(0);
  });

  it("should get a case by ID", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const res = await request(app).get(`/patient/${patientId}/case/${caseId}`);
    expect(res.status).toBe(200);
    comparePatientCases(res.body.responseObject, patientCaseRepository.mockPatientCases[0] as unknown as PatientCase);
  });

  it("should create and delete a case", async () => {
    const newCase = {
      _id: "677da5efcb4569ad1c655190",
      patient: "6771d9d410ede2552b7bba41",
      MainDiagnosis: ["M24.1", "M71.0"],
      StudyDiagnosis: ["Hallux valgus"],
      MainDiagnosisICD10: ["M20.5"],
      StudyDiagnosisICD10: ["M20.1"],
      surgeries: [],
      supervisors: ["676336bea497301f6eff8c91"],
      notes: [
        {
          _id: "680e82ae009afe565f47e432",
          dateCreated: "2025-04-27T19:17:02.977Z",
          createdBy: "676336bea497301f6eff8c90",
          note: "Rem dignissimos quisquam impedit ut nulla. Id dignissimos rem. Dicta in perferendis neque ut ea numquam dolore minus nemo.",
        },
      ],
      medicalHistory:
        "Officiis amet repudiandae quidem pariatur quia ipsam praesentium aut. Rerum repudiandae libero rerum culpa dolorum. Reprehenderit eum laudantium dolorum officia nihil et architecto.",
      __v: 0,
    };

    const patientId = newCase.patient;
    const createRes = await agent.post(`/patient/${patientId}/case`).send(newCase);
    expect(createRes.status).toBe(201);
    expect(createRes.body.responseObject).toHaveProperty("_id");
    expect(createRes.body.responseObject.patient).toEqual(patientId);

    const caseId = createRes.body.responseObject._id;
    const deleteRes = await agent.delete(`/patient/${patientId}/case/${caseId}`);
    expect(deleteRes.status).toBe(204);
    expect(deleteRes.body.responseObject).toBeUndefined();
  });

  it("should update a case", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const updateData = { mainDiagnosis: ["Updated Diagnosis"] };
    const res = await request(app).put(`/patient/${patientId}/case/${caseId}`).send(updateData);
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toHaveProperty("mainDiagnosis", ["Updated Diagnosis"]);
  });

  it("should get all notes for a case", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const notes = patientCaseRepository.mockPatientCases[0].notes;
    const res = await request(app).get(`/patient/${patientId}/case/${caseId}/notes/`);
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toBeInstanceOf(Array);
    expect(compareObjects(res.body.responseObject[0], notes[0])).toBeTruthy();
  });

  it("should post and delete a note for a case", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const newNote = {
      dateCreated: new Date(),
      createdBy: "676336bea497301f6eff8c90",
      note: "New note text",
    };

    const postRes = await agent.post(`/patient/${patientId}/case/${caseId}/note`).send(newNote);
    expect(postRes.status).toBe(201);
    expect(postRes.body.responseObject.notes[1]).toHaveProperty("note", "New note text");

    const noteId = postRes.body.responseObject._id;
    const deleteRes = await agent.delete(`/patient/${patientId}/case/${caseId}/note/${noteId}`);
    expect(deleteRes.status).toBe(204);
  });

  it("should auto-populate createdBy when creating a note without it", async () => {
    const patientId = patientCaseRepository.mockPatientCases[0].patient;
    const caseId = patientCaseRepository.mockPatientCases[0]._id;
    const newNoteWithoutCreatedBy = {
      dateCreated: new Date(),
      note: "Auto-populated createdBy test",
    };

    // Use authenticated agent with session cookie
    const postRes = await agent.post(`/patient/${patientId}/case/${caseId}/note`).send(newNoteWithoutCreatedBy);

    expect(postRes.status).toBe(201);

    // Find the note we just created by its content
    const createdNote = postRes.body.responseObject.notes.find(
      (note: any) => note.note === "Auto-populated createdBy test",
    );

    expect(createdNote).toBeDefined();
    expect(createdNote).toHaveProperty("note", "Auto-populated createdBy test");
    expect(createdNote).toHaveProperty("createdBy");
    // Note: The exact user ID will depend on session/auth setup, but it should be populated
    expect(createdNote.createdBy).toBeDefined();
    // Verify that createdBy is set to the logged-in user's ID
    expect(createdNote.createdBy).toBe(mockUser._id);
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
    const case1 = patientCaseRepository.mockPatientCases[0] as unknown as PatientCase;
    const case2 = { ...patientCaseRepository.mockPatientCases[0] } as unknown as PatientCase;
    expect(comparePatientCases(case1, case2)).toBe(true);

    const case3 = patientCaseRepository.mockPatientCases[1] as unknown as PatientCase;
    expect(comparePatientCases(case1, case3)).toBe(false);
  });
});
