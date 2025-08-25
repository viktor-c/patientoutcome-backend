import { app } from "@/server";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { FormTemplateModel } from "../formTemplateModel";
import { formTemplateRepository } from "../formTemplateRepository";

describe("FormTemplate API", () => {
  beforeAll(async () => {
    try {
      const res = await request(app).get("/seed/formTemplate");
      if (res.status !== 200) {
        throw new Error("Failed to seed form templates");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Setup form template seed has failed ${error.message}`);
      } else {
        console.error("Setup form template seed has failed");
        throw new Error("Setup form template seed has failed");
      }
    }
  });

  it("should get all form templates", async () => {
    const response = await request(app).get("/formtemplate");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.responseObject)).toBe(true);
  });

  it("should get a form template by ID", async () => {
    const id = formTemplateRepository.mockFormTemplateData[0]._id;
    const response = await request(app).get(`/formtemplate/id/${id}`);
    expect(response.status).toBe(200);
    //expect(response.body.responseObject.title).toBe(formTemplateRepository.mockFormTemplateData[0].title);
  });

  it("should get a form template short list", async () => {
    const response = await request(app).get("/formtemplate/shortlist");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.responseObject)).toBe(true);
    expect(response.body.responseObject.length).toBe(formTemplateRepository.mockFormTemplateData.length);
    expect(response.body.responseObject[0]._id).toBe(formTemplateRepository.mockFormTemplateData[0]._id);
    expect(response.body.responseObject[0].title).toBe(formTemplateRepository.mockFormTemplateData[0].title);
    expect(response.body.responseObject[0].description).toBe(
      formTemplateRepository.mockFormTemplateData[0].description,
    );
    expect(response.body.responseObject[0].markdownHeader).toBe(undefined);
    expect(response.body.responseObject[0].formSchema).toBe(undefined);
    expect(response.body.responseObject[0].formData).toBe(undefined);
    expect(response.body.responseObject[0].formSchemaUI).toBe(undefined);
  });

  it("should update a form template", async () => {
    const formTemplateId = formTemplateRepository.mockFormTemplateData[0]._id;
    const newFormTemplate = JSON.parse(JSON.stringify(formTemplateRepository.mockFormTemplateData[0]));
    newFormTemplate.title = "Updated Test Form";

    const response = await request(app).put(`/formtemplate/${formTemplateId}`).send({ title: newFormTemplate.title });
    expect(response.status).toBe(200);
    expect(response.body.responseObject.title).toBe(newFormTemplate.title);
  });

  it("should create and then delete a form template", async () => {
    const formTemplate = {
      title: "Test Form 4",
      description: "A test form to be deleted",
      markdownHeader: "## Header",
      markdownFooter: "## Footer",
      formSchema: { foo: "bar" },
      formSchemaUI: { foo: "bar" },
      formData: { foo: "bar" },
    };

    const response1 = await request(app).post("/formtemplate").send(formTemplate);
    expect(response1.status).toBe(201);

    const response = await request(app).delete(`/formtemplate/${response1.body.responseObject._id}`);
    expect(response.status).toBe(204);
  });
});
