import { app } from "@/server";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { FormTemplateModel } from "../formTemplateModel";

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
    // Retrieve templates from the API and use a real _id returned by the database
    const listResp = await request(app).get("/formtemplate");
    expect(listResp.status).toBe(200);
    const list = listResp.body.responseObject;
    expect(Array.isArray(list)).toBe(true);
    const id = list[0]._id;
    const response = await request(app).get(`/formtemplate/id/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.responseObject._id).toBe(id);
  });

  it("should get a form template short list", async () => {
    const response = await request(app).get("/formtemplate/shortlist");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.responseObject)).toBe(true);
    // Ensure returned shortlist contains all template ids returned by the full list endpoint
    const fullListResp = await request(app).get("/formtemplate");
    expect(fullListResp.status).toBe(200);
    const mockIds = fullListResp.body.responseObject.map((t: any) => t._id);
    const shortlistIds = response.body.responseObject.map((t: any) => t._id);
    mockIds.forEach((mid: any) => expect(shortlistIds).toContain(mid));

    // Pick one shortlist item and verify it doesn't include full schema/data
    const item = response.body.responseObject.find((x: any) => x._id === mockIds[0]);
    expect(item).toBeDefined();
    expect(item.formSchema).toBe(undefined);
    expect(item.formData).toBe(undefined);
    expect(item.formSchemaUI).toBe(undefined);
  });

  it("should update a form template", async () => {
    // Fetch an existing template via the API to get a valid _id
    const listResp = await request(app).get("/formtemplate");
    expect(listResp.status).toBe(200);
    const templates = listResp.body.responseObject;
    const formTemplateId = templates[0]._id;
    const sourceTemplate = templates.find((t: any) => t._id === formTemplateId);
    const newFormTemplate = JSON.parse(JSON.stringify(sourceTemplate));
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

  describe("MOXFQ Integration Tests", () => {
    let moxfqTemplate: any;

    beforeAll(async () => {
      // Fetch templates from the API and find MOXFQ by title or schema
      const resp = await request(app).get("/formtemplate");
      expect(resp.status).toBe(200);
      const templates = resp.body.responseObject as any[];
      moxfqTemplate = templates.find((t: any) => t?.title?.includes("Manchester-Oxford"));
      if (!moxfqTemplate) {
        moxfqTemplate = templates.find((t: any) => t.formSchema?.properties?.moxfq);
      }
      if (!moxfqTemplate) {
        throw new Error("MOXFQ template not found in seeded templates");
      }
    });

    it("should load MOXFQ template from JSON integration", () => {
      expect(moxfqTemplate).toBeDefined();
      expect(moxfqTemplate.title).toBeDefined();
      expect(moxfqTemplate.title).toContain("Manchester-Oxford");
      expect(moxfqTemplate._id).toBeDefined();
    });

    it("should have complete MOXFQ structure", () => {
      expect(moxfqTemplate.formSchema).toBeDefined();
      expect(moxfqTemplate.formSchemaUI).toBeDefined();
      expect(moxfqTemplate.formData).toBeDefined();
      expect(moxfqTemplate.translations).toBeDefined();
      expect(moxfqTemplate.markdownHeader).toBeDefined();
      expect(moxfqTemplate.markdownFooter).toBeDefined();
    });

    it("should have 16 questions in MOXFQ schema", () => {
      expect(moxfqTemplate.formSchema.properties.moxfq.properties).toBeDefined();
      const questions = Object.keys(moxfqTemplate.formSchema.properties.moxfq.properties);
      expect(questions).toHaveLength(16);

      // Verify all expected question keys exist
      const expectedQuestions = Array.from({ length: 16 }, (_, i) => `q${i + 1}`);
      expectedQuestions.forEach((question) => {
        expect(questions).toContain(question);
      });
    });

    it("should have German and English translations", () => {
      expect(moxfqTemplate.translations.de).toBeDefined();
      expect(moxfqTemplate.translations.en).toBeDefined();

      // Test specific translation keys exist
      expect(moxfqTemplate.translations.de["moxfq.q1.label"]).toBeDefined();
      expect(moxfqTemplate.translations.en["moxfq.q1.label"]).toBeDefined();
    });

    it("should apply German translations to all question titles", () => {
      const questions = moxfqTemplate.formSchema.properties.moxfq.properties;
      const questionsWithTitles = Object.keys(questions).filter((key) => questions[key].title);

      expect(questionsWithTitles).toHaveLength(16);

      // Verify specific German titles are applied (existence checks)
      expect(questions.q1.title).toBeDefined();
      expect(String(questions.q15.title)).toContain("Wie");
      expect(String(questions.q16.title)).toContain("Wurden");
    });

    it("should have German enumNames for all questions", () => {
      const questions = moxfqTemplate.formSchema.properties.moxfq.properties;
      const questionsWithEnumNames = Object.keys(questions).filter((key) => questions[key].enumNames);

      expect(questionsWithEnumNames).toHaveLength(16);

      // Test specific enumNames existence and length
      expect(questions.q1.enumNames).toBeDefined();
      expect(questions.q1.enumNames).toHaveLength(5);
      expect(questions.q15.enumNames).toBeDefined();
      expect(questions.q15.enumNames).toHaveLength(5);
      expect(questions.q16.enumNames).toBeDefined();
      expect(questions.q16.enumNames).toHaveLength(5);
    });

    it("should have valid question schema structure", () => {
      const questions = moxfqTemplate.formSchema.properties.moxfq.properties;

      Object.keys(questions).forEach((questionKey) => {
        const question = questions[questionKey];

        // Each question should have required properties
        expect(question.title).toBeDefined();
        expect(question.type).toBe("integer");
        // expect(question.minimum).toBe(0);
        // expect(question.maximum).toBe(4);
        expect(question.enumNames).toBeDefined();
        expect(question.enumNames).toHaveLength(5);
      });
    });

    it("should access MOXFQ template via API endpoint", async () => {
      const response = await request(app).get(`/formtemplate/id/${moxfqTemplate._id}`);

      expect(response.status).toBe(200);
      expect(response.body.responseObject.translations).toBeDefined();
    });

    it("should include MOXFQ in template list", async () => {
      const response = await request(app).get("/formtemplate");

      expect(response.status).toBe(200);
      const templates = response.body.responseObject;
      const moxfqInList = templates.find((t: any) => t.title?.includes("Manchester-Oxford"));

      expect(moxfqInList).toBeDefined();
      expect(moxfqInList._id).toBe(moxfqTemplate._id);
    });

    it("should have German markdown content", () => {
      expect(moxfqTemplate.markdownHeader).toContain("# MANCHESTER-OXFORD FUSS FRAGEBOGEN (MOXFQ)");
      expect(moxfqTemplate.markdownHeader).toContain("Einleitung");
      expect(moxfqTemplate.markdownHeader).toContain("innerhalb der letzten 4 Wochen");

      expect(moxfqTemplate.markdownFooter).toContain("MOXFQ Fragebogen ausgefüllt");
      expect(moxfqTemplate.markdownFooter).toContain("Vielen Dank für Ihre Teilnahme");
    });
  });
});
