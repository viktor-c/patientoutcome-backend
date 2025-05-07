import { type Form, FormModel } from "@/api/form/formModel";
import { FormTemplate, FormTemplateModel } from "@/api/formtemplate/formTemplateModel";
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
    return FormModel.findById(id).lean();
  }

  async createForm(data: Form): Promise<Form> {
    const newForm = new FormModel(data);
    return newForm.save();
  }
  async createFormByTemplateId(
    patientId: string,
    caseId: string,
    consultationId: string,
    formTemplateId: string,
  ): Promise<ObjectId> {
    // first get the formtemplate by id
    const formTemplate = await FormTemplateModel.findById(formTemplateId);
    if (!formTemplate) {
      throw new Error("Form template not found");
    }

    const deepCopy = JSON.parse(JSON.stringify(formTemplate.toObject()));
    deepCopy._id = undefined; // remove the _id field to create a new document

    const newForm = new FormModel({
      patientId,
      caseId,
      consultationId,
      formTemplateId: formTemplateId,
      score: null,
      createdAt: new Date(),
      completedAt: null,
      ...deepCopy,
    });
    await newForm.save();
    return Promise.resolve(newForm._id);
  }

  async updateForm(id: string, data: Partial<Form>): Promise<Form | null> {
    return FormModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deleteForm(id: string): Promise<boolean> {
    const result = await FormModel.findByIdAndDelete(id);
    return !!result;
  }

  public mockForms: Form[] = [
    {
      _id: "60d5ec49f1b2c12d88f1e8a1",
      patientId: "6771d9d410ede2552b7bba40",
      caseId: "677da5d8cb4569ad1c65515f",
      consultationId: "60d5ec49f1b2c12d88f1e8a1",
      formTemplateId: "67b4e612d0feb4ad99ae2e83",
      markdownFooter: "This is a footer",
      markdownHeader: "This is a header",
      title: "Form Title",
      description: "Form Description",
      formSchema: {},
      formSchemaUI: {},
      formData: { question1: "answer1" },
      score: 10,
      createdAt: new Date(),
    },
    {
      _id: "60d5ec12f1b2c12d88f1e8a2",
      patientId: "6771d9d410ede2552b7bba40",
      caseId: "677da5d8cb4569ad1c65515f",
      consultationId: "60d5ec49f1b2c12d88f1e8a2",
      formTemplateId: "67b4e612d0feb4ad99ae2e83",
      markdownFooter: "This is a footer",
      markdownHeader: "This is a header",
      title: "Form Title",
      description: "Form Description",
      formSchema: {},
      formSchemaUI: {},
      formData: { question1: "answer1" },
      score: 10,
      createdAt: new Date(),
    },
    {
      _id: "60d5ec49f1b2c12d88f1e8a3",
      patientId: "6771d9d410ede2552b7bba40",
      caseId: "677da5d8cb4569ad1c65515f",
      consultationId: "60d5ec49f1b2c12d88f1e8a3",
      formTemplateId: "67b4e612d0feb4ad99ae2e83",
      markdownFooter: "This is a footer",
      markdownHeader: "This is a header",
      title: "Form Title",
      description: "Form Description",
      formSchema: {},
      formSchemaUI: {},
      formData: { question1: "answer1" },
      score: 10,
      createdAt: new Date(),
    },
    {
      _id: "60d5ec49f1b2c12d88f1e8a4",
      patientId: "6771d9d410ede2552b7bba41",
      caseId: "677da5efcb4569ad1c655160",
      consultationId: "60d5ec49f1b2c12d88f1e8a3",
      formTemplateId: "67b4e612d0feb4ad99ae2e84",
      markdownFooter: "This is a footer",
      markdownHeader: "This is a header",
      title: "Form Title",
      description: "Form Description",
      formSchema: {},
      formSchemaUI: {},
      formData: { question1: "answer1" },
      score: 10,
      createdAt: new Date(),
    },
  ];

  async createFormMockData(): Promise<void> {
    try {
      await FormModel.deleteMany({});
      const res = await FormModel.insertMany(this.mockForms);
      if (res) {
        console.log("Form mock data created successfully");
        return Promise.resolve();
      }
    } catch (error) {
      console.error("Error creating form mock data", error);
      return Promise.reject();
    }
  }
}

export const formRepository = new FormRepository();
