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
      const patient = await patientModel.findById(id).lean();
      return patient;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findByExternalIdAsync(externalId: string): Promise<Patient[]> {
    try {
      const patient = await patientModel.find({ externalPatientId: { $in: [externalId] } }).lean();
      return patient[0];
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
  async createMockData(): Promise<void> {
    try {
      // Add code to save mockCases to the database
      await patientModel.deleteMany({});
      const result = await patientModel.insertMany(this.mockPatients);
    } catch (error) {
      return Promise.reject(error);
    }
  }
  // Mock patients data
  public mockPatients: Patient[] = [
    {
      _id: "6771d9d410ede2552b7bba40",
      externalPatientId: ["12345"],
      age: 41,
      sex: "F",
      cases: ["677da5d8cb4569ad1c65515f"],
    },
    {
      _id: "6771d9d410ede2552b7bba41",
      externalPatientId: ["12346"],
      age: 46,
      sex: "M",
      cases: ["677da5efcb4569ad1c655160"],
    },
    {
      _id: "6771d9d410ede2552b7bba42",
      externalPatientId: ["12347"],
      age: 31,
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba43",
      externalPatientId: ["12348"],
      age: 36,
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba44",
      externalPatientId: ["12349"],
      age: 21,
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba45",
      externalPatientId: ["12350"],
      age: 51,
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba46",
      externalPatientId: ["12351"],
      age: 26,
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba47",
      externalPatientId: ["12352"],
      age: 33,
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba48",
      externalPatientId: ["12353"],
      age: 29,
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba49",
      externalPatientId: ["12354"],
      age: 38,
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4a",
      externalPatientId: ["12355"],
      age: 43,
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4b",
      externalPatientId: ["12356"],
      age: 39,
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4c",
      externalPatientId: ["12357"],
      age: 24,
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4d",
      externalPatientId: ["12358"],
      age: 30,
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4e",
      externalPatientId: ["12359"],
      age: 35,
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba4f",
      externalPatientId: ["12360"],
      age: 48,
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba50",
      externalPatientId: ["12361"],
      age: 27,
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba51",
      externalPatientId: ["12362"],
      age: 32,
      sex: "F",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba52",
      externalPatientId: ["12363"],
      age: 37,
      sex: "M",
      cases: [],
    },
    {
      _id: "6771d9d410ede2552b7bba53",
      externalPatientId: ["12364"],
      age: 28,
      sex: "F",
      cases: [],
    },
  ];
}
