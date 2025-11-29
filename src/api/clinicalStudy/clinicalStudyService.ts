import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import type { ClinicalStudy } from "./clinicalStudyModel";
import { ClinicalStudyRepository } from "./clinicalStudyRepository";

export class ClinicalStudyService {
  private clinicalStudyRepository: ClinicalStudyRepository;

  constructor(repository: ClinicalStudyRepository = new ClinicalStudyRepository()) {
    this.clinicalStudyRepository = repository;
  }

  async getClinicalStudies(): Promise<ServiceResponse<ClinicalStudy[] | null>> {
    try {
      const studies = await this.clinicalStudyRepository.getClinicalStudies();
      if (!studies || studies.length === 0) {
        return ServiceResponse.failure("No Clinical Studies found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<ClinicalStudy[]>("Clinical Studies found", studies);
    } catch (ex) {
      const errorMessage = `Error retrieving clinical studies: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving clinical studies.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getClinicalStudyById(id: string): Promise<ServiceResponse<ClinicalStudy | null>> {
    try {
      const study = await this.clinicalStudyRepository.getClinicalStudyById(id);
      if (!study) {
        return ServiceResponse.failure("Clinical Study not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<ClinicalStudy>("Clinical Study found", study);
    } catch (ex) {
      const errorMessage = `Error retrieving clinical study with id ${id}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving clinical study.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateClinicalStudyById(
    id: string,
    studyData: Partial<ClinicalStudy>,
  ): Promise<ServiceResponse<ClinicalStudy | null>> {
    try {
      const updatedStudy = await this.clinicalStudyRepository.updateClinicalStudyById(id, studyData);
      if (!updatedStudy) {
        return ServiceResponse.failure("Clinical Study not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<ClinicalStudy>("Clinical Study updated successfully", updatedStudy);
    } catch (ex) {
      const errorMessage = `Error updating clinical study with id ${id}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while updating clinical study.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteClinicalStudyById(id: string): Promise<ServiceResponse<null>> {
    try {
      const deletedStudy = await this.clinicalStudyRepository.deleteClinicalStudyByIdAsync(id);
      if (!deletedStudy) {
        return ServiceResponse.failure("Clinical Study not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<null>("Clinical Study deleted successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting clinical study with id ${id}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while deleting clinical study.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createClinicalStudy(study: ClinicalStudy): Promise<ServiceResponse<ClinicalStudy | null>> {
    try {
      const newStudy = await this.clinicalStudyRepository.createClinicalStudy(study);
      return ServiceResponse.created<ClinicalStudy>("Clinical Study created successfully", newStudy);
    } catch (ex) {
      const errorMessage = `Error creating clinical study: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while creating clinical study.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getClinicalStudiesBySupervisor(supervisorId: string): Promise<ServiceResponse<ClinicalStudy[] | null>> {
    try {
      const studies = await this.clinicalStudyRepository.getClinicalStudiesBySupervisor(supervisorId);
      if (!studies || studies.length === 0) {
        return ServiceResponse.failure("No Clinical Studies found for supervisor", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<ClinicalStudy[]>("Clinical Studies found for supervisor", studies);
    } catch (ex) {
      const errorMessage = `Error retrieving clinical studies for supervisor with id ${supervisorId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving clinical studies for supervisor.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getClinicalStudiesByStudyNurse(studyNurseId: string): Promise<ServiceResponse<ClinicalStudy[] | null>> {
    try {
      const studies = await this.clinicalStudyRepository.getClinicalStudiesByStudyNurse(studyNurseId);
      if (!studies || studies.length === 0) {
        return ServiceResponse.failure("No Clinical Studies found for study nurse", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<ClinicalStudy[]>("Clinical Studies found for study nurse", studies);
    } catch (ex) {
      const errorMessage = `Error retrieving clinical studies for study nurse with id ${studyNurseId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving clinical studies for study nurse.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getClinicalStudiesByDiagnosis(diagnosis: string): Promise<ServiceResponse<ClinicalStudy[] | null>> {
    try {
      const studies = await this.clinicalStudyRepository.getClinicalStudiesByDiagnosis(diagnosis);
      if (!studies || studies.length === 0) {
        return ServiceResponse.failure("No Clinical Studies found for diagnosis", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<ClinicalStudy[]>("Clinical Studies found for diagnosis", studies);
    } catch (ex) {
      const errorMessage = `Error retrieving clinical studies for diagnosis ${diagnosis}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving clinical studies for diagnosis.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const clinicalStudyService = new ClinicalStudyService();
