import { type ClinicalStudy, clinicalStudyModel } from "./clinicalStudyModel";

/**
 * this file connects to the database and retrieves the user data
 * it will be used in the tests for the user service
 */

export class ClinicalStudyRepository {
  async getClinicalStudies(): Promise<ClinicalStudy[]> {
    try {
      const studies = (await clinicalStudyModel
        .find()
        .populate(["supervisors", "studyNurses"])
        .lean()
        .exec()) as ClinicalStudy[];
      return studies;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async getClinicalStudyById(id: string): Promise<ClinicalStudy> {
    try {
      console.debug("clinicalStudyRepository.ts: Finding clinical study with id ", id);
      const study = (await clinicalStudyModel
        .findById(id)
        .populate(["supervisors", "studyNurses"])
        .lean()
        .exec()) as ClinicalStudy;
      if (!study) {
        throw new Error(`Clinical study with id ${id} not found`);
      }
      return study;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async updateClinicalStudyById(id: string, studyData: Partial<ClinicalStudy>): Promise<ClinicalStudy> {
    try {
      const updatedStudy = clinicalStudyModel.findByIdAndUpdate(id, studyData, { new: true, lean: true });
      return updatedStudy;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async deleteClinicalStudyByIdAsync(id: string): Promise<ClinicalStudy> {
    try {
      const deletedStudy = clinicalStudyModel.findByIdAndDelete(id);
      return deletedStudy;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async createClinicalStudy(study: ClinicalStudy): Promise<ClinicalStudy> {
    try {
      const newStudy = new clinicalStudyModel(study);
      await newStudy.save();
      return newStudy;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  /**
   * get clinical studies by supervisor
   * @param supervisorId
   * @returns studies by supervisor
   */
  async getClinicalStudiesBySupervisor(supervisorId: string): Promise<ClinicalStudy[]> {
    try {
      const studies = (await clinicalStudyModel
        .find({ supervisors: supervisorId })
        .lean()) as unknown as ClinicalStudy[];
      return studies;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  /**
   * get clinical studies by study nurse
   * @param studyNursesId
   * @returns all studies bound to study nurse with the given id
   */
  async getClinicalStudiesByStudyNurse(studyNursesId: string): Promise<ClinicalStudy[]> {
    try {
      const studies = clinicalStudyModel.find({ studyNurses: studyNursesId }).lean() as unknown as ClinicalStudy[];
      return studies;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async getClinicalStudiesByDiagnosis(diagnosis: string): Promise<ClinicalStudy[]> {
    try {
      //FIXME does this actually work? we wait for a promise but return a value
      const studies = (await clinicalStudyModel
        .find({ includedICD10Diagnosis: diagnosis })
        .lean()) as unknown as ClinicalStudy[];
      return studies;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }
}

// Mock data for 5 clinical studies
export const mockClinicalStudies: ClinicalStudy[] = [
  {
    _id: "6772b1cd10ede2552b7bba5d",
    name: "Study 1",
    description: "Description for Study 1",
    includedICD10Diagnosis: ["A00", "B00"],
    creationDate: new Date("2024-01-01"),
    beginDate: new Date("2024-02-01"),
    endDate: new Date("2024-03-01"),
    studyType: ["prospective"],
    studyNurses: [
      {
        _id: "676336bea497301f6eff8c8e",
        username: "asmith",
        name: "Alice Smith",
        department: "Neurology",
        role: 2,
        email: "asmith@example.com",
        lastLogin: "2023-10-02T12:34:56Z",
        belongsToCenter: ["1"],
      },
      {
        _id: "676336bea497301f6eff8c91",
        username: "dlee",
        name: "David Lee",
        department: "Dermatology",
        role: 1,
        email: "dlee@example.com",
        lastLogin: "2023-10-05T12:34:56Z",
        belongsToCenter: ["2"],
      },
    ],
    supervisors: [
      {
        _id: "676336bea497301f6eff8c8f",
        username: "bwhite",
        name: "Bob White",
        department: "Oncology",
        role: 1,
        email: "bwhite@example.com",
        lastLogin: "2023-10-03T12:34:56Z",
        belongsToCenter: ["1"],
      },
    ],
  },
  {
    _id: "6772b1cd10ede2552b7bba5e",
    name: "Study 2",
    description: "Description for Study 2",
    includedICD10Diagnosis: ["C00", "D00"],
    creationDate: new Date("2024-01-02"),
    beginDate: new Date("2024-02-02"),
    endDate: new Date("2024-03-02"),
    studyType: ["retrospective"],
    studyNurses: [
      {
        _id: "676336bea497301f6eff8c8e",
        username: "asmith",
        name: "Alice Smith",
        department: "Neurology",
        role: 2,
        email: "asmith@example.com",
        lastLogin: "2023-10-02T12:34:56Z",
        belongsToCenter: ["1"],
      },
    ],
    supervisors: [],
  },
  {
    _id: "6772b1cd10ede2552b7bba5f",
    name: "Study 3",
    description: "Description for Study 3",
    includedICD10Diagnosis: ["E00", "F00"],
    creationDate: new Date("2024-01-03"),
    beginDate: new Date("2024-02-03"),
    endDate: new Date("2024-03-03"),
    studyType: ["prospective"],
    studyNurses: [],
    supervisors: [],
  },
  {
    _id: "6772b1cd10ede2552b7bba60",
    name: "Study 4",
    description: "Description for Study 4",
    includedICD10Diagnosis: ["G00", "H00"],
    creationDate: new Date("2024-01-04"),
    beginDate: new Date("2024-02-04"),
    endDate: new Date("2024-03-04"),
    studyType: ["retrospective"],
    studyNurses: [],
    supervisors: [],
  },
  {
    _id: "6772b1cd10ede2552b7bba61",
    name: "Study 5",
    description: "Description for Study 5",
    includedICD10Diagnosis: ["I00", "J00"],
    creationDate: new Date("2024-01-05"),
    beginDate: new Date("2024-02-05"),
    endDate: new Date("2024-03-05"),
    studyType: ["prospective"],
    studyNurses: [],
    supervisors: [],
  },
];
