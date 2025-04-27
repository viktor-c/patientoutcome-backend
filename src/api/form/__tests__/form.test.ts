import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import request from "supertest";
import { type Form, FormModel } from "../formModel";
import { formRepository } from "../formRepository";

describe("Form API", () => {
  beforeAll(async () => {
    try {
      const res = await request(app).get("/seed/form");
      if (res.status !== 200) {
        throw new Error("Failed to seed forms");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Setup form seed has failed ${error.message}`);
      } else {
        console.error("Setup form seed has failed");
        throw new Error("Setup form seed has failed");
      }
    }
  });

  it("should get a form by patientId, caseId, consultationId and formId", async () => {
    const form = formRepository.mockForms[0];
    const res = await request(app).get(
      `/patient/${form.patientId}/case/${form.caseId}/consultation/${form.consultationId}/form/${form._id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toHaveProperty("_id", form._id);
  });

  it("should get all forms", async () => {
    const res = await request(app).get("/forms");
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toBeInstanceOf(Array);
    expect(res.body.responseObject.length).toBe(formRepository.mockForms.length);
  });

  it("should get a form by ID", async () => {
    const formId = formRepository.mockForms[0]._id;
    const res = await request(app).get(`/form/${formId}`);
    expect(res.status).toBe(200);
    expect(res.body.responseObject._id).toEqual(formId);
  });

  it("should create and delete a form", async () => {
    const newForm = {
      patientId: formRepository.mockForms[0].patientId,
      caseId: formRepository.mockForms[0].caseId,
      consultationId: formRepository.mockForms[0].consultationId,
      formTemplateId: "67b4e612d0feb4ad99ae2e84",
      formData: { id: "test" },
      score: 0,
    };

    const createRes = await request(app).post("/form").send(newForm);
    expect(createRes.status).toBe(StatusCodes.CREATED);
    expect(createRes.body.responseObject).toHaveProperty("_id");

    const formId = createRes.body.responseObject._id;
    const deleteRes = await request(app).delete(`/form/${formId}`);
    expect(deleteRes.status).toBe(StatusCodes.NO_CONTENT);
  });

  it("should update a form", async () => {
    const form = formRepository.mockForms[0];

    const updateData = { score: 10 };
    const res = await request(app).put(`/form/${form._id}`).send(updateData);
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toHaveProperty("score", 10);
  });
});
