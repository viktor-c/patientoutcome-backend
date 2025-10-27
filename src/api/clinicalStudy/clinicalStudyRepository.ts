import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import { type ClinicalStudy, clinicalStudyModel } from "./clinicalStudyModel";

/**
 * this file connects to the database and retrieves the user data
 * it will be used in the tests for the user service
 */

export class ClinicalStudyRepository {
  async getClinicalStudies(): Promise<ClinicalStudy[]> {
    try {
      return clinicalStudyModel.find().populate(["supervisors", "studyNurses"]).lean().exec() as unknown as Promise<
        ClinicalStudy[]
      >;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async getClinicalStudyById(id: string): Promise<ClinicalStudy | null> {
    try {
      logger.debug(`clinicalStudyRepository.ts: Finding clinical study with id ${id}`);
      return clinicalStudyModel
        .findById(id)
        .populate(["supervisors", "studyNurses"])
        .lean()
        .exec() as unknown as Promise<ClinicalStudy | null>;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async updateClinicalStudyById(id: string, studyData: Partial<ClinicalStudy>): Promise<ClinicalStudy | null> {
    try {
      const updatedStudy = (await clinicalStudyModel.findByIdAndUpdate(id, studyData, {
        new: true,
        lean: true,
      })) as ClinicalStudy | null;
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
  // Mock data for 5 clinical studies
  private _mockClinicalStudies: ClinicalStudy[] = [
    {
      _id: "6772b1cd10ede2552b7bba5d",
      name: "Study 1",
      description: "Description for Study 1",
      includedICD10Diagnosis: ["A00", "B00"],
      creationDate: new Date("2024-01-01"),
      beginDate: new Date("2024-02-01"),
      endDate: new Date("2024-03-01"),
      studyType: ["prospective"],
      studyNurses: ["676336bea497301f6eff8c8e", "676336bea497301f6eff8c91"],
      supervisors: ["676336bea497301f6eff8c8f"],
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
      studyNurses: ["676336bea497301f6eff8c8e"],
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

  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createMockDataClinicalStudies(): Promise<void> {
    // Only allow mock data in development or test environments
    if (env.NODE_ENV === "production") {
      const error = new Error("Mock data is not allowed in production environment");
      logger.error({ error }, "Attempted to create mock data in production");
      return Promise.reject(error);
    }

    try {
      await clinicalStudyModel.deleteMany({}); // Clear existing data
      await clinicalStudyModel.insertMany(this.mockClinicalStudies);
    } catch (error) {
      logger.error({ error }, "Error creating mock data for clinical studies");
    }
  }

  /**
   * Getter to access mock data only in development or test environments.
   * In production, accessing this property will throw an error to prevent
   * accidental exposure of mock data.
   */
  public get mockClinicalStudies(): ClinicalStudy[] {
    if (env.NODE_ENV === "production") {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    return this._mockClinicalStudies;
  }
}

export const clinicalStudyRepository = new ClinicalStudyRepository();
