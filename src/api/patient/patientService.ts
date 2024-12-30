import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import type { Patient } from "./patientModel";
import { PatientRepository } from "./patientRepository";

export class PatientService {
  private patientRepository: PatientRepository;

  constructor(repository: PatientRepository = new PatientRepository()) {
    this.patientRepository = repository;
  }

  async findAll(): Promise<ServiceResponse<Patient[] | null>> {
    try {
      const patients = await this.patientRepository.findAllAsync();
      return ServiceResponse.success("Patients found", patients);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving patients.",
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

  async createPatient(patientData: Patient): Promise<ServiceResponse<Patient>> {
    try {
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
}

export const patientService = new PatientService();
