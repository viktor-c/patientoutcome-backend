import { PatientCaseModel } from "@/api/case/patientCaseModel";
import { userRepository } from "@/api/user/userRepository";
import { faker } from "@faker-js/faker";
import { formRepository } from "../form/formRepository";
import { type Consultation, type CreateConsultation, consultationModel } from "./consultationModel";

export class ConsultationRepository {
  async createConsultation(patientId: string, caseId: string, data: CreateConsultation): Promise<Consultation> {
    const patientCase = await PatientCaseModel.findById(caseId);
    if (!patientCase) {
      throw new Error("Patient case not found");
    }

    const newConsultation = new consultationModel(data);

    if (data.formTemplates && data.formTemplates.length > 0) {
      // based on the array of id in formTemplates, create a new form for each template
      // use the form API to create a new form
      // if there are multiple templates, create a new form for each template
      for (let i = 0; i < data.formTemplates.length; i++) {
        const formId = await formRepository.createFormByTemplateId(
          patientId,
          caseId,
          newConsultation.id,
          data.formTemplates[i],
        );
        newConsultation.proms.push(formId);
      }
    }

    return newConsultation.save();
  }

  async getConsultationById(consultationId: string): Promise<Consultation | null> {
    return consultationModel.findById(consultationId).populate("proms").lean();
  }

  async updateConsultation(consultationId: string, data: Partial<Consultation>): Promise<Consultation | null> {
    return consultationModel.findByIdAndUpdate(consultationId, data, { new: true }).lean();
  }

  async deleteConsultation(consultationId: string): Promise<boolean> {
    const result = await consultationModel.findByIdAndDelete(consultationId);
    return !!result;
  }

  async getAllConsultations(patientId: string, caseId: string): Promise<Consultation[]> {
    return consultationModel.find({ patientCaseId: caseId, patient: patientId }).lean();
  }

  public mockConsultations: Consultation[] = [
    {
      _id: "60d5ec49f1b2c12d88f1e8a1",
      __v: 0,
      patientCaseId: "677da5d8cb4569ad1c65515f",
      dateAndTime: faker.date.past(),
      reasonForConsultation: ["planned"],
      notes: [
        {
          _id: "507f1f77bcf86cd799439011",
          dateCreated: faker.date.past(),
          createdBy: faker.helpers.arrayElement(userRepository.mockUsers)._id || "",
          note: faker.lorem.paragraph(),
        },
      ],
      proms: [],
      images: [],
      visitedBy: [faker.helpers.arrayElement(userRepository.mockUsers)._id || ""],
    },
    {
      _id: "60d5ec49f1b2c12d88f1e8a2",
      __v: 0,
      patientCaseId: "677da5d8cb4569ad1c65515f",
      dateAndTime: faker.date.past(),
      reasonForConsultation: ["emergency"],
      notes: [
        {
          _id: "60d5ec49f1b2c12d88f1e8b5",
          dateCreated: faker.date.past(),
          createdBy: faker.helpers.arrayElement(userRepository.mockUsers)._id || "",
          note: faker.lorem.paragraph(),
        },
      ],
      proms: [],
      images: [],
      visitedBy: [faker.helpers.arrayElement(userRepository.mockUsers)._id || ""],
    },
    {
      _id: "60d5ec49f1b2c12d88f1e8a3",
      __v: 0,
      patientCaseId: "677da5efcb4569ad1c655160",
      dateAndTime: faker.date.past(),
      reasonForConsultation: ["pain"],
      notes: [
        {
          _id: "60d5ec49f1b2c12d88f1e8b6",
          dateCreated: faker.date.past(),
          createdBy: faker.helpers.arrayElement(userRepository.mockUsers)._id || "",
          note: faker.lorem.paragraph(),
        },
      ],
      proms: [],
      images: [],
      visitedBy: [faker.helpers.arrayElement(userRepository.mockUsers)._id || ""],
    },
    {
      _id: "60d5ec49f1b2c12d88f1e8a4",
      __v: 0,
      patientCaseId: "677da5efcb4569ad1c655160",
      dateAndTime: faker.date.past(),
      reasonForConsultation: ["followup"],
      notes: [
        {
          _id: "60d5ec49f1b2c12d88f1e8b7",
          dateCreated: faker.date.past(),
          createdBy: faker.helpers.arrayElement(userRepository.mockUsers)._id || "",
          note: faker.lorem.paragraph(),
        },
      ],
      proms: [],
      images: [],
      visitedBy: [faker.helpers.arrayElement(userRepository.mockUsers)._id || ""],
    },
  ];

  async createMockData(): Promise<void> {
    try {
      await consultationModel.deleteMany({});
      await consultationModel.insertMany(this.mockConsultations);
    } catch (error) {
      console.error("Error seeding mock consultation data:", error);
      return Promise.reject(error);
    }
  }
}
