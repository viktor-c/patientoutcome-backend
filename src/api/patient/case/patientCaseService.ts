import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import type { PatientCase } from "./patientCaseModel";
import { PatientCaseRepository } from "./patientCaseRepository";

/**
 * This service class contains methods for handling patient cases.
 * The PatientCaseService class is a service layer that interacts with a repository to perform CRUD (Create, Read, Update, Delete) operations on patient cases. It handles various operations related to patient cases and ensures proper error handling and response formatting.
 */
export class PatientCaseService {
  private repository: PatientCaseRepository;

  constructor() {
    this.repository = new PatientCaseRepository();
  }

  /**
   *
   * @param patientId
   * @returns an array of patient cases, or null if no cases are found
   */
  async getAllCases(patientId: string): Promise<ServiceResponse<PatientCase[] | null>> {
    try {
      const cases = await this.repository.getAllCases(patientId);
      if (!cases || cases.length === 0) {
        return ServiceResponse.failure("No case found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Cases found", cases);
    } catch (ex) {
      const errorMessage = `Error finding all cases: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving cases.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
  /**
   *
   * @param patientId
   * @param caseId
   * @returns the patient case with the specified ID, or null if no case is found
   */
  async getCaseById(patientId: string, caseId: string): Promise<ServiceResponse<PatientCase | null>> {
    try {
      const patientCase = await this.repository.findCaseById(patientId, caseId);
      if (!patientCase) {
        return ServiceResponse.failure("Case not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Case found", patientCase);
    } catch (ex) {
      if ((ex as Error).message.includes("Cast to ObjectId failed for value")) {
        logger.error(`Invalid ID: ${patientId}, ${caseId}`);
        return ServiceResponse.failure("Invalid ID", null, StatusCodes.BAD_REQUEST);
      }
      const errorMessage = `Error finding case with id ${caseId} for patient ${patientId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while finding case.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async createCase(patientId: string, caseData: Partial<PatientCase>): Promise<ServiceResponse<PatientCase | null>> {
    try {
      const newCase = await this.repository.create(patientId, caseData);
      return ServiceResponse.created("Case created successfully", newCase);
    } catch (ex) {
      const errorMessage = `Error creating case: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while creating case.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCase(
    patientId: string,
    caseId: string,
    caseData: Partial<PatientCase>,
  ): Promise<ServiceResponse<PatientCase | null>> {
    try {
      const updatedCase = await this.repository.updateCaseById(patientId, caseId, caseData);
      if (!updatedCase) {
        return ServiceResponse.failure("Case not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Case updated successfully", updatedCase);
    } catch (ex) {
      const errorMessage = `Error updating case with id ${caseId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while updating case.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteCaseById(patientId: string, caseId: string): Promise<ServiceResponse<null>> {
    try {
      const deleted = await this.repository.deleteCaseById(patientId, caseId);
      if (!deleted) {
        return ServiceResponse.failure("Case not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.noContent("Case deleted successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting case with id ${caseId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      if ((ex as Error).message.includes("Cast to ObjectId failed for value")) {
        logger.error(`Invalid ID: ${caseId}`);
        return ServiceResponse.failure("Invalid ID", null, StatusCodes.BAD_REQUEST);
      }
      return ServiceResponse.failure("An error occurred while deleting case.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async getNotesByCaseId(caseId: string): Promise<ServiceResponse<PatientCase["notes"] | null>> {
    try {
      const notes = await this.repository.findNotesByCaseId(caseId);
      return ServiceResponse.success("Notes found", notes);
    } catch (ex) {
      const errorMessage = `Error finding notes for case with id ${caseId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while finding notes.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async addNoteToCase(caseId: string, note: PatientCase["notes"][0]): Promise<ServiceResponse<PatientCase | null>> {
    try {
      const updatedCase = await this.repository.addNoteToCase(caseId, note);
      if (!updatedCase) {
        return ServiceResponse.failure("Case not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.created("Note added successfully", updatedCase);
    } catch (ex) {
      const errorMessage = `Error adding note to case with id ${caseId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while adding note.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteNoteFromCase(caseId: string, noteId: string): Promise<ServiceResponse<PatientCase | null>> {
    try {
      const deletedCase = await this.repository.deleteNoteFromCase(caseId, noteId);
      if (!deletedCase) {
        return ServiceResponse.failure("Case not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.noContent("Note deleted successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting note from case with id ${caseId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while deleting note.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async getCasesByDiagnosis(diagnosis: string): Promise<ServiceResponse<PatientCase[] | null>> {
    try {
      const cases = await this.repository.findCasesByDiagnosis(diagnosis);
      return ServiceResponse.success("Cases found", cases);
    } catch (ex) {
      const errorMessage = `Error finding cases with diagnosis ${diagnosis}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while finding cases.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async getCasesByDiagnosisICD10(diagnosisICD10: string): Promise<ServiceResponse<PatientCase[] | null>> {
    try {
      const cases = await this.repository.findCasesByDiagnosisICD10(diagnosisICD10);
      return ServiceResponse.success("Cases found", cases);
    } catch (ex) {
      const errorMessage = `Error finding cases with diagnosis ICD10 ${diagnosisICD10}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while finding cases.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async getCasesBySurgeon(surgeonId: string): Promise<ServiceResponse<PatientCase[] | null>> {
    try {
      const cases = await this.repository.findCasesBySurgeon(surgeonId);
      return ServiceResponse.success("Cases found", cases);
    } catch (ex) {
      const errorMessage = `Error finding cases with surgeon id ${surgeonId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while finding cases.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async getCasesBySupervisor(supervisorId: string): Promise<ServiceResponse<PatientCase[] | null>> {
    try {
      const cases = await this.repository.findCasesBySupervisor(supervisorId);
      return ServiceResponse.success("Cases found", cases);
    } catch (ex) {
      const errorMessage = `Error finding cases with supervisor id ${supervisorId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while finding cases.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}

export const patientCaseService = new PatientCaseService();
