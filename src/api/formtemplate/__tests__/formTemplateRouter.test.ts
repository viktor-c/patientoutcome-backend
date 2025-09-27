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

  describe("MOXFQ Integration Tests", () => {
    let moxfqTemplate: any;

    beforeAll(() => {
      // Get MOXFQ template from mock data
      const templates = formTemplateRepository.mockFormTemplateData;
      moxfqTemplate = templates.find((t) => t.title === "Manchester-Oxford Foot Questionnaire");
    });

    it("should load MOXFQ template from JSON integration", () => {
      expect(moxfqTemplate).toBeDefined();
      expect(moxfqTemplate.title).toBe("Manchester-Oxford Foot Questionnaire");
      expect(moxfqTemplate._id).toBe("6832337195b15e2d7e223d51");
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

      // Test specific translation keys
      expect(moxfqTemplate.translations.de["moxfq.q1.label"]).toBe("Ich habe Schmerzen in meinem Fuß/Knöchel");
      expect(moxfqTemplate.translations.en["moxfq.q1.label"]).toBe("I have pain in my foot/ankle");
    });

    it("should apply German translations to all question titles", () => {
      const questions = moxfqTemplate.formSchema.properties.moxfq.properties;
      const questionsWithTitles = Object.keys(questions).filter((key) => questions[key].title);

      expect(questionsWithTitles).toHaveLength(16);

      // Verify specific German titles are applied
      expect(questions.q1.title).toBe("Ich habe Schmerzen in meinem Fuß/Knöchel");
      expect(questions.q15.title).toContain("Wie würden Sie in den letzten 4 Wochen");
      expect(questions.q16.title).toContain("Wurden Sie in den letzten 4 Wochen nachts");
    });

    it("should have German enumNames for all questions", () => {
      const questions = moxfqTemplate.formSchema.properties.moxfq.properties;
      const questionsWithEnumNames = Object.keys(questions).filter((key) => questions[key].enumNames);

      expect(questionsWithEnumNames).toHaveLength(16);

      // Test specific enumNames content
      expect(questions.q1.enumNames).toEqual(["Niemals", "Selten", "Manchmal", "Meistens", "Immer"]);
      expect(questions.q15.enumNames).toEqual(["Keine", "Sehr leicht", "Leicht", "Mäßig", "Stark"]);
      expect(questions.q16.enumNames).toEqual([
        "Keine Nächte",
        "Nur 1 oder 2 Nächte",
        "Einige Nächte",
        "Die meisten Nächte",
        "Jede Nacht",
      ]);
    });

    it("should have valid question schema structure", () => {
      const questions = moxfqTemplate.formSchema.properties.moxfq.properties;

      Object.keys(questions).forEach((questionKey) => {
        const question = questions[questionKey];

        // Each question should have required properties
        expect(question.title).toBeDefined();
        expect(question.type).toBe("integer");
        expect(question.minimum).toBe(0);
        expect(question.maximum).toBe(4);
        expect(question.enumNames).toBeDefined();
        expect(question.enumNames).toHaveLength(5);
      });
    });

    it("should access MOXFQ template via API endpoint", async () => {
      const response = await request(app).get("/formtemplate/id/6832337195b15e2d7e223d51");

      expect(response.status).toBe(200);
      expect(response.body.responseObject.title).toBe("Manchester-Oxford Foot Questionnaire");
      expect(response.body.responseObject.translations).toBeDefined();
    });

    it("should include MOXFQ in template list", async () => {
      const response = await request(app).get("/formtemplate");

      expect(response.status).toBe(200);
      const templates = response.body.responseObject;
      const moxfqInList = templates.find((t: any) => t.title === "Manchester-Oxford Foot Questionnaire");

      expect(moxfqInList).toBeDefined();
      expect(moxfqInList._id).toBe("6832337195b15e2d7e223d51");
    });

    it("should have German markdown content", () => {
      expect(moxfqTemplate.markdownHeader).toContain("Manchester-Oxford Fuß Fragebogen");
      expect(moxfqTemplate.markdownHeader).toContain("Einleitung");
      expect(moxfqTemplate.markdownHeader).toContain("innerhalb der letzten 4 Wochen");

      expect(moxfqTemplate.markdownFooter).toContain("MOXFQ Fragebogen ausgefüllt");
      expect(moxfqTemplate.markdownFooter).toContain("Vielen Dank für Ihre Teilnahme");
    });
  });
});
