import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import { assertSeedingAllowed, isMockDataAccessAllowed } from "@/common/utils/seedingUtils";
import mongoose from "mongoose";
import { patientModel } from "./patientModel";
import type { Patient } from "./patientModel";

export class PatientRepository {
  async findAllAsync(): Promise<Patient[]> {
    try {
      const patients = await patientModel.find().lean();
      return patients;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findByIdAsync(id: string): Promise<Patient | null> {
    try {
      mongoose.isValidObjectId(id);
    } catch (error) {
      return Promise.reject(error);
    }
    try {
      const patient = await patientModel.findById(id).populate(["cases"]);
      return patient;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Find a patient by exact external ID match
   * @param externalId - The exact external ID to match
   * @returns Patient if found, null otherwise
   */
  async findByExternalIdAsync(externalId: string): Promise<Patient | null> {
    try {
      // Exact match - the externalId must be exactly in the array
      const patient = await patientModel.findOne({ externalPatientId: externalId }).lean();
      return patient || null;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Search patients by partial external ID match (for search functionality)
   * @param searchQuery - The partial external ID to search for
   * @returns Array of patients matching the search query with only ID and externalPatientId
   */
  async searchByExternalIdAsync(searchQuery: string): Promise<Patient[]> {
    try {
      // Partial match using regex - case insensitive
      const regex = new RegExp(searchQuery, "i");
      const patients = await patientModel
        .find({ externalPatientId: { $elemMatch: { $regex: regex } } })
        .select("_id externalPatientId")
        .lean();
      return patients;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async createAsync(patientData: Patient): Promise<Patient> {
    try {
      const newPatient = new patientModel(patientData);
      await newPatient.save();
      return newPatient.toObject();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async updateByIdAsync(id: string, patientData: Partial<Patient>): Promise<Patient | null> {
    try {
      mongoose.isValidObjectId(id);
    } catch (error) {
      return Promise.reject(error);
    }
    try {
      const updatedPatient = await patientModel.findByIdAndUpdate(id, patientData, { new: true, lean: true });
      return updatedPatient;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async deleteByIdAsync(id: string): Promise<Patient | null> {
    try {
      mongoose.isValidObjectId(id);
    } catch (error) {
      return Promise.reject(error);
    }
    try {
      const deletedPatient = await patientModel.findByIdAndDelete(id).lean();
      return deletedPatient;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createMockData(): Promise<void> {
    await assertSeedingAllowed();

    try {
      // Add code to save mockCases to the database
      await patientModel.deleteMany({});
      const result = await patientModel.insertMany(this.mockPatients);
    } catch (error) {
      logger.error({ error }, "Error creating patient mock data");
      return Promise.reject(error);
    }
  }

  // Mock patients data
  private _mockPatients: Patient[] = [
    {
      _id: "6771d9d410ede2552b7bba40",
      externalPatientId: ["4g2kz"],
      sex: "F",
      cases: ["677da5d8cb4569ad1c65515f"],
    },
    {
      _id: "6771d9d410ede2552b7bba41",
      externalPatientId: ["a9b7c"],
      sex: "M",
      cases: ["677da5efcb4569ad1c655160"],
    },
    {
      _id: "6771d9d410ede2552b7bba42",
      externalPatientId: ["q1w2e"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba43",
      externalPatientId: ["m5n8p"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba44",
      externalPatientId: ["z0x9v"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba45",
      externalPatientId: ["b3t6y"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba46",
      externalPatientId: ["n2c4r"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba47",
      externalPatientId: ["h7u1s"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba48",
      externalPatientId: ["d5f0g"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba49",
      externalPatientId: ["p8l3m"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4a",
      externalPatientId: ["s6v2k"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4b",
      externalPatientId: ["u9j4n"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4c",
      externalPatientId: ["e1r8t"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4d",
      externalPatientId: ["y0b3q"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4e",
      externalPatientId: ["c7z6x"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4f",
      externalPatientId: ["w4p9o"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba50",
      externalPatientId: ["l2m5n"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba51",
      externalPatientId: ["t3g8h"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba52",
      externalPatientId: ["v1k6s"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba53",
      externalPatientId: ["r0q7b"],
      sex: "F",
      cases: [],
    },
  ];

  /**
   * Getter to access mock data only in development or test environments.
   * In production, accessing this property will throw an error to prevent
   * accidental exposure of mock data.
   */
  public get mockPatients(): Patient[] {
    if (!isMockDataAccessAllowed()) {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    return this._mockPatients;
  }
}
