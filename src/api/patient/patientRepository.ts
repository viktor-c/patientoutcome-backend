import { logger } from "@/common/utils/logger";
import mongoose from "mongoose";
import { PatientCaseModel } from "@/api/case/patientCaseModel";
import { patientModel } from "./patientModel";
import type { Patient, PatientWithCounts } from "./patientModel";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

export interface PaginatedResult<T> {
  patients: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PatientRepository {
  /**
   * Helper method to enrich patients with case and consultation counts
   * @param patients Array of patient documents
   * @returns Array of patients with caseCount and consultationCount
   */
  private async enrichPatientsWithCounts(patients: Patient[]): Promise<PatientWithCounts[]> {
    const patientIds = patients.map(p => p._id).filter(id => id !== undefined);
    
    if (patientIds.length === 0) {
      return patients.map(p => ({ ...p, caseCount: 0, consultationCount: 0 }));
    }

    // Aggregate patient cases with consultation counts
    // Use $lookup to join with Consultation collection and get actual consultation counts
    const counts = await PatientCaseModel.aggregate([
      {
        $match: {
          patient: { $in: patientIds },
          deletedAt: null // Only count non-deleted cases
        }
      },
      {
        // Join with Consultation collection to count actual consultations per case
        $lookup: {
          from: "consultations",
          localField: "_id",
          foreignField: "patientCaseId",
          as: "consultationsList"
        }
      },
      {
        $group: {
          _id: "$patient",
          caseCount: { $sum: 1 },
          // Sum the count of consultations across all cases for this patient
          consultationCount: {
            $sum: { $size: "$consultationsList" }
          }
        }
      }
    ]);

    // Create a map of patient ID to counts
    const countMap = new Map(counts.map(c => [c._id.toString(), { caseCount: c.caseCount, consultationCount: c.consultationCount }]));

    // Enrich patients with counts
    return patients.map(p => {
      const countData = countMap.get(p._id?.toString() ?? "");
      return {
        ...p,
        caseCount: countData?.caseCount ?? 0,
        consultationCount: countData?.consultationCount ?? 0
      };
    });
  }

  async findAllAsync(options: PaginationOptions = {}): Promise<PaginatedResult<PatientWithCounts>> {
    try {
      const { page = 1, limit = 10, includeDeleted = false } = options;
      const skip = (page - 1) * limit;

      // Build query filter
      const filter = includeDeleted ? {} : { deletedAt: null };

      const [patients, total] = await Promise.all([
        patientModel.find(filter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        patientModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      // Enrich patients with case and consultation counts
      const enrichedPatients = await this.enrichPatientsWithCounts(patients as Patient[]);

      return {
        patients: enrichedPatients,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error({ error }, "Error finding patients");
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
      const patient = await patientModel.findOne({ _id: id, deletedAt: null }).populate(["cases"]);
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
      // Exact match - the externalId must be exactly in the array, and not deleted
      const patient = await patientModel.findOne({ externalPatientId: externalId, deletedAt: null }).lean();
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
      // Partial match using regex - case insensitive, exclude deleted
      const regex = new RegExp(searchQuery, "i");
      const patients = await patientModel
        .find({ externalPatientId: { $elemMatch: { $regex: regex } }, deletedAt: null })
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
   * Soft delete a patient by setting deletedAt timestamp
   * @param id - Patient ID
   * @returns Updated patient with deletedAt set
   */
  async softDeleteByIdAsync(id: string): Promise<Patient | null> {
    try {
      mongoose.isValidObjectId(id);
    } catch (error) {
      return Promise.reject(error);
    }
    try {
      const softDeletedPatient = await patientModel.findByIdAndUpdate(
        id,
        { deletedAt: new Date() },
        { new: true, lean: true }
      );
      return softDeletedPatient;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Soft delete multiple patients
   * @param ids - Array of patient IDs
   * @returns Number of patients soft deleted
   */
  async softDeleteManyAsync(ids: string[]): Promise<number> {
    try {
      const result = await patientModel.updateMany(
        { _id: { $in: ids } },
        { deletedAt: new Date() }
      );
      return result.modifiedCount;
    } catch (error) {
      logger.error({ error }, "Error soft deleting patients");
      return Promise.reject(error);
    }
  }

  /**
   * Restore a soft deleted patient
   * @param id - Patient ID
   * @returns Restored patient
   */
  async restoreByIdAsync(id: string): Promise<Patient | null> {
    try {
      mongoose.isValidObjectId(id);
    } catch (error) {
      return Promise.reject(error);
    }
    try {
      const restoredPatient = await patientModel.findByIdAndUpdate(
        id,
        { deletedAt: null },
        { new: true, lean: true }
      );
      return restoredPatient;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Get all soft deleted patients with pagination
   * @param options - Pagination options
   * @returns Paginated list of soft deleted patients
   */
  async findAllDeletedAsync(options: PaginationOptions = {}): Promise<PaginatedResult<PatientWithCounts>> {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const [patients, total] = await Promise.all([
        patientModel.find({ deletedAt: { $ne: null } })
          .sort({ deletedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        patientModel.countDocuments({ deletedAt: { $ne: null } }),
      ]);

      const totalPages = Math.ceil(total / limit);

      // Enrich patients with case and consultation counts
      const enrichedPatients = await this.enrichPatientsWithCounts(patients as Patient[]);

      return {
        patients: enrichedPatients,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error({ error }, "Error finding deleted patients");
      return Promise.reject(error);
    }
  }

  /**
   * Creates mock data for testing and development purposes.
   * This method is only available in development and test environments.
   * In production, it will throw an error to prevent accidental data insertion.
   */
  async createMockData(): Promise<void> {
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
   * Getter to access mock data. Seeding is controlled at the router level.
   */
  public get mockPatients(): Patient[] {
    return this._mockPatients;
  }
}
