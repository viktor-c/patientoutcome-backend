import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
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

  async findByExternalIdAsync(externalId: string): Promise<Patient | null> {
    try {
      const patient = await patientModel.find({ externalPatientId: { $in: [externalId] } }).lean();
      return patient[0] || null;
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
    // Only allow mock data in development or test environments
    if (env.NODE_ENV === "production") {
      const error = new Error("Mock data is not allowed in production environment");
      logger.error({ error }, "Attempted to create mock data in production");
      return Promise.reject(error);
    }

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
      externalPatientId: ["12345"],
      sex: "F",
      cases: ["677da5d8cb4569ad1c65515f"],
    },
    {
      _id: "6771d9d410ede2552b7bba41",
      externalPatientId: ["12346"],
      sex: "M",
      cases: ["677da5efcb4569ad1c655160"],
    },
    {
      _id: "6771d9d410ede2552b7bba42",
      externalPatientId: ["12347"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba43",
      externalPatientId: ["12348"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba44",
      externalPatientId: ["12349"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba45",
      externalPatientId: ["12350"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba46",
      externalPatientId: ["12351"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba47",
      externalPatientId: ["12352"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba48",
      externalPatientId: ["12353"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba49",
      externalPatientId: ["12354"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4a",
      externalPatientId: ["12355"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4b",
      externalPatientId: ["12356"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4c",
      externalPatientId: ["12357"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4d",
      externalPatientId: ["12358"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4e",
      externalPatientId: ["12359"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4f",
      externalPatientId: ["12360"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba50",
      externalPatientId: ["12361"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba51",
      externalPatientId: ["12362"],
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba52",
      externalPatientId: ["12363"],
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba53",
      externalPatientId: ["12364"],
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
    if (env.NODE_ENV === "production") {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    return this._mockPatients;
  }
}
