import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import type { Patient, PatientWithCounts } from "./patientModel";
import { PatientRepository, type PaginatedResult, type PaginationOptions } from "./patientRepository";
import { UserRepository } from "@/api/user/userRepository";

export class PatientService {
  private patientRepository: PatientRepository;
  private userRepository: UserRepository;

  constructor(repository: PatientRepository = new PatientRepository()) {
    this.patientRepository = repository;
    this.userRepository = new UserRepository();
  }

  async findAll(options: PaginationOptions = {}): Promise<ServiceResponse<PaginatedResult<PatientWithCounts> | null>> {
    try {
      const result = await this.patientRepository.findAllAsync(options);
      return ServiceResponse.success("Patients found", result);
    } catch (error) {
      logger.error({ error }, "Error retrieving patients");
      return ServiceResponse.failure(
        "An error occurred while retrieving patients.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllDeleted(options: PaginationOptions = {}): Promise<ServiceResponse<PaginatedResult<PatientWithCounts> | null>> {
    try {
      const result = await this.patientRepository.findAllDeletedAsync(options);
      return ServiceResponse.success("Deleted patients found", result);
    } catch (error) {
      logger.error({ error }, "Error retrieving deleted patients");
      return ServiceResponse.failure(
        "An error occurred while retrieving deleted patients.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findById(id: string): Promise<ServiceResponse<Patient | null>> {
    try {
      const patient = await this.patientRepository.findByIdAsync(id);
      if (!patient) {
        return ServiceResponse.failure("Patient not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Patient found", patient);
    } catch (ex) {
      if (((ex as Error).message as string).includes("Cast to ObjectId failed for value")) {
        logger.error(`Invalid ID: ${id}`);
        return ServiceResponse.failure("Invalid ID", null, StatusCodes.BAD_REQUEST);
      }
      return ServiceResponse.failure(
        "An error occurred while retrieving the patient.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByExternalId(externalPatientId: string): Promise<ServiceResponse<Patient | null>> {
    try {
      const patient = await this.patientRepository.findByExternalIdAsync(externalPatientId);
      if (!patient) {
        return ServiceResponse.failure("No patient found with the given external ID", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Patient found", patient);
    } catch (ex) {
      // we do not need to look for "cast to objectId failure" here, because externalPatientId is a string
      return ServiceResponse.failure(
        "An error occurred while retrieving patients by external ID.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search patients by partial external ID match
   * @param searchQuery - The partial external ID to search for
   * @returns ServiceResponse with array of matching patients
   */
  async searchByExternalId(searchQuery: string): Promise<ServiceResponse<Patient[] | null>> {
    try {
      const patients = await this.patientRepository.searchByExternalIdAsync(searchQuery);
      if (!patients || patients.length === 0) {
        return ServiceResponse.success("No patients found matching the search query", []);
      }
      return ServiceResponse.success(`Found ${patients.length} patient(s)`, patients);
    } catch (ex) {
      return ServiceResponse.failure(
        "An error occurred while searching patients by external ID.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createPatient(patientData: Patient, userId?: string): Promise<ServiceResponse<Patient | null>> {
    try {
      //must check if external patient id already exists (only if provided)
      if (patientData.externalPatientId && patientData.externalPatientId.length > 0) {
        const existingPatient = await this.patientRepository.findByExternalIdAsync(patientData.externalPatientId[0]);
        if (existingPatient) {
          return ServiceResponse.conflict("Patient with the same external ID already exists", null, StatusCodes.CONFLICT);
        }
      }
      
      // Handle department assignment
      // If no department provided by frontend, assign user's first department ObjectId
      if (userId && !patientData.department) {
        const user = await this.userRepository.findByIdAsync(userId);
        
        if (user && user.department && user.department.length > 0) {
          // Auto-assign the user's first department ObjectId to the patient
          patientData.department = user.department[0];
          logger.info(
            { userId, departmentId: user.department[0], patientId: patientData.externalPatientId },
            "Auto-assigned user's department to patient"
          );
        }
      }
      
      const newPatient = await this.patientRepository.createAsync(patientData);
      return ServiceResponse.created("Patient created successfully", newPatient);
    } catch (ex) {
      return ServiceResponse.failure(
        "An error occurred while creating the patient.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePatient(id: string, patientData: Partial<Patient>): Promise<ServiceResponse<Patient | null>> {
    try {
      const updatedPatient = await this.patientRepository.updateByIdAsync(id, patientData);
      if (!updatedPatient) {
        return ServiceResponse.failure("Patient not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Patient updated successfully", updatedPatient);
    } catch (ex) {
      return ServiceResponse.failure(
        "An error occurred while updating the patient.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deletePatient(id: string): Promise<ServiceResponse<Patient | null>> {
    try {
      const deletedPatient = await this.patientRepository.deleteByIdAsync(id);
      if (!deletedPatient) {
        return ServiceResponse.failure("Patient not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Patient deleted successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting patient with id ${id}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      if (((ex as Error).message as string).includes("Cast to ObjectId failed for value")) {
        logger.error(`Invalid ID: ${id}`);
        return ServiceResponse.failure("Invalid ID", null, StatusCodes.BAD_REQUEST);
      }
      return ServiceResponse.failure(
        "An error occurred while deleting the patient.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async softDeletePatient(id: string): Promise<ServiceResponse<Patient | null>> {
    try {
      const softDeletedPatient = await this.patientRepository.softDeleteByIdAsync(id);
      if (!softDeletedPatient) {
        return ServiceResponse.failure("Patient not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Patient soft deleted successfully", softDeletedPatient);
    } catch (ex) {
      const errorMessage = `Error soft deleting patient with id ${id}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      if (((ex as Error).message as string).includes("Cast to ObjectId failed for value")) {
        logger.error(`Invalid ID: ${id}`);
        return ServiceResponse.failure("Invalid ID", null, StatusCodes.BAD_REQUEST);
      }
      return ServiceResponse.failure(
        "An error occurred while soft deleting the patient.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async softDeletePatients(ids: string[]): Promise<ServiceResponse<{ count: number } | null>> {
    try {
      const count = await this.patientRepository.softDeleteManyAsync(ids);
      return ServiceResponse.success(`${count} patients soft deleted successfully`, { count });
    } catch (ex) {
      const errorMessage = `Error soft deleting patients: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while soft deleting patients.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async restorePatient(id: string): Promise<ServiceResponse<Patient | null>> {
    try {
      const restoredPatient = await this.patientRepository.restoreByIdAsync(id);
      if (!restoredPatient) {
        return ServiceResponse.failure("Patient not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Patient restored successfully", restoredPatient);
    } catch (ex) {
      const errorMessage = `Error restoring patient with id ${id}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      if (((ex as Error).message as string).includes("Cast to ObjectId failed for value")) {
        logger.error(`Invalid ID: ${id}`);
        return ServiceResponse.failure("Invalid ID", null, StatusCodes.BAD_REQUEST);
      }
      return ServiceResponse.failure(
        "An error occurred while restoring the patient.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const patientService = new PatientService();
