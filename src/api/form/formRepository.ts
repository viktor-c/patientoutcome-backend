import { type Form, FormModel } from "@/api/form/formModel";
import { FormTemplate, FormTemplateModel } from "@/api/formtemplate/formTemplateModel";
import { calculateFormScore } from "@/api/formtemplate/formTemplatePlugins";
import { formTemplateRepository } from "@/api/formtemplate/formTemplateRepository";
import { logger } from "@/common/utils/logger";
import { faker } from "@faker-js/faker";
import { raw } from "express";
import type { ObjectId } from "mongoose";

export class FormRepository {
  async getAllForms(): Promise<Form[]> {
    return FormModel.find().lean();
  }

  async getFormByPatientCaseConsultationFormId(
    patientId: string,
    caseId: string,
    consultationId: string,
    formId: string,
  ): Promise<Form | null> {
    return FormModel.findOne({ patientId, caseId, consultationId, _id: formId }).lean();
  }

  async getFormById(id: string): Promise<Form | null> {
    // populate caseId, consultationId, formTemplateId
    return FormModel.findById(id).populate("caseId consultationId formTemplateId").lean();
  }

  async createForm(data: Form): Promise<Form> {
    const newForm = new FormModel(data);
    return newForm.save();
  }
  async createFormByTemplateId(caseId: string, consultationId: string, formTemplateId: string): Promise<Form | null> {
    // first get the formtemplate by id
    const formTemplate = await FormTemplateModel.findById(formTemplateId);
    if (!formTemplate) {
      return Promise.reject("Form template not found");
    }

    const deepCopy = JSON.parse(JSON.stringify(formTemplate.toObject()));
    deepCopy._id = undefined; // remove the _id field to create a new document

    const newForm = new FormModel({
      caseId,
      consultationId,
      formTemplateId: formTemplateId,
      scoring: undefined,
      createdAt: new Date(),
      completedAt: null,
      ...deepCopy,
    });
    await newForm.save();
    return Promise.resolve(newForm);
  }

  async updateForm(id: string, data: Partial<Form>): Promise<Form | null> {
    const updated = await FormModel.findByIdAndUpdate(id, data, { new: true }).populate(
      "caseId consultationId formTemplateId",
    );
    return updated ? updated.toObject() : null;
  }

