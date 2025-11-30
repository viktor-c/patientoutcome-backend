import { PatientCaseModel } from "@/api/case/patientCaseModel";
import { userRepository } from "@/api/user/userRepository";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import { assertSeedingAllowed, isMockDataAccessAllowed } from "@/common/utils/seedingUtils";
import { faker, fakerDA } from "@faker-js/faker";
import mongoose from "mongoose";
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
    return consultationModel
      .findById(consultationId)
      .populate([
        { path: "proms" },
        { path: "visitedBy" },
        { path: "patientCaseId", populate: { path: "patient" } },
        { path: "kioskId" },
      ])
      .lean();
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
      .populate([
        { path: "proms" },
        { path: "visitedBy" },
        { path: "patientCaseId", populate: { path: "patient" } },
        { path: "kioskId" },
      ])
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
    return consultationModel
      .findById(formAccessCode)
      .populate([
        { path: "proms" },
        { path: "visitedBy" },
        { path: "patientCaseId", populate: { path: "patient" } },
        { path: "kioskId" },
      ])
      .lean();
  }

  /**
   * @param consultationId id of the consultation to update
   * @description This is used to update a consultation by its ID
   * @param data data to update the consultation with
   * @returns the updated consultation object
   */
  async updateConsultation(consultationId: string, data: Partial<Consultation>): Promise<Consultation | null> {
    // Convert string createdBy fields to ObjectIds if notes are being updated
    const processedData = { ...data };

    // Process notes array if present
    if (processedData.notes && Array.isArray(processedData.notes)) {
      processedData.notes = processedData.notes.map((note: any) => ({
        ...note,
        createdBy: typeof note.createdBy === "string" ? new mongoose.Types.ObjectId(note.createdBy) : note.createdBy,
      }));
    }

    // Process images array and their notes if present
    if (processedData.images && Array.isArray(processedData.images)) {
      processedData.images = processedData.images.map((image: any) => ({
        ...image,
        addedBy: typeof image.addedBy === "string" ? new mongoose.Types.ObjectId(image.addedBy) : image.addedBy,
        notes: image.notes
          ? image.notes.map((note: any) => ({
              ...note,
              createdBy:
                typeof note.createdBy === "string" ? new mongoose.Types.ObjectId(note.createdBy) : note.createdBy,
            }))
          : [],
      }));
    }

    return consultationModel.findByIdAndUpdate(consultationId, processedData, { new: true }).lean();
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
    const cons = await consultationModel
      .find({ patientCaseId: caseId })
      .populate([
        { path: "proms" },
        { path: "visitedBy" },
        { path: "patientCaseId", populate: { path: "patient" } },
        { path: "kioskId" },
      ])
      .lean();
    return cons;
  }

  public _mockConsultations: Consultation[] = [];

  /**
   * Lazy initialization of mock data to avoid accessing userRepository.mockUsers
   * during module loading in production environment
   */
  private initializeMockData(): Consultation[] {
    if (env.NODE_ENV === "production") {
      return [];
    }

    return [
      {
        _id: "60d5ec49f1b2c12d88f1e8a1",
        __v: 0,
        patientCaseId: "677da5d8cb4569ad1c65515f",
        dateAndTime: new Date(),
        reasonForConsultation: ["planned"],
        notes: [
          {
            _id: "507f1f77bcf86cd799439011",
            dateCreated: faker.date.soon({ days: 6 }),
            createdBy: userRepository.mockUsers?.[0]?._id || "",
            note: faker.lorem.paragraph(),
          },
        ],
        proms: [
          "6832337195b15e2d7e223d51",
          "6832337395b15e2d7e223d54",
          "6832337595b15e2d7e223d57",
          "6832337195b15e2d7e223d53",
        ],
        formAccessCode: "682f7de54ef4eb7a14be67f6",
        images: [],
        visitedBy: [userRepository.mockUsers?.[0]?._id || ""],
      },
      {
        _id: "60d5ec49f1b2c12d88f1e8a2",
        __v: 0,
        patientCaseId: "677da5d8cb4569ad1c65515f",
        dateAndTime: faker.date.recent({ days: 3 }),
        reasonForConsultation: ["emergency"],
        notes: [
          {
            _id: "60d5ec49f1b2c12d88f1e8b5",
            dateCreated: faker.date.recent({ days: 3 }),
            createdBy: userRepository.mockUsers?.[1]?._id || "",
            note: faker.lorem.paragraph(),
          },
        ],
        proms: ["6832337195b15e2d7e223d55", "6832337395b15e2d7e223d56", "6832337195b15e2d7e223d54"],
        images: [],
        visitedBy: [userRepository.mockUsers?.[1]?._id || ""],
      },
      {
        _id: "60d5ec49f1b2c12d88f1e8a3",
        __v: 0,
        patientCaseId: "677da5efcb4569ad1c655160",
        dateAndTime: faker.date.soon({ days: 3 }),
        reasonForConsultation: ["pain"],
        notes: [
          {
            _id: "60d5ec49f1b2c12d88f1e8b6",
            dateCreated: faker.date.soon({ days: 3 }),
            createdBy: userRepository.mockUsers?.[2]?._id || "",
            note: faker.lorem.paragraph(),
          },
        ],
        proms: [],
        images: [],
        visitedBy: [userRepository.mockUsers?.[2]?._id || ""],
      },
      {
        _id: "60d5ec49f1b2c12d88f1e8a4",
        __v: 0,
        patientCaseId: "677da5efcb4569ad1c655160",
        dateAndTime: faker.date.recent({ days: 3 }),
        reasonForConsultation: ["followup"],
        notes: [
          {
            _id: "60d5ec49f1b2c12d88f1e8b7",
            dateCreated: faker.date.recent({ days: 3 }),
            createdBy: userRepository.mockUsers?.[0]?._id || "",
            note: faker.lorem.paragraph(),
          },
        ],
        proms: [],
        images: [],
        visitedBy: [userRepository.mockUsers?.[0]?._id || ""],
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
            dateCreated: faker.date.soon({ days: 6 }),
            createdBy: userRepository.mockUsers?.[1]?._id || "",
            note: faker.lorem.paragraph(),
          },
        ],
        proms: [],
        images: [],
        visitedBy: [userRepository.mockUsers?.[1]?._id || ""],
      },
    ];
  }

  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createMockData(): Promise<void> {
    await assertSeedingAllowed();

    try {
      await consultationModel.deleteMany({});
      await consultationModel.insertMany(this.mockConsultations);
    } catch (error) {
      logger.error({ error }, "Error seeding mock consultation data");
      return Promise.reject(error);
    }
  }

  /**
   * Getter to access mock data only in development or test environments.
   * In production, accessing this property will throw an error to prevent
   * accidental exposure of mock data.
   */
  public get mockConsultations(): Consultation[] {
    if (!isMockDataAccessAllowed()) {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }

    // Lazy initialization
    if (this._mockConsultations.length === 0) {
      this._mockConsultations = this.initializeMockData();
    }

    return this._mockConsultations;
  }
}

export const consultationRepository = new ConsultationRepository();
