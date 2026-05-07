import { PatientCaseModel } from "@/api/case/patientCaseModel";
import { SurgeryModel } from "@/api/surgery/surgeryModel";
import { userRepository } from "@/api/user/userRepository";
import { logger } from "@/common/utils/logger";
import { faker, fakerDA } from "@faker-js/faker";
import mongoose from "mongoose";
import { type Consultation, type CreateConsultation, consultationModel } from "./consultationModel";

// export class not instance
export class ConsultationRepository {
  private selectedCaseSurgeryDate = faker.date.recent({
    days: 40,
    refDate: new Date(Date.now() - 170 * 24 * 60 * 60 * 1000),
  });

  private selectedCaseFollowupDate(weeksAfterSurgery: number): Date {
    return new Date(this.selectedCaseSurgeryDate.getTime() + weeksAfterSurgery * 7 * 24 * 60 * 60 * 1000);
  }

  private async attachSurgeriesToConsultation<T extends Consultation | null>(consultation: T): Promise<T> {
    if (!consultation || !consultation.patientCaseId || typeof consultation.patientCaseId !== "object") {
      return consultation;
    }

    const patientCase = consultation.patientCaseId as unknown as Record<string, unknown>;
    const patientCaseId =
      typeof patientCase._id === "string"
        ? patientCase._id
        : patientCase._id?.toString?.() ?? null;

    if (!patientCaseId) {
      return consultation;
    }

    const surgeries = await SurgeryModel.find({ patientCase: patientCaseId }).populate(["surgeons"]).lean();

    return {
      ...(consultation as Record<string, unknown>),
      patientCaseId: {
        ...patientCase,
        surgeries,
      },
    } as unknown as T;
  }

  private async attachSurgeriesToConsultations<T extends Consultation[]>(consultations: T): Promise<T> {
    return Promise.all(consultations.map((consultation) => this.attachSurgeriesToConsultation(consultation))) as Promise<T>;
  }

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
    const consultation = await consultationModel
      .findById(consultationId)
      .populate([
        { path: "proms", match: { deletedAt: null } },
        { path: "visitedBy" },
        { path: "patientCaseId", populate: { path: "patient" } },
        { path: "kioskId" },
        { path: "formAccessCode" },
      ])
      .lean();

