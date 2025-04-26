import type { User } from "@/api/user/userModel";
import { fa, fakerDE as faker } from "@faker-js/faker";
import mongoose from "mongoose";
import { type PatientCase, PatientCaseModel } from "./patientCaseModel";

export class PatientCaseRepository {
  async getAllPatientCases(patientId: string): Promise<PatientCase[]> {
    try {
      return PatientCaseModel.find({ patient: patientId }).lean() as unknown as Promise<PatientCase[]>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findPatientCaseById(patientId: string, caseId: string): Promise<PatientCase | null> {
    try {
      return PatientCaseModel.findById({
        _id: caseId,
        patient: patientId,
      }).lean() as unknown as Promise<PatientCase | null>;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async createPatientCase(patientId: string, data: Partial<PatientCase>): Promise<PatientCase> {
    try {
      const newCase = new PatientCaseModel(data);
      //newCase.patient = new mongoose.Schema.ObjectId(patientId);
      newCase.patient = patientId;
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
      const result = await PatientCaseModel.findByIdAndDelete({ patient: patientId, _id: caseId });
      return !!result;
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

  async findCasesBySurgeon(surgeonId: string): Promise<PatientCase[]> {
    try {
      return PatientCaseModel.find({ surgeons: surgeonId }).lean() as unknown as Promise<PatientCase[]>;
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

  async findSurgeonsByCaseId(caseId: string): Promise<User[]> {
    try {
      return PatientCaseModel.findById(caseId).select("surgeons").populate("surgeons") as unknown as Promise<User[]>;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  async findSupervisorsByCaseId(caseId: string): Promise<User[]> {
    try {
      return PatientCaseModel.findById(caseId).select("supervisors").populate("supervisors") as unknown as Promise<
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
    "M62.0",
    "M62.1",
    "M62.2",
    "M62.3",
    "M62.4",
    "M62.5",
    "M62.6",
    "M62.7",
    "M62.8",
    "M62.9",
    "M63.0",
    "M63.1",
    "M63.2",
    "M63.3",
    "M63.4",
    "M63.5",
    "M63.6",
    "M63.7",
    "M63.8",
    "M63.9",
    "M64.0",
    "M64.1",
    "M64.2",
    "M64.3",
    "M64.4",
    "M64.5",
    "M64.6",
    "M64.7",
    "M64.8",
    "M64.9",
    "M65.0",
    "M65.1",
    "M65.2",
    "M65.3",
    "M65.4",
    "M65.5",
    "M65.6",
    "M65.7",
    "M65.8",
    "M65.9",
    "M66.0",
    "M66.1",
    "M66.2",
    "M66.3",
    "M66.4",
    "M66.5",
    "M66.6",
    "M66.7",
    "M66.8",
    "M66.9",
    "M67.0",
    "M67.1",
    "M67.2",
    "M67.3",
    "M67.4",
    "M67.5",
    "M67.6",
    "M67.7",
    "M67.8",
    "M67.9",
    "M68.0",
    "M68.1",
    "M68.2",
    "M68.3",
    "M68.4",
    "M68.5",
    "M68.6",
    "M68.7",
    "M68.8",
    "M68.9",
    "M69.0",
    "M69.1",
    "M69.2",
    "M69.3",
    "M69.4",
    "M69.5",
    "M69.6",
    "M69.7",
    "M69.8",
    "M69.9",
    "M70.0",
    "M70.1",
    "M70.2",
    "M70.3",
    "M70.4",
    "M70.5",
    "M70.6",
    "M70.7",
    "M70.8",
    "M70.9",
    "M71.0",
    "M71.1",
    "M71.2",
    "M71.3",
    "M71.4",
    "M71.5",
    "M71.6",
    "M71.7",
    "M71.8",
    "M71.9",
    "M72.0",
    "M72.1",
    "M72.2",
    "M72.3",
    "M72.4",
    "M72.5",
    "M72.6",
    "M72.7",
    "M72.8",
    "M72.9",
    "M73.0",
    "M73.1",
    "M73.2",
    "M73.3",
    "M73.4",
    "M73.5",
    "M73.6",
    "M73.7",
    "M73.8",
    "M73.9",
    "M74.0",
    "M74.1",
    "M74.2",
    "M74.3",
    "M74.4",
    "M74.5",
    "M74.6",
    "M74.7",
    "M74.8",
    "M74.9",
    "M75.0",
    "M75.1",
    "M75.2",
    "M75.3",
    "M75.4",
    "M75.5",
    "M75.6",
    "M75.7",
    "M75.8",
    "M75.9",
    "M76.0",
    "M76.1",
    "M76.2",
    "M76.3",
    "M76.4",
    "M76.5",
    "M76.6",
    "M76.7",
    "M76.8",
    "M76.9",
    "M77.0",
    "M77.1",
    "M77.2",
    "M77.3",
    "M77.4",
    "M77.5",
    "M77.6",
    "M77.7",
    "M77.8",
    "M77.9",
    "M78.0",
    "M78.1",
    "M78.2",
    "M78.3",
    "M78.4",
    "M78.5",
    "M78.6",
    "M78.7",
    "M78.8",
    "M78.9",
    "M79.0",
    "M79.1",
    "M79.2",
    "M79.3",
    "M79.4",
    "M79.5",
    "M79.6",
    "M79.7",
    "M79.8",
    "M79.9",
  ];

  private anaesthesiaTypes = [
    { id: 1, type: "block" },
    { id: 2, type: "spinal" },
    { id: 3, type: "general anaesthesia" },
    { id: 4, type: "local" },
  ];
  public mockCases = [
    {
      _id: "677da5d8cb4569ad1c65515f",
      patient: "6771d9d410ede2552b7bba40",
      MainDiagnosis: faker.helpers.arrayElements(this.icd10Codes, { min: 1, max: 3 }),
      StudyDiagnosis: ["Hallux valgus"],
      MainDiagnosisICD10: faker.helpers.arrayElements(this.icd10Codes, { min: 1, max: 3 }),
      StudyDiagnosisICD10: ["M20.1"],
      __v: 0,
      surgeries: [
        {
          externalId: faker.string.uuid(),
          diagnosis: faker.helpers.arrayElements(this.icd10Codes, { min: 1, max: 3 }),
          surgeryDate: faker.date.past().toISOString(),
          side: "left",
          roentgenDosis: faker.number.float({ min: 0, max: 100 }),
          roentgenTime: "00:02:00.000",
          anaesthesiaType: faker.helpers.arrayElement(this.anaesthesiaTypes),
          surgeons: ["676336bea497301f6eff8c91"],
        },
      ],
      medicalHistory: faker.lorem.paragraph(),
      notes: [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          dateCreated: new Date().toISOString(),
          createdBy: "676336bea497301f6eff8c90",
          text: faker.lorem.paragraph(),
        },
      ],
      supervisors: ["676336bea497301f6eff8c91"],
    },
    {
      _id: "677da5efcb4569ad1c655160",
      patient: "6771d9d410ede2552b7bba41",
      MainDiagnosis: faker.helpers.arrayElements(this.icd10Codes, { min: 1, max: 3 }),
      StudyDiagnosis: ["Hallux valgus"],
      MainDiagnosisICD10: faker.helpers.arrayElements(this.icd10Codes, { min: 1, max: 3 }),
      StudyDiagnosisICD10: ["M20.1"],
      __v: 0,
      surgeries: [
        {
          externalId: faker.string.uuid(),
          diagnosis: faker.helpers.arrayElements(this.icd10Codes, { min: 1, max: 3 }),
          surgeryDate: faker.date.past().toISOString(),
          side: "none",
          roentgenDosis: faker.number.float({ min: 0, max: 100 }),
          roentgenTime: "00:00:03.000",
          anaesthesiaType: faker.helpers.arrayElement(this.anaesthesiaTypes),
          surgeons: ["676336bea497301f6eff8c91"],
        },
      ],
      medicalHistory: faker.lorem.paragraph(),
      notes: [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          dateCreated: new Date().toISOString(),
          createdBy: "676336bea497301f6eff8c90",
          text: faker.lorem.paragraph(),
        },
      ],
      supervisors: ["676336bea497301f6eff8c91"],
    },
  ];
  async createMockData(): Promise<void> {
    try {
      // Add code to save mockCases to the database
      await PatientCaseModel.deleteMany({});
      const result = await PatientCaseModel.insertMany(this.mockCases);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
