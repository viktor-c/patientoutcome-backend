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
  let sessionCookie: string;

  // seed the mongodb table "patientcases"; if it fails, then fail all tests
  beforeAll(async () => {
    try {
      const res = await request(app).get("/seed/patientCase");
      if (res.status !== 200) {
        throw new Error("Failed to insert mock data");
      }

      // Login first user to get session
      agent = request.agent(app);
      const loginRes = await agent.post("/user/login").send({
        username: mockUser.username,
        password: "password123#124", // plaintext for first user
      });
      if (loginRes.status === StatusCodes.OK) {
        sessionCookie = loginRes.headers["set-cookie"]?.[0];
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
    expect(PatientCaseSchema.safeParse(res.body.responseObject[0]).success).toBeTruthy();
    expect(res.body.responseObject[0]._id).toEqual(patientCaseRepository.mockPatientCases[0]._id);
    //TODO add indepth compare of objects
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
      surgeries: [
        {
          _id: "677da5efcb4569ad1c655560",
          externalId: "23a9618a-456a-49e3-8156-e2189f888bdb",
          diagnosis: ["M78.7", "M73.8"],
          side: "none",
          surgeryDate: "2025-03-01T04:11:41.154Z",
          anaesthesiaType: {
            id: 1,
            type: "block",
          },
          roentgenDosis: 76.89170063405697,
          roentgenTime: "00:00:03.000",
          surgeons: ["676336bea497301f6eff8c91"],
        },
      ],
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
    const createRes = await agent.post(`/patient/${patientId}/case`).set("Cookie", sessionCookie).send(newCase);
    expect(createRes.status).toBe(201);
    expect(createRes.body.responseObject).toHaveProperty("_id");
    expect(createRes.body.responseObject.patient).toEqual(patientId);

    const caseId = createRes.body.responseObject._id;
    const deleteRes = await agent.delete(`/patient/${patientId}/case/${caseId}`).set("Cookie", sessionCookie);
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
    const res = await request(app).get(`/patient/${patientId}/case/${caseId}/notes`);
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

    const postRes = await agent
      .post(`/patient/${patientId}/case/${caseId}/note`)
      .set("Cookie", sessionCookie)
      .send(newNote);
    expect(postRes.status).toBe(201);
    expect(postRes.body.responseObject.notes[1]).toHaveProperty("note", "New note text");

    const noteId = postRes.body.responseObject._id;
    const deleteRes = await agent
      .delete(`/patient/${patientId}/case/${caseId}/note/${noteId}`)
      .set("Cookie", sessionCookie);
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
    const postRes = await agent
      .post(`/patient/${patientId}/case/${caseId}/note`)
      .set("Cookie", sessionCookie)
      .send(newNoteWithoutCreatedBy);

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
