import { mockUsers } from "@/api/user/userRepository";
import { faker } from "@faker-js/faker";
import { type PatientCaseConsultation, consultationModel } from "./consultationModel";

export class ConsultationRepository {
  async createConsultation(data: PatientCaseConsultation): Promise<PatientCaseConsultation> {
    const newConsultation = new consultationModel(data);
    return newConsultation.save();
  }

  async getConsultationById(consultationId: string): Promise<PatientCaseConsultation | null> {
    return consultationModel.findById(consultationId).lean();
  }

  async updateConsultation(
    consultationId: string,
    data: Partial<PatientCaseConsultation>,
  ): Promise<PatientCaseConsultation | null> {
    return consultationModel.findByIdAndUpdate(consultationId, data, { new: true }).lean();
  }

  async deleteConsultation(consultationId: string): Promise<boolean> {
    const result = await consultationModel.findByIdAndDelete(consultationId);
    return !!result;
  }

  async getAllConsultations(patientId: string, caseId: string): Promise<PatientCaseConsultation[]> {
    return consultationModel.find({ patientCaseId: caseId, patient: patientId }).lean();
  }

  public mockConsultations: PatientCaseConsultation[] = [
    {
      _id: "60d5ec49f1b2c12d88f1e8a1",
      __v: 0,
      patientCaseId: "677da5d8cb4569ad1c65515f",
      dateAndTime: faker.date.past().toISOString(),
      reasonForConsultation: ["planned"],
      notes: [
        {
          _id: "507f1f77bcf86cd799439011",
          dateCreated: faker.date.past().toISOString(),
          createdBy: faker.helpers.arrayElement(mockUsers)._id,
          text: faker.lorem.paragraph(),
        },
      ],
      proms: [],
      images: [],
      visitedBy: [faker.helpers.arrayElement(mockUsers)._id],
    },
    {
      _id: "60d5ec49f1b2c12d88f1e8a2",
      __v: 0,
      patientCaseId: "677da5d8cb4569ad1c65515f",
      dateAndTime: faker.date.past().toISOString(),
      reasonForConsultation: ["emergency"],
      notes: [
        {
          _id: "60d5ec49f1b2c12d88f1e8b5",
          dateCreated: faker.date.past().toISOString(),
          createdBy: faker.helpers.arrayElement(mockUsers)._id,
          text: faker.lorem.paragraph(),
        },
      ],
      proms: [],
      images: [],
      visitedBy: [faker.helpers.arrayElement(mockUsers)._id],
    },
    {
      _id: "60d5ec49f1b2c12d88f1e8a3",
      __v: 0,
      patientCaseId: "677da5efcb4569ad1c655160",
      dateAndTime: faker.date.past().toISOString(),
      reasonForConsultation: ["pain"],
      notes: [
        {
          _id: "60d5ec49f1b2c12d88f1e8b6",
          dateCreated: faker.date.past().toISOString(),
          createdBy: faker.helpers.arrayElement(mockUsers)._id,
          text: faker.lorem.paragraph(),
        },
      ],
      proms: [],
      images: [],
      visitedBy: [faker.helpers.arrayElement(mockUsers)._id],
    },
    {
      _id: "60d5ec49f1b2c12d88f1e8a4",
      __v: 0,
      patientCaseId: "677da5efcb4569ad1c655160",
      dateAndTime: faker.date.past().toISOString(),
      reasonForConsultation: ["followup"],
      notes: [
        {
          _id: "60d5ec49f1b2c12d88f1e8b7",
          dateCreated: faker.date.past().toISOString(),
          createdBy: faker.helpers.arrayElement(mockUsers)._id,
          text: faker.lorem.paragraph(),
        },
      ],
      proms: [],
      images: [],
      visitedBy: [faker.helpers.arrayElement(mockUsers)._id],
    },
  ];

  async createMockData() {
    await consultationModel.deleteMany({});
    return consultationModel.insertMany(this.mockConsultations);
  }
}

// export const consultationRepository = new ConsultationRepository();
