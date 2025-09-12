import { type Form, FormModel } from "@/api/form/formModel";
import { FormTemplate, FormTemplateModel } from "@/api/formtemplate/formTemplateModel";
import { formTemplateRepository } from "@/api/formtemplate/formTemplateRepository";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import { faker } from "@faker-js/faker";
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
      score: null,
      createdAt: new Date(),
      completedAt: null,
      ...deepCopy,
    });
    await newForm.save();
    return Promise.resolve(newForm);
  }

  async updateForm(id: string, data: Partial<Form>): Promise<Form | null> {
    return FormModel.findByIdAndUpdate(id, data, { new: true }).lean();
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
    // Only allow mock data in development or test environments
    if (env.NODE_ENV === "production") {
      const error = new Error("Mock data is not allowed in production environment");
      logger.error({ error }, "Attempted to create mock data in production");
      return Promise.reject(error);
    }

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
  populateMockForms(): void {
    // Only allow mock data access in development or test environments
    if (env.NODE_ENV === "production") {
      logger.error("Attempted to populate mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }

    this.mockForms = [];
    try {
      this.mockForms.push({
        _id: "6832337195b15e2d7e223d51",
        // patientId: "6771d9d410ede2552b7bba40",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e83",
        score: undefined,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[0].title,
        description: formTemplateRepository.mockFormTemplateData[0].description,
        markdownHeader: formTemplateRepository.mockFormTemplateData[0].markdownHeader,
        markdownFooter: formTemplateRepository.mockFormTemplateData[0].markdownFooter,
        formSchema: formTemplateRepository.mockFormTemplateData[0].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[0].formSchemaUI,
        formData: formTemplateRepository.mockFormTemplateData[0].formData,
      });

      this.mockForms.push({
        _id: "6832337395b15e2d7e223d54",
        // patientId: "6771d9d410ede2552b7bba40",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a1",
        formTemplateId: "67b4e612d0feb4ad99ae2e84",
        score: undefined,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[1].title,
        description: formTemplateRepository.mockFormTemplateData[1].description,
        markdownHeader: formTemplateRepository.mockFormTemplateData[1].markdownHeader,
        markdownFooter: formTemplateRepository.mockFormTemplateData[1].markdownFooter,
        formSchema: formTemplateRepository.mockFormTemplateData[1].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[1].formSchemaUI,
        formData: formTemplateRepository.mockFormTemplateData[1].formData,
      });

      // forms for the second consultation
      this.mockForms.push({
        _id: "6832337195b15e2d7e223d55",
        // patientId: "6771d9d410ede2552b7bba40",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e83",
        score: undefined,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[0].title,
        description: formTemplateRepository.mockFormTemplateData[0].description,
        markdownHeader: formTemplateRepository.mockFormTemplateData[0].markdownHeader,
        markdownFooter: formTemplateRepository.mockFormTemplateData[0].markdownFooter,
        formSchema: formTemplateRepository.mockFormTemplateData[0].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[0].formSchemaUI,
        formData: formTemplateRepository.mockFormTemplateData[0].formData,
      });

      this.mockForms.push({
        _id: "6832337395b15e2d7e223d56",
        // patientId: "6771d9d410ede2552b7bba40",
        caseId: "677da5d8cb4569ad1c65515f",
        consultationId: "60d5ec49f1b2c12d88f1e8a2",
        formTemplateId: "67b4e612d0feb4ad99ae2e84",
        score: undefined,
        createdAt: new Date(),
        updatedAt: undefined,
        completedAt: undefined,
        formFillStatus: "draft",
        title: formTemplateRepository.mockFormTemplateData[1].title,
        description: formTemplateRepository.mockFormTemplateData[1].description,
        markdownHeader: formTemplateRepository.mockFormTemplateData[1].markdownHeader,
        markdownFooter: formTemplateRepository.mockFormTemplateData[1].markdownFooter,
        formSchema: formTemplateRepository.mockFormTemplateData[1].formSchema,
        formSchemaUI: formTemplateRepository.mockFormTemplateData[1].formSchemaUI,
        formData: formTemplateRepository.mockFormTemplateData[1].formData,
      });

      logger.info("Mock forms populated with template data successfully");
    } catch (error) {
      logger.error({ error }, "Error populating mock forms with template data");
      throw error;
    }
  }

  private _mockForms: Form[] = [];

  /**
   * Getter to access mock data only in development or test environments.
   * In production, accessing this property will throw an error to prevent
   * accidental exposure of mock data.
   */
  public get mockForms(): Form[] {
    if (env.NODE_ENV === "production") {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    return this._mockForms;
  }

  /**
   * Setter to update mock data only in development or test environments.
   * In production, accessing this property will throw an error to prevent
   * accidental exposure of mock data.
   */
  public set mockForms(value: Form[]) {
    if (env.NODE_ENV === "production") {
      logger.error("Attempted to set mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    this._mockForms = value;
  }
}

const formRepository = new FormRepository();
if (process.env.NODE_ENV === "test") {
  formRepository.populateMockForms();
}

export { formRepository };
