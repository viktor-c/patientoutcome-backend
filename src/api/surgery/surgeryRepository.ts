import type { User } from "@/api/user/userModel";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import { faker } from "@faker-js/faker";
import mongoose from "mongoose";
import { type Surgery, SurgeryModel } from "./surgeryModel";

export class SurgeryRepository {
  async getAllSurgeries(): Promise<Surgery[]> {
    try {
      return SurgeryModel.find().lean() as unknown as Promise<Surgery[]>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async getSurgeryById(surgeryId: string): Promise<Surgery | null> {
    try {
      return SurgeryModel.findById(surgeryId).lean() as unknown as Promise<Surgery | null>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async getSurgeriesByPatientCaseId(patientCaseId: string): Promise<Surgery[]> {
    try {
      return SurgeryModel.find({ patientCase: patientCaseId }).populate(["surgeons"]).lean() as unknown as Promise<
        Surgery[]
      >;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async createSurgery(surgeryData: Partial<Surgery>): Promise<Surgery> {
    try {
      const newSurgery = new SurgeryModel(surgeryData);
      // Generate external ID if not provided
      if (!newSurgery.externalId) {
        newSurgery.externalId = `SUR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      newSurgery.createdAt = new Date();
      newSurgery.updatedAt = new Date();
      return newSurgery.save();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async updateSurgeryById(surgeryId: string, surgeryData: Partial<Surgery>): Promise<Surgery | null> {
    try {
      surgeryData.updatedAt = new Date();
      return await SurgeryModel.findByIdAndUpdate(surgeryId, surgeryData, { new: true });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async deleteSurgeryById(surgeryId: string): Promise<boolean> {
    try {
      const result = await SurgeryModel.findByIdAndDelete(surgeryId);
      return result !== null;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findSurgeriesByDiagnosis(diagnosis: string): Promise<Surgery[]> {
    try {
      return await SurgeryModel.find({ diagnosis: diagnosis });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findSurgeriesByDiagnosisICD10(diagnosisICD10: string): Promise<Surgery[]> {
    try {
      return await SurgeryModel.find({ diagnosisICD10: diagnosisICD10 });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findSurgeriesBySurgeon(surgeonId: string): Promise<Surgery[]> {
    try {
      return SurgeryModel.find({ surgeons: surgeonId }).lean() as unknown as Promise<Surgery[]>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findSurgeonsBySurgeryId(surgeryId: string): Promise<User[]> {
    try {
      return SurgeryModel.findById(surgeryId).select("surgeons").populate(["surgeons"]) as unknown as Promise<User[]>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findNotesBySurgeryId(surgeryId: string): Promise<Surgery["additionalData"]> {
    try {
      const surgery = await SurgeryModel.findById(surgeryId).select("additionalData");
      return surgery ? surgery.additionalData : [];
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async createSurgeryNote(surgeryId: string, note: any): Promise<Surgery | null> {
    try {
      return await SurgeryModel.findByIdAndUpdate(surgeryId, { $push: { additionalData: note } }, { new: true });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async deleteSurgeryNoteById(surgeryId: string, noteId: string): Promise<Surgery | null> {
    try {
      return await SurgeryModel.findByIdAndUpdate(
        surgeryId,
        { $pull: { additionalData: { _id: noteId } } },
        { new: true },
      );
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async searchSurgeriesByExternalId(searchQuery: string): Promise<Surgery[]> {
    try {
      return SurgeryModel.find({
        externalId: { $regex: searchQuery, $options: "i" },
      }).lean() as unknown as Promise<Surgery[]>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findSurgeriesByDateRange(startDate: Date, endDate: Date): Promise<Surgery[]> {
    try {
      return SurgeryModel.find({
        surgeryDate: { $gte: startDate, $lte: endDate },
      }).lean() as unknown as Promise<Surgery[]>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findSurgeriesBySide(side: "left" | "right" | "none"): Promise<Surgery[]> {
    try {
      return SurgeryModel.find({ side }).lean() as unknown as Promise<Surgery[]>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findSurgeriesByTherapy(therapy: string): Promise<Surgery[]> {
    try {
      return SurgeryModel.find({ therapy: { $regex: therapy, $options: "i" } }).lean() as unknown as Promise<Surgery[]>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private icd10Codes = [
    "M20.0",
    "M20.1",
    "M20.2",
    "M20.3",
    "M20.4",
    "M20.5",
    "M20.6",
    "M20.7",
    "M20.8",
    "M20.9",
    "M21.0",
    "M21.1",
    "M21.2",
    "M21.3",
    "M21.4",
    "M21.5",
    "M21.6",
    "M21.7",
    "M21.8",
    "M21.9",
    "M22.0",
    "M22.1",
    "M22.2",
    "M22.3",
    "M22.4",
    "M22.5",
    "M22.6",
    "M22.7",
    "M22.8",
    "M22.9",
    "M23.0",
    "M23.1",
    "M23.2",
    "M23.3",
    "M23.4",
    "M23.5",
    "M23.6",
    "M23.7",
    "M23.8",
    "M23.9",
    "M24.0",
    "M24.1",
    "M24.2",
    "M24.3",
    "M24.4",
    "M24.5",
    "M24.6",
    "M24.7",
    "M24.8",
    "M24.9",
    "M25.0",
    "M25.1",
    "M25.2",
    "M25.3",
    "M25.4",
    "M25.5",
    "M25.6",
    "M25.7",
    "M25.8",
    "M25.9",
    "M60.0",
    "M60.1",
    "M60.2",
    "M60.3",
    "M60.4",
    "M60.5",
    "M60.6",
    "M60.7",
    "M60.8",
    "M60.9",
    "M61.0",
    "M61.1",
    "M61.2",
    "M61.3",
    "M61.4",
    "M61.5",
    "M61.6",
    "M61.7",
    "M61.8",
    "M61.9",
  ];

  private anaesthesiaTypes = [
    { id: 1, type: "block" },
    { id: 2, type: "spinal" },
    { id: 3, type: "general anaesthesia" },
    { id: 4, type: "local" },
  ];

  private _mockSurgeries = [
    {
      _id: "677da5d8cb4569ad1c655260",
      externalId: "SUR-001-2025",
      diagnosis: ["Hallux valgus deformity"],
      diagnosisICD10: ["M20.1"],
      therapy: "Chevron osteotomy with bunionectomy",
      OPSCodes: ["5-788.5a"],
      side: "left" as const,
      surgeryDate: faker.date.past({ years: 2 }).toISOString(),
      surgeryTime: 90,
      tourniquet: 60,
      anaesthesiaType: faker.helpers.arrayElement(this.anaesthesiaTypes),
      roentgenDosis: faker.number.float({ min: 0, max: 100 }),
      roentgenTime: "00:02:30.000",
      additionalData: [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          dateCreated: new Date().toISOString(),
          createdBy: "676336bea497301f6eff8c90",
          note: "Surgery completed successfully with no complications",
        },
      ],
      surgeons: ["676336bea497301f6eff8c91"],
      patientCase: "677da5d8cb4569ad1c65515f",
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.past().toISOString(),
    },
    {
      _id: "677da5d8cb4569ad1c655261",
      externalId: "SUR-002-2024",
      diagnosis: ["Hammer toe deformity"],
      diagnosisICD10: ["M20.4"],
      therapy: "Proximal interphalangeal joint fusion",
      OPSCodes: ["5-788.6"],
      side: "right" as const,
      surgeryDate: faker.date.past().toISOString(),
      surgeryTime: 45,
      tourniquet: 30,
      anaesthesiaType: faker.helpers.arrayElement(this.anaesthesiaTypes),
      roentgenDosis: faker.number.float({ min: 0, max: 50 }),
      roentgenTime: "00:01:15.000",
      additionalData: [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          dateCreated: new Date().toISOString(),
          createdBy: "676336bea497301f6eff8c90",
          note: "Minimal bleeding observed during procedure",
        },
      ],
      surgeons: ["676336bea497301f6eff8c91"],
      patientCase: "677da5efcb4569ad1c655160",
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.past().toISOString(),
    },
  ];

  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createMockSurgeryData(): Promise<void> {
    // Only allow mock data in development or test environments
    if (env.NODE_ENV === "production") {
      const error = new Error("Mock data is not allowed in production environment");
      logger.error({ error }, "Attempted to create mock data in production");
      return Promise.reject(error);
    }

    try {
      await SurgeryModel.deleteMany({});
      await SurgeryModel.insertMany(this.mockSurgeries);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Getter to access mock data only in development or test environments.
   * In production, accessing this property will throw an error to prevent
   * accidental exposure of mock data.
   */
  public get mockSurgeries() {
    if (env.NODE_ENV === "production") {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    return this._mockSurgeries;
  }
}
