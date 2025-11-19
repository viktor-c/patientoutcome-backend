import { CustomFormDataSchema } from "@/api/formtemplate/formTemplateModel";
import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { type Form, FormModel } from "../formModel";
import { formRepository } from "../formRepository";

describe("Form API", () => {
  beforeAll(async () => {
    try {
      const res = await request(app).get("/seed/forms");
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

  it("should get a form by formId", async () => {
    const form = formRepository.mockForms[0];
    const res = await request(app).get(`/form/${form._id}`);
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toHaveProperty("_id", form._id);
  });

  it("should get all forms", async () => {
    const res = await request(app).get("/forms");
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toBeInstanceOf(Array);
    expect(res.body.responseObject[0]._id).toBe(formRepository.mockForms[0]._id);
  });

  it("should get a form by ID", async () => {
    const formId = formRepository.mockForms[0]._id;
    const res = await request(app).get(`/form/${formId}`);
    expect(res.status).toBe(200);
    expect(res.body.responseObject._id).toEqual(formId);
  });

  it("should create and delete a form", async () => {
    const newForm = {
      ...formRepository.mockForms[0],
    };
    newForm._id = new mongoose.Types.ObjectId();

    const createRes = await request(app).post("/form").send(newForm);
    expect(createRes.status).toBe(StatusCodes.CREATED);
    expect(createRes.body.responseObject).toHaveProperty("_id");
    expect(createRes.body.responseObject._id).toEqual(newForm._id.toString());

    const formId = createRes.body.responseObject._id;
    const deleteRes = await request(app).delete(`/form/${formId}`);
    expect(deleteRes.status).toBe(StatusCodes.NO_CONTENT);
  });

  it("should update a form", async () => {
    const form = formRepository.mockForms[0];

    const newFormData = {
      standardfragebogen: { q1: 3, q2: 4, q3: 2, q4: 1, q5: null, q6: null },
      sportfragebogen: { s1: null, s2: null, s3: null, s4: null },
    };
    expect(CustomFormDataSchema.parse(newFormData)).toBeTruthy();
    // score cannot be directly updated, because it gets calculated from the form data
    const updateData = { formData: newFormData };
    const res = await request(app).put(`/form/${form._id}`).send(updateData);
    expect(res.status).toBe(200);
    expect(res.body.responseObject).toHaveProperty("score", 10);
  });
});
