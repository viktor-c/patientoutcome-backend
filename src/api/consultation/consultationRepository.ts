import { PatientCaseModel } from "@/api/case/patientCaseModel";
import { userRepository } from "@/api/user/userRepository";
import { faker } from "@faker-js/faker";
import { type Consultation, type CreateConsultation, consultationModel } from "./consultationModel";

export class ConsultationRepository {
  async createConsultation(patientId: string, caseId: string, data: CreateConsultation): Promise<Consultation> {
    const patientCase = await PatientCaseModel.findById(caseId);
    if (!patientCase) {
      throw new Error("Patient case not found");
    }

    const newConsultation = new consultationModel(data);
    return newConsultation;
  }

  async getConsultationById(consultationId: string): Promise<Consultation | null> {
    return consultationModel.findById(consultationId).populate(["proms", "visitedBy"]).lean();
  }

  async getConsultationByFormAccessCode(formAccessCode: string): Promise<Consultation | null> {
    // formaccessCode is the internal code of the consultation or _id
    return consultationModel.findById(formAccessCode).populate(["proms", "visitedBy"]).lean();
  }

  async updateConsultation(consultationId: string, data: Partial<Consultation>): Promise<Consultation | null> {
    return consultationModel.findByIdAndUpdate(consultationId, data, { new: true }).lean();
  }

  async deleteConsultation(consultationId: string): Promise<boolean> {
    const result = await consultationModel.findByIdAndDelete(consultationId);
    return !!result;
  }

  async getAllConsultations(caseId: string): Promise<Consultation[]> {
    const cons = await consultationModel
      .find({ patientCaseId: caseId })
      .select("-__v")
      .populate(["proms", "visitedBy"])
      .lean();
    // const cons = await consultationModel.find({ patientCaseId: caseId }).select("-__v").lean();
    return cons;
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
      proms: ["6832337195b15e2d7e223d51", "6832337395b15e2d7e223d54"],
      formAccessCode: "682f7de54ef4eb7a14be67f6",
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

export const consultationRepository = new ConsultationRepository();
