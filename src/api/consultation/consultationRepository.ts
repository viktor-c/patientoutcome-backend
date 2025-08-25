import { PatientCaseModel } from "@/api/case/patientCaseModel";
import { userRepository } from "@/api/user/userRepository";
import { faker, fakerDA } from "@faker-js/faker";
import { type Consultation, type CreateConsultation, consultationModel } from "./consultationModel";

// export class not instance
export class ConsultationRepository {
  async createConsultation(caseId: string, data: CreateConsultation): Promise<Consultation> {
    const patientCase = await PatientCaseModel.findById(caseId);
    if (!patientCase) {
      throw new Error("Patient case not found");
    }

    const newConsultation = new consultationModel(data);
    await newConsultation.save();
    return newConsultation;
  }
  /**
   * @description get a consultation by its ID
   * @param consultationId id of the consultation
   * @returns consultation object
   */
  async getConsultationById(consultationId: string): Promise<Consultation | null> {
    return consultationModel.findById(consultationId).populate(["proms", "visitedBy"]).lean();
  }

  /**
   * @description get all consultations for on a given day
   * @param date
   * @returns
   */
  async getAllConsultationsOnDay(fromDate: string, toDate: string): Promise<Consultation[]> {
    const from = new Date(fromDate).setHours(0, 0, 0, 0);
    const to = new Date(toDate).setHours(23, 59, 59, 999);

    return consultationModel
      .find({ dateAndTime: { $gte: from, $lt: to } })
      .populate(["proms", "visitedBy", "patientCaseId"])
      .select("-__v")
      .lean();
  }
  /**
   * @param formAccessCode use the form access code to get the consultation, this is the id of the consultation
   * @description This is used to get the consultation by the form access code, which is the internal code of the consultation
   * @returns the consultation object
   */
  async getConsultationByFormAccessCode(formAccessCode: string): Promise<Consultation | null> {
    // formaccessCode is the internal code of the consultation or _id
    return consultationModel.findById(formAccessCode).populate(["proms", "visitedBy"]).lean();
  }

  /**
   * @param consultationId id of the consultation to update
   * @description This is used to update a consultation by its ID
   * @param data data to update the consultation with
   * @returns the updated consultation object
   */
  async updateConsultation(consultationId: string, data: Partial<Consultation>): Promise<Consultation | null> {
    return consultationModel.findByIdAndUpdate(consultationId, data, { new: true }).lean();
  }

  /**
   * @param consultationId
   * @returns the found consultation object or null if not found
   */
  async deleteConsultation(consultationId: string): Promise<boolean> {
    const result = await consultationModel.findByIdAndDelete(consultationId);
    return Promise.resolve(!!result);
  }

  /**
   *
   * @param caseId
   * @returns
   */
  async getAllConsultations(caseId: string): Promise<Consultation[]> {
    const cons = consultationModel.find({ patientCaseId: caseId }).populate(["proms", "visitedBy"]).lean();
    return cons;
  }

  public mockConsultations: Consultation[] = [
    {
      _id: "60d5ec49f1b2c12d88f1e8a1",
      __v: 0,
      patientCaseId: "677da5d8cb4569ad1c65515f",
      dateAndTime: new Date(),
      reasonForConsultation: ["planned"],
      notes: [
        {
          _id: "507f1f77bcf86cd799439011",
          dateCreated: faker.date.soon(),
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
    {
      _id: "60d5ec49f1b2c12d88f1e8a5",
      __v: 0,
      patientCaseId: "677da5efcb4569ad1c655160",
      dateAndTime: new Date(),
      reasonForConsultation: ["followup"],
      notes: [
        {
          _id: "60d5ec49f1b2c12d88f1e8b7",
          dateCreated: faker.date.soon(),
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