      return this.attachSurgeriesToConsultation(consultation);
  }

  /**
   * @description get all consultations for on a given day
   * @param date
   * @returns
   */
  async getAllConsultationsOnDay(fromDate: string, toDate: string): Promise<Consultation[]> {
    const from = new Date(fromDate).setHours(0, 0, 0, 0);
    const to = new Date(toDate).setHours(23, 59, 59, 999);

    const consultations = await consultationModel
      .find({ dateAndTime: { $gte: from, $lt: to } })
      .populate([
        { path: "proms", match: { deletedAt: null } },
        { path: "visitedBy" },
        { path: "patientCaseId", populate: { path: "patient" } },
        { path: "kioskId" },
        { path: "formAccessCode" },
      ])
      .select("-__v")
      .lean();

      return this.attachSurgeriesToConsultations(consultations);
  }
  /**
   * @param formAccessCode use the form access code to get the consultation, this is the id of the consultation
   * @description This is used to get the consultation by the form access code, which is the internal code of the consultation
   * @returns the consultation object
   */
  async getConsultationByFormAccessCode(formAccessCode: string): Promise<Consultation | null> {
    // formaccessCode is the internal code of the consultation or _id
    const consultation = await consultationModel
      .findById(formAccessCode)
      .populate([
        { path: "proms", match: { deletedAt: null } },
        { path: "visitedBy" },
        { path: "patientCaseId", populate: { path: "patient" } },
        { path: "kioskId" },
      ])
      .lean();

      return this.attachSurgeriesToConsultation(consultation);
  }

  /**
   * Find a consultation by the kiosk user that it is assigned to.
   * This is the inverse link to `consultation.kioskId` and is used by the
   * kiosk service when the user document does not have a `consultationId`
   * (which may happen with older mock data or in edge cases where the two
   * sides get out of sync).
   */
  async getConsultationByKioskId(kioskUserId: string): Promise<Consultation | null> {
    const consultation = await consultationModel
      .findOne({ kioskId: kioskUserId })
      .populate([
        { path: "proms", match: { deletedAt: null } },
        { path: "visitedBy" },
        { path: "patientCaseId", populate: { path: "patient" } },
        { path: "kioskId" },
        { path: "formAccessCode" },
      ])
      .lean();

      return this.attachSurgeriesToConsultation(consultation);
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
        { path: "proms", match: { deletedAt: null } },
        { path: "visitedBy" },
        { path: "patientCaseId", populate: { path: "patient" } },
        { path: "kioskId" },
        { path: "formAccessCode" },
      ])
      .lean();
    return this.attachSurgeriesToConsultations(cons);
  }

  public _mockConsultations: Consultation[] = [];

  /**
   * Lazy initialization of mock data.
   * Note: Seeding methods should call assertSeedingAllowed() before accessing this.
   */
  private initializeMockData(): Consultation[] {
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
        proms: [
          "6832337195b15e2d7e223d52",
          "6832337195b15e2d7e223d55",
          "6832337395b15e2d7e223d56",
          "6832337595b15e2d7e223d58",
        ],
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
        proms: ["6832337595b15e2d7e223d59", "6832337395b15e2d7e223d5a"],
        formAccessCode: "682f7de54ef4eb7a14be67f7",
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
        proms: ["6832337195b15e2d7e223d5b"],
        kioskId: "676336bea497301f6eff8c95",
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
        proms: ["6832337395b15e2d7e223d5c"],
        images: [],
        visitedBy: [userRepository.mockUsers?.[1]?._id || ""],
      },
      {
        _id: "60d5ec49f1b2c12d88f1e8a6",
        __v: 0,
        patientCaseId: "677da5efcb4569ad1c655161",
        dateAndTime: faker.date.recent({ days: 4 }),
        reasonForConsultation: ["planned"],
        notes: [
          {
            _id: "60d5ec49f1b2c12d88f1e8b8",
            dateCreated: faker.date.recent({ days: 4 }),
            createdBy: userRepository.mockUsers?.[3]?._id || "",
            note: faker.lorem.paragraph(),
          },
        ],
        proms: ["6832337595b15e2d7e223d5d", "6832337195b15e2d7e223d5e"],
        formAccessCode: "682f7de54ef4eb7a14be67f8",
        images: [],
        visitedBy: [userRepository.mockUsers?.[3]?._id || ""],
      },
      {
        _id: "60d5ec49f1b2c12d88f1e8a7",
        __v: 0,
        patientCaseId: "677da5efcb4569ad1c655162",
        dateAndTime: faker.date.soon({ days: 5 }),
        reasonForConsultation: ["followup"],
        notes: [
          {
            _id: "60d5ec49f1b2c12d88f1e8b9",
            dateCreated: faker.date.soon({ days: 5 }),
            createdBy: userRepository.mockUsers?.[3]?._id || "",
            note: faker.lorem.paragraph(),
          },
        ],
        proms: ["6832337395b15e2d7e223d5f"],
        kioskId: "676336bea497301f6eff8c96",
        images: [],
        visitedBy: [userRepository.mockUsers?.[3]?._id || ""],
      },
      {
        _id: "60d5ec49f1b2c12d88f1e8a8",
        __v: 0,
        patientCaseId: "677da5d8cb4569ad1c65515f",
        dateAndTime: this.selectedCaseFollowupDate(1),
        reasonForConsultation: ["followup"],
        notes: [
          {
            _id: "60d5ec49f1b2c12d88f1e8c1",
            dateCreated: faker.date.between({
              from: this.selectedCaseFollowupDate(1),
              to: new Date(this.selectedCaseFollowupDate(1).getTime() + 2 * 60 * 60 * 1000),
            }),
            createdBy: userRepository.mockUsers?.[0]?._id || "",
            note: "Post-op week 1. Relative to baseline: +10",
          },
        ],
        proms: ["6832337395b15e2d7e223d60", "6832337395b15e2d7e223e01", "6832337395b15e2d7e223e02", "6832337395b15e2d7e223e03"],
        images: [],
        visitedBy: [userRepository.mockUsers?.[0]?._id || ""],
      },
      {
        _id: "60d5ec49f1b2c12d88f1e8a9",
        __v: 0,
        patientCaseId: "677da5d8cb4569ad1c65515f",
        dateAndTime: this.selectedCaseFollowupDate(2),
        reasonForConsultation: ["followup"],
        notes: [
          {
            _id: "60d5ec49f1b2c12d88f1e8c2",
            dateCreated: faker.date.between({
              from: this.selectedCaseFollowupDate(2),
              to: new Date(this.selectedCaseFollowupDate(2).getTime() + 2 * 60 * 60 * 1000),
            }),
            createdBy: userRepository.mockUsers?.[1]?._id || "",
            note: "Post-op week 2. Relative to baseline: +3",
          },
        ],
        proms: ["6832337395b15e2d7e223d61", "6832337395b15e2d7e223e04", "6832337395b15e2d7e223e05", "6832337395b15e2d7e223e06"],
        images: [],
        visitedBy: [userRepository.mockUsers?.[1]?._id || ""],
      },
      {
        _id: "60d5ec49f1b2c12d88f1e8aa",
        __v: 0,
        patientCaseId: "677da5d8cb4569ad1c65515f",
        dateAndTime: this.selectedCaseFollowupDate(6),
        reasonForConsultation: ["followup"],
        notes: [
          {
            _id: "60d5ec49f1b2c12d88f1e8c3",
            dateCreated: faker.date.between({
              from: this.selectedCaseFollowupDate(6),
              to: new Date(this.selectedCaseFollowupDate(6).getTime() + 2 * 60 * 60 * 1000),
            }),
            createdBy: userRepository.mockUsers?.[0]?._id || "",
            note: "Post-op week 6. Relative to baseline: -8",
          },
        ],
        proms: ["6832337395b15e2d7e223d62", "6832337395b15e2d7e223e07", "6832337395b15e2d7e223e08", "6832337395b15e2d7e223e09"],
        images: [],
        visitedBy: [userRepository.mockUsers?.[0]?._id || ""],
      },
      {
        _id: "60d5ec49f1b2c12d88f1e8ad",
        __v: 0,
        patientCaseId: "677da5d8cb4569ad1c65515f",
        dateAndTime: this.selectedCaseFollowupDate(9),
        reasonForConsultation: ["followup"],
        notes: [
          {
            _id: "60d5ec49f1b2c12d88f1e8c6",
            dateCreated: faker.date.between({
              from: this.selectedCaseFollowupDate(9),
              to: new Date(this.selectedCaseFollowupDate(9).getTime() + 2 * 60 * 60 * 1000),
            }),
            createdBy: userRepository.mockUsers?.[1]?._id || "",
            note: "Post-op week 9. Relative to baseline: -5",
          },
        ],
        proms: ["6832337395b15e2d7e223d65", "6832337395b15e2d7e223e0a", "6832337395b15e2d7e223e0b", "6832337395b15e2d7e223e0c"],
        images: [],
        visitedBy: [userRepository.mockUsers?.[1]?._id || ""],
      },
      {
        _id: "60d5ec49f1b2c12d88f1e8ab",
        __v: 0,
        patientCaseId: "677da5d8cb4569ad1c65515f",
        dateAndTime: this.selectedCaseFollowupDate(12),
        reasonForConsultation: ["followup"],
        notes: [
          {
            _id: "60d5ec49f1b2c12d88f1e8c4",
            dateCreated: faker.date.between({
              from: this.selectedCaseFollowupDate(12),
              to: new Date(this.selectedCaseFollowupDate(12).getTime() + 2 * 60 * 60 * 1000),
            }),
            createdBy: userRepository.mockUsers?.[1]?._id || "",
            note: "Post-op week 12. Relative to baseline: -2",
          },
        ],
        proms: ["6832337395b15e2d7e223d63", "6832337395b15e2d7e223e0d", "6832337395b15e2d7e223e0e", "6832337395b15e2d7e223e0f"],
        images: [],
        visitedBy: [userRepository.mockUsers?.[1]?._id || ""],
      },
      {
        _id: "60d5ec49f1b2c12d88f1e8ac",
        __v: 0,
        patientCaseId: "677da5d8cb4569ad1c65515f",
        dateAndTime: this.selectedCaseFollowupDate(16),
        reasonForConsultation: ["followup"],
        notes: [
          {
            _id: "60d5ec49f1b2c12d88f1e8c5",
            dateCreated: faker.date.between({
              from: this.selectedCaseFollowupDate(16),
              to: new Date(this.selectedCaseFollowupDate(16).getTime() + 2 * 60 * 60 * 1000),
            }),
            createdBy: userRepository.mockUsers?.[0]?._id || "",
            note: "Post-op week 16. Relative to baseline: +5",
          },
        ],
        proms: ["6832337395b15e2d7e223d64", "6832337395b15e2d7e223e10", "6832337395b15e2d7e223e11", "6832337395b15e2d7e223e12"],
        images: [],
        visitedBy: [userRepository.mockUsers?.[0]?._id || ""],
      },
    ];
  }

  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createMockData(): Promise<void> {
    try {
      await consultationModel.deleteMany({});
      await consultationModel.insertMany(this.mockConsultations);
    } catch (error) {
      logger.error({ error }, "Error seeding mock consultation data");
      return Promise.reject(error);
    }
  }

  /**
   * Getter to access mock data. Seeding is controlled at the route level.
   */
  public get mockConsultations(): Consultation[] {
    // Lazy initialization
    if (this._mockConsultations.length === 0) {
      this._mockConsultations = this.initializeMockData();
    }

    return this._mockConsultations;
  }
}

export const consultationRepository = new ConsultationRepository();
