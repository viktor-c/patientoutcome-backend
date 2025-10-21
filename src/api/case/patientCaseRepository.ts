import type { User } from "@/api/user/userModel";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
// import { fakerDE as faker } from "@faker-js/faker";
import { faker } from "@faker-js/faker";
import mongoose from "mongoose";
import { type PatientCase, PatientCaseModel } from "./patientCaseModel";

export class PatientCaseRepository {
  async searchCasesByExternalId(searchCasesById: string): Promise<PatientCase[]> {
    try {
      return PatientCaseModel.find({
        externalId: { $regex: searchCasesById, $options: "i" },
      }).lean() as unknown as Promise<PatientCase[]>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // find case by externalId
  async getPatientCaseByExternalId(externalId: string): Promise<PatientCase[] | null> {
    try {
      return PatientCaseModel.find({ externalId: externalId }).lean() as unknown as PatientCase[];
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // find all cases for a patient id
  async getAllPatientCases(patientId: string): Promise<PatientCase[]> {
    try {
      return PatientCaseModel.find({
        patient: patientId,
      })
        .populate(["patient", "surgeries", "supervisors", "consultations"])
        .lean() as unknown as Promise<PatientCase[]>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async getPatientCaseById(patientId: string, caseId: string): Promise<PatientCase | null> {
    try {
      return PatientCaseModel.findById({
        _id: caseId,
        patient: patientId,
      })
        .populate(["patient", "surgeries", "supervisors", "consultations"])
        .lean() as unknown as Promise<PatientCase | null>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async createPatientCase(patientId: string, data: Partial<PatientCase>): Promise<PatientCase> {
    try {
      const newCase = new PatientCaseModel(data);
      newCase.patient = patientId;
      // create a random sensitive external Id with this pattern xxx-xxx-xxx, where x a letter or number
      // check if it already exists, if yes, create a new one
      const randomBlock = () =>
        Array.from({ length: 3 }, () => {
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          return chars.charAt(Math.floor(Math.random() * chars.length));
        }).join("");
      let NewPatientCaseResponse: PatientCase[] | null = null;
      do {
        newCase.externalId = [randomBlock(), randomBlock(), randomBlock()].join("-");
        NewPatientCaseResponse = await this.getPatientCaseByExternalId(newCase.externalId);
        // while the externalId of the new case was found when searching byExternalId, try again
      } while (NewPatientCaseResponse === null || NewPatientCaseResponse.length > 0);
      newCase.createdAt = new Date();
      return newCase.save();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async updatePatientCaseById(
    patientId: string,
    caseId: string,
    caseData: Partial<PatientCase>,
  ): Promise<PatientCase | null> {
    try {
      return await PatientCaseModel.findOneAndUpdate({ patient: patientId, _id: caseId }, caseData, { new: true });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async deletePatientCaseById(patientId: string, caseId: string): Promise<boolean> {
    try {
      const result = await PatientCaseModel.findOneAndDelete({ patient: patientId, _id: caseId });
      if (result.id === caseId) return Promise.resolve(true);
      return Promise.resolve(false);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findNotesByCaseId(caseId: string): Promise<PatientCase["notes"]> {
    try {
      const patientCase = await PatientCaseModel.findById(caseId).select("notes");
      return patientCase ? patientCase.notes : [];
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async createPatientCaseNote(caseId: string, note: PatientCase["notes"][0]): Promise<PatientCase | null> {
    try {
      const tryToFind = await PatientCaseModel.findById(caseId);
      const res = await PatientCaseModel.findByIdAndUpdate(caseId, { $push: { notes: note } }, { new: true });
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async deletePatientCaseNoteById(caseId: string, noteId: string): Promise<PatientCase | null> {
    try {
      return await PatientCaseModel.findByIdAndUpdate(caseId, { $pull: { notes: { _id: noteId } } }, { new: true });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findCasesByDiagnosis(diagnosis: string): Promise<PatientCase[]> {
    try {
      return await PatientCaseModel.find({ StudyDiagnosis: diagnosis });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findCasesByDiagnosisICD10(diagnosisICD10: string): Promise<PatientCase[]> {
    try {
      return await PatientCaseModel.find({ StudyDiagnosisICD10: diagnosisICD10 });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findCasesBySupervisor(supervisorId: string): Promise<PatientCase[]> {
    try {
      return await PatientCaseModel.find({ supervisors: supervisorId });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findSupervisorsByCaseId(caseId: string): Promise<User[]> {
    try {
      return PatientCaseModel.findById(caseId).select("supervisors").populate(["supervisors"]) as unknown as Promise<
        User[]
      >;
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

  private _mockPatientCases = [
    {
      _id: "677da5d8cb4569ad1c65515f",
      externalId: "123456789",
      createdAt: faker.date.past().toISOString(),
      patient: "6771d9d410ede2552b7bba40",
      mainDiagnosis: faker.helpers.arrayElements(this.icd10Codes, { min: 1, max: 3 }),
      studyDiagnosis: ["Hallux valgus"],
      mainDiagnosisICD10: faker.helpers.arrayElements(this.icd10Codes, { min: 1, max: 3 }),
      studyDiagnosisICD10: ["M20.1"],
      __v: 0,
      // Surgeries are now references to Surgery documents
      surgeries: ["677da5d8cb4569ad1c655260"],
      medicalHistory: faker.lorem.paragraph(),
      notes: [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          dateCreated: new Date().toISOString(),
          createdBy: "676336bea497301f6eff8c90",
          note: faker.lorem.paragraph(),
        },
      ],
      supervisors: ["676336bea497301f6eff8c91"],
    },
    {
      _id: "677da5efcb4569ad1c655160",
      patient: "6771d9d410ede2552b7bba41",
      externalId: "12345678a",
      createdAt: faker.date.past().toISOString(),
      mainDiagnosis: faker.helpers.arrayElements(this.icd10Codes, { min: 1, max: 3 }),
      studyDiagnosis: ["Hallux valgus"],
      mainDiagnosisICD10: faker.helpers.arrayElements(this.icd10Codes, { min: 1, max: 3 }),
      studyDiagnosisICD10: ["M20.1"],
      __v: 0,
      // Surgeries are now references to Surgery documents
      surgeries: ["677da5d8cb4569ad1c655261"],
      medicalHistory: faker.lorem.paragraph(),
      notes: [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          dateCreated: new Date().toISOString(),
          createdBy: "676336bea497301f6eff8c90",
          note: faker.lorem.paragraph(),
        },
      ],
      supervisors: ["676336bea497301f6eff8c91"],
    },
  ];
  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createMockPatientCaseData(): Promise<void> {
    // Only allow mock data in development or test environments
    if (env.NODE_ENV === "production") {
      const error = new Error("Mock data is not allowed in production environment");
      logger.error({ error }, "Attempted to create mock data in production");
      return Promise.reject(error);
    }

    try {
      // Add code to save mockPatientCases to the database
      await PatientCaseModel.deleteMany({});
      await PatientCaseModel.insertMany(this.mockPatientCases);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Getter to access mock data only in development or test environments.
   * In production, accessing this property will throw an error to prevent
   * accidental exposure of mock data.
   */
  public get mockPatientCases() {
    if (env.NODE_ENV === "production") {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    return this._mockPatientCases;
  }
}
