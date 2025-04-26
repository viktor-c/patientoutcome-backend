import { faker } from "@faker-js/faker";
import { type Form, FormModel } from "./formModel";

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
      formData: { question1: "answer1" },
      score: 10,
    },
    {
      _id: "60d5ec12f1b2c12d88f1e8a2",
      patientId: "6771d9d410ede2552b7bba40",
      caseId: "677da5d8cb4569ad1c65515f",
      consultationId: "60d5ec49f1b2c12d88f1e8a2",
      formData: { question2: "answer2" },
      score: 20,
    },
    {
      _id: "60d5ec49f1b2c12d88f1e8a3",
      patientId: "6771d9d410ede2552b7bba40",
      caseId: "677da5d8cb4569ad1c65515f",
      consultationId: "60d5ec49f1b2c12d88f1e8a3",
      formData: { question3: "answer3" },
      score: 30,
    },
    {
      _id: "60d5ec49f1b2c12d88f1e8a4",
      patientId: "6771d9d410ede2552b7bba41",
      caseId: "677da5efcb4569ad1c655160",
      consultationId: "60d5ec49f1b2c12d88f1e8a3",
      formData: { question4: "answer4" },
      score: 40,
    },
    {
      _id: "60d5ec49f1b2c12d88f1e8a5",
      patientId: "6771d9d410ede2552b7bba41",
      caseId: "677da5efcb4569ad1c655160",
      consultationId: "60d5ec49f1b2c12d88f1e8a4",
      formData: { question5: "answer5" },
      score: 50,
    },
  ];

  async createMockData(): Promise<void> {
    try {
      await FormModel.deleteMany({});
      const res = await FormModel.insertMany(this.mockForms);
      if (res) {
        console.log("Mock data created successfully");
        return Promise.resolve();
      }
    } catch (error) {
      console.error("Error creating mock data", error);
      return Promise.reject();
    }
  }
}

export const formRepository = new FormRepository();
