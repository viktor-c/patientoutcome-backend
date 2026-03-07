import { app } from "@/server";
import { loginUserAgent, logoutUser } from "@/utils/unitTesting";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DEPT1_PATIENT_ID = "6771d9d410ede2552b7bba40";
const DEPT1_CASE_ID = "677da5d8cb4569ad1c65515f";
const DEPT1_CONSULTATION_ID = "60d5ec49f1b2c12d88f1e8a1";

const DEPT2_PATIENT_ID = "6771d9d410ede2552b7bba42";
const DEPT2_CASE_ID = "677da5efcb4569ad1c655161";
const DEPT2_CONSULTATION_ID = "60d5ec49f1b2c12d88f1e8a6";
const DEPT1_ID = "675000000000000000000001";
const DEPT2_ID = "675000000000000000000002";

const PASSWORD = "password123#124";

describe("Multi-department access isolation", () => {
  let dept1DoctorAgent: TestAgent;
  let dept2DoctorAgent: TestAgent;
  let adminAgent: TestAgent;

  beforeAll(async () => {
    await request(app).get("/seed/user").catch(() => {});
    await request(app).get("/seed/patient").catch(() => {});
    await request(app).get("/seed/patientCase").catch(() => {});
    await request(app).get("/seed/code").catch(() => {});
    await request(app).get("/seed/consultation").catch(() => {});

    dept1DoctorAgent = await loginUserAgent("doctor"); // bwhite in department 675...001

    dept2DoctorAgent = request.agent(app);
    await dept2DoctorAgent.post("/user/login").send({ username: "jdoe", password: PASSWORD }).expect(200); // jdoe in department 675...002

    adminAgent = await loginUserAgent("admin");
  });

  afterAll(async () => {
    await logoutUser(dept1DoctorAgent);
    await logoutUser(dept2DoctorAgent);
    await logoutUser(adminAgent);
  });

  it("filters users by department for non-admin users and shows all for admin", async () => {
    const dept1UsersResponse = await dept1DoctorAgent.get("/user");
    const dept1Usernames = dept1UsersResponse.body.responseObject.map((user: any) => user.username);
    expect(dept1UsersResponse.status).toBe(200);
    expect(dept1Usernames).toContain("bwhite");
    expect(dept1Usernames).not.toContain("jdoe");

    const dept2UsersResponse = await dept2DoctorAgent.get("/user");
    const dept2Usernames = dept2UsersResponse.body.responseObject.map((user: any) => user.username);
    expect(dept2UsersResponse.status).toBe(200);
    expect(dept2Usernames).toContain("jdoe");
    expect(dept2Usernames).not.toContain("bwhite");

    const adminUsersResponse = await adminAgent.get("/user");
    const adminUsernames = adminUsersResponse.body.responseObject.map((user: any) => user.username);
    expect(adminUsersResponse.status).toBe(200);
    expect(adminUsernames).toContain("bwhite");
    expect(adminUsernames).toContain("jdoe");
  });

  it("denies cross-department access/create/delete for cases and allows same-department reads", async () => {
    const forbiddenCaseList = await dept1DoctorAgent.get(`/patient/${DEPT2_PATIENT_ID}/cases`);
    expect(forbiddenCaseList.status).toBe(403);

    const forbiddenCaseById = await dept1DoctorAgent.get(`/case/id/${DEPT2_CASE_ID}`);
    expect(forbiddenCaseById.status).toBe(403);

    const forbiddenCaseCreate = await dept1DoctorAgent.post(`/patient/${DEPT2_PATIENT_ID}/case`).send({
      externalId: `DEPT2-FORBIDDEN-${Date.now()}`,
      patient: DEPT2_PATIENT_ID,
      surgeries: [],
      supervisors: ["676336bea497301f6eff8a8f"],
      notes: [],
      mainDiagnosis: ["M20.1"],
      mainDiagnosisICD10: ["M20.1"],
    });
    expect(forbiddenCaseCreate.status).toBe(403);

    const forbiddenCaseDelete = await dept1DoctorAgent.delete(`/patient/${DEPT2_PATIENT_ID}/case/${DEPT2_CASE_ID}`);
    expect(forbiddenCaseDelete.status).toBe(403);

    const allowedCaseList = await dept1DoctorAgent.get(`/patient/${DEPT1_PATIENT_ID}/cases`);
    expect(allowedCaseList.status).toBe(200);
  });

  it("scopes patient access and creation by department (admin bypass)", async () => {
    const ownPatientResponse = await dept1DoctorAgent.get(`/patient/${DEPT1_PATIENT_ID}`);
    expect(ownPatientResponse.status).toBe(200);

    const foreignPatientResponse = await dept1DoctorAgent.get(`/patient/${DEPT2_PATIENT_ID}`);
    expect(foreignPatientResponse.status).toBe(403);

    const listResponse = await dept1DoctorAgent.get("/patient?limit=50");
    expect(listResponse.status).toBe(200);
    const patientIds = listResponse.body.responseObject.patients.map((patient: any) => patient._id);
    expect(patientIds).toContain(DEPT1_PATIENT_ID);
    expect(patientIds).not.toContain(DEPT2_PATIENT_ID);

    const forbiddenCreate = await dept1DoctorAgent.post("/patient").send({
      externalPatientId: [`FORBIDDEN-${Date.now()}`],
      sex: "F",
      departments: [DEPT2_ID],
    });
    expect(forbiddenCreate.status).toBe(403);

    const allowedCreate = await dept1DoctorAgent.post("/patient").send({
      externalPatientId: [`OWN-${Date.now()}`],
      sex: "M",
      departments: [DEPT1_ID],
    });
    expect(allowedCreate.status).toBe(201);

    const createdPatientId = allowedCreate.body.responseObject._id;
    const forbiddenDelete = await dept2DoctorAgent.delete(`/patient/${createdPatientId}`);
    expect(forbiddenDelete.status).toBe(403);

    const adminDelete = await adminAgent.delete(`/patient/${createdPatientId}`);
    expect(adminDelete.status).toBe(200);
  });

  it("denies cross-department access/create/delete for consultations and allows same-department reads", async () => {
    const forbiddenConsultationGet = await dept1DoctorAgent.get(`/consultation/${DEPT2_CONSULTATION_ID}`);
    expect(forbiddenConsultationGet.status).toBe(403);

    const forbiddenConsultationCreate = await dept1DoctorAgent.post(`/consultation/case/${DEPT2_CASE_ID}`).send({
      patientCaseId: DEPT2_CASE_ID,
      dateAndTime: new Date().toISOString(),
      reasonForConsultation: ["planned"],
      notes: [],
      images: [],
      visitedBy: ["676336bea497301f6eff8c8f"],
      formTemplates: [],
    });
    expect(forbiddenConsultationCreate.status).toBe(403);

    const forbiddenConsultationDelete = await dept1DoctorAgent.delete(`/consultation/${DEPT2_CONSULTATION_ID}`);
    expect(forbiddenConsultationDelete.status).toBe(403);

    const allowedConsultationGet = await dept1DoctorAgent.get(`/consultation/${DEPT1_CONSULTATION_ID}`);
    expect(allowedConsultationGet.status).toBe(200);
  });

  it("allows admin to access/create/delete cases and consultations across departments", async () => {
    const adminCaseList = await adminAgent.get(`/patient/${DEPT2_PATIENT_ID}/cases`);
    expect(adminCaseList.status).toBe(200);

    const caseCreateResponse = await adminAgent.post(`/patient/${DEPT2_PATIENT_ID}/case`).send({
      externalId: `ADMIN-DEPT2-${Date.now()}`,
      patient: DEPT2_PATIENT_ID,
      surgeries: [],
      supervisors: ["676336bea497301f6eff8c92"],
      notes: [],
      mainDiagnosis: ["M21.1"],
      mainDiagnosisICD10: ["M21.1"],
    });

    expect(caseCreateResponse.status).toBe(201);
    const createdCaseId = caseCreateResponse.body.responseObject._id;

    const caseDeleteResponse = await adminAgent.delete(`/patient/${DEPT2_PATIENT_ID}/case/${createdCaseId}`);
    expect(caseDeleteResponse.status).toBe(204);

    const consultationCreateResponse = await adminAgent.post(`/consultation/case/${DEPT2_CASE_ID}`).send({
      patientCaseId: DEPT2_CASE_ID,
      dateAndTime: new Date().toISOString(),
      reasonForConsultation: ["followup"],
      notes: [],
      images: [],
      visitedBy: ["676336bea497301f6eff8c92"],
      formTemplates: [],
    });

    expect(consultationCreateResponse.status).toBe(201);
    const createdConsultationId = consultationCreateResponse.body.responseObject._id;

    const consultationDeleteResponse = await adminAgent.delete(`/consultation/${createdConsultationId}`);
    expect(consultationDeleteResponse.status).toBe(204);
  });
});