  async deleteForm(id: string): Promise<boolean> {
    const result = await FormModel.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createFormMockData(): Promise<void> {
    try {
      await FormModel.deleteMany({});
      this.populateMockForms();
      const res = await FormModel.insertMany(this.mockForms);
      if (res) {
        logger.info("Form mock data created successfully");
        return Promise.resolve();
      }
    } catch (error) {
      logger.error({ error }, "Error creating form mock data");
      return Promise.reject();
    }
  }

  // no need to be async, just populate the mock forms
  // Note: This is called from createFormMockData which already calls assertSeedingAllowed()
  populateMockForms(): void {
    this.mockForms = [];
    try {
      // EFAS Form 1
      const efasFormData1 = formTemplateRepository.mockFormTemplateData[0].formData;
      const efasScoring1 = efasFormData1 ? calculateFormScore("67b4e612d0feb4ad99ae2e83", efasFormData1) : undefined;

      this.mockForms.push({
        _id: "6832337195b15e2d7e223d51",
        // patientId: "6771d9d410ede2552b7bba40",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e83", //efas
        scoring: efasScoring1,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[0].title,
        description: formTemplateRepository.mockFormTemplateData[0].description,
        formSchema: formTemplateRepository.mockFormTemplateData[0].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[0].formSchemaUI,
        formData: efasFormData1 || {}, // Store raw form data (not ScoringData)
        translations: formTemplateRepository.mockFormTemplateData[0].translations,
      });
      // VAS Form 1
      const vasFormData1 = formTemplateRepository.mockFormTemplateData[3].formData;
      const vasScoring1 = vasFormData1 ? calculateFormScore("67b4e612d0feb4ad99ae2e86", vasFormData1) : undefined;
      this.mockForms.push({
        _id: "6832337195b15e2d7e223d53",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e86", //vas
        scoring: vasScoring1,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[3].title,
        description: formTemplateRepository.mockFormTemplateData[3].description,
        formSchema: formTemplateRepository.mockFormTemplateData[3].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[3].formSchemaUI,
        formData: vasFormData1 || {}, // Store raw form data (not ScoringData)
        translations: formTemplateRepository.mockFormTemplateData[3].translations,
      });

      // AOFAS Form 1
      const aofasFormData1 = formTemplateRepository.mockFormTemplateData[1].formData;
      const aofasScoring1 = aofasFormData1 ? calculateFormScore("67b4e612d0feb4ad99ae2e84", aofasFormData1) : undefined;

      this.mockForms.push({
        _id: "6832337395b15e2d7e223d54",
        // patientId: "6771d9d410ede2552b7bba40",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e84", //aofas
        scoring: aofasScoring1,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[1].title,
        description: formTemplateRepository.mockFormTemplateData[1].description,
        formSchema: formTemplateRepository.mockFormTemplateData[1].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[1].formSchemaUI,
        formData: aofasFormData1 || {}, // Store raw form data (not ScoringData)
        translations: formTemplateRepository.mockFormTemplateData[1].translations,
      });

      // forms for the second consultation

      // VAS Form 2
      const vasFormData2 = formTemplateRepository.mockFormTemplateData[3].formData;
      const vasScoring2 = vasFormData2 ? calculateFormScore("67b4e612d0feb4ad99ae2e86", vasFormData2) : undefined;
      this.mockForms.push({
        _id: "6832337195b15e2d7e223d54",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e86", //vas
        scoring: vasScoring2,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[3].title,
        description: formTemplateRepository.mockFormTemplateData[3].description,
        formSchema: formTemplateRepository.mockFormTemplateData[3].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[3].formSchemaUI,
        formData: vasFormData2 || {}, // Store raw form data (not ScoringData)
        translations: formTemplateRepository.mockFormTemplateData[3].translations,
      });
      // EFAS Form 2
      const efasFormData2 = formTemplateRepository.mockFormTemplateData[0].formData;
      const efasScoring2 = efasFormData2 ? calculateFormScore("67b4e612d0feb4ad99ae2e83", efasFormData2) : undefined;

      this.mockForms.push({
        _id: "6832337195b15e2d7e223d55",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e83",
        scoring: efasScoring2,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[0].title,
        description: formTemplateRepository.mockFormTemplateData[0].description,
        formSchema: formTemplateRepository.mockFormTemplateData[0].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[0].formSchemaUI,
        formData: efasFormData2 || {}, // Store raw form data (not ScoringData)
        translations: formTemplateRepository.mockFormTemplateData[0].translations,
      });

      // AOFAS Form 2
      const aofasFormData2 = formTemplateRepository.mockFormTemplateData[1].formData;
      const aofasScoring2 = aofasFormData2 ? calculateFormScore("67b4e612d0feb4ad99ae2e84", aofasFormData2) : undefined;

      this.mockForms.push({
        _id: "6832337395b15e2d7e223d56",
        // patientId: "6771d9d410ede2552b7bba40",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e84",
        scoring: aofasScoring2,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[1].title,
        description: formTemplateRepository.mockFormTemplateData[1].description,
        formSchema: formTemplateRepository.mockFormTemplateData[1].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[1].formSchemaUI,
        formData: aofasFormData2 || {}, // Store raw form data (not ScoringData)
        translations: formTemplateRepository.mockFormTemplateData[1].translations,
      });

      const moxfqFormData1 = formTemplateRepository.mockFormTemplateData[2].formData;
      const moxfqScoring1 = moxfqFormData1 ? calculateFormScore("67b4e612d0feb4ad99ae2e85", moxfqFormData1) : undefined;
      // This is the moxfq Form
      this.mockForms.push({
        _id: "6832337595b15e2d7e223d57",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e85", // moxfq
        scoring: moxfqScoring1,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[2].title,
        description: formTemplateRepository.mockFormTemplateData[2].description,
        formSchema: formTemplateRepository.mockFormTemplateData[2].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[2].formSchemaUI,
        formData: moxfqFormData1 || {}, // Store raw form data (not ScoringData)
        translations: formTemplateRepository.mockFormTemplateData[2].translations,
      });

      // This is the moxfq Form
      this.mockForms.push({
        _id: "6832337595b15e2d7e223d58",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e85", // moxfq
        scoring: moxfqScoring1,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[2].title,
        description: formTemplateRepository.mockFormTemplateData[2].description,
        formSchema: formTemplateRepository.mockFormTemplateData[2].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[2].formSchemaUI,
        formData: moxfqFormData1 || {}, // Store raw form data (not ScoringData)
        translations: formTemplateRepository.mockFormTemplateData[2].translations,
      });

      logger.info("Mock forms populated with template data successfully");
    } catch (error) {
      logger.error({ error }, "Error populating mock forms with template data");
      throw error;
    }
  }

  private _mockForms: Form[] = [];

  /**
   * Getter to access mock data.
   * Note: Seeding methods should call assertSeedingAllowed() before accessing this.
   */
  public get mockForms(): Form[] {
    return this._mockForms;
  }

  /**
   * Setter to update mock data.
   * Note: Seeding methods should call assertSeedingAllowed() before accessing this.
   */
  public set mockForms(value: Form[]) {
    this._mockForms = value;
  }
}

const formRepository = new FormRepository();
if (process.env.NODE_ENV === "test") {
  formRepository.populateMockForms();
}

export { formRepository };
