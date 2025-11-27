import type { User } from "@/api/user/userModel";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import { surgeryController } from "../surgery/surgeryController";
import { SurgeryRepository } from "../surgery/surgeryRepository";
import type { PatientCase, PatientCaseWithPopulatedSurgeries } from "./patientCaseModel";
import { PatientCaseRepository } from "./patientCaseRepository";

/**
 * This service class contains methods for handling patient cases.
 * The PatientCaseService class is a service layer that interacts with a repository to perform CRUD (Create, Read, Update, Delete) operations on patient cases. It handles various operations related to patient cases and ensures proper error handling and response formatting.
 */
export class PatientCaseService {
  private repository: PatientCaseRepository;
  private surgeryRepository: SurgeryRepository;

  constructor() {
    this.repository = new PatientCaseRepository();
    this.surgeryRepository = new SurgeryRepository();
  }

  /**
   * @description Get all patient cases for a given patient
   * @param patientId the ID of the patient
   * @returns an array of patient cases (may be empty if no cases exist)
   * @throws {ServiceResponse} if an error occurs while finding cases
   */
  async getAllPatientCases(patientId: string): Promise<ServiceResponse<PatientCaseWithPopulatedSurgeries[] | null>> {
    try {
      const cases = await this.repository.getAllPatientCases(patientId);
      // Return empty array if no cases found - this is a valid state, not an error
      if (!cases || cases.length === 0) {
        return ServiceResponse.success("No cases found for this patient", []);
      }
      // For each case, we can populate additional fields if needed
      const casesWithPopulatedSurgeries: PatientCaseWithPopulatedSurgeries[] = [];

      for (const patientCase of cases) {
        const surgeriesForCase = await this.surgeryRepository.getSurgeriesByPatientCaseId(
          patientCase._id?.toString() || "",
        );
        const caseWithPopulatedSurgeries: PatientCaseWithPopulatedSurgeries = {
          ...patientCase,
          surgeries: surgeriesForCase || [],
        };
        casesWithPopulatedSurgeries.push(caseWithPopulatedSurgeries);
      }
      return ServiceResponse.success("Cases found", casesWithPopulatedSurgeries);
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
   * @description Get a patient case by ID
   * @param patientId the ID of the patient
   * @param caseId the ID of the case to find
   * @returns the patient case, or null if not found
   * @throws {ServiceResponse} if an error occurs while finding the case
   */
  async getPatientCaseById(patientId: string, caseId: string): Promise<ServiceResponse<PatientCase | null>> {
    try {
      const patientCase = await this.repository.getPatientCaseById(patientId, caseId);
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

  /**
   * @description Search for patient cases by partial external ID match
   * @param searchQuery the search query string
   * @returns an array of matching patient cases (may be empty if no matches)
   * @throws {ServiceResponse} if an error occurs while searching
   */
  async searchCasesByExternalId(searchQuery: string): Promise<ServiceResponse<PatientCase[] | null>> {
    try {
      const cases = await this.repository.searchCasesByExternalId(searchQuery);
      // Return empty array if no cases found - this is a valid search result, not an error
      if (!cases || !cases.length) {
        return ServiceResponse.success("No cases match query", []);
      }
      return ServiceResponse.success("Cases found", cases);
    } catch (ex) {
      const errorMessage = `Error searching for cases: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while searching for cases.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Create a new patient case
   * @param patientId the ID of the patient
   * @param caseData the data for the new case
   * @returns the created patient case, or null if not found
   * @throws {ServiceResponse} if an error occurs while creating the case
   */
  async createPatientCase(
    patientId: string,
    caseData: Partial<PatientCase>,
  ): Promise<ServiceResponse<PatientCase | null>> {
    try {
      const newCase = await this.repository.createPatientCase(patientId, caseData);
      return ServiceResponse.created("Case created successfully", newCase);
    } catch (ex) {
      const errorMessage = `Error creating case: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while creating case.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * @description Update a patient case by ID
   * @param patientId the ID of the patient
   * @param caseId the ID of the case to update
   * @param caseData the data to update in the case
   * @returns the updated patient case, or null if not found
   * @throws {ServiceResponse} if an error occurs while updating the case
   */
  async updatePatientCaseById(
    patientId: string,
    caseId: string,
    caseData: Partial<PatientCase>,
  ): Promise<ServiceResponse<PatientCase | null>> {
    try {
      const updatedCase = await this.repository.updatePatientCaseById(patientId, caseId, caseData);
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

  /**
   * @description Delete a patient case by ID
   * @param patientId the ID of the patient
   * @param caseId the ID of the case to delete
   * @returns a success message if the case is deleted, or an error message if not found
   * @throws {ServiceResponse} if an error occurs while deleting the case
   */
  async deletePatientCaseById(patientId: string, caseId: string): Promise<ServiceResponse<null>> {
    try {
      const deleted = await this.repository.deletePatientCaseById(patientId, caseId);
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

  /**
   * @description Get notes by case ID
   * @param caseId the ID of the case
   * @returns an array of notes for the specified case, or null if no notes are found
   * @throws {ServiceResponse} if an error occurs while finding notes
   */
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

  /**
   * @description Create a new patient case note
   * @param caseId the ID of the case
   * @param note the note to add
   * @returns the updated patient case with the new note, or an error message if not found
   * @throws {ServiceResponse} if an error occurs while adding the note
   */
  async createPatientCaseNote(
    caseId: string,
    note: PatientCase["notes"][0],
  ): Promise<ServiceResponse<PatientCase | null>> {
    try {
      const updatedCase = await this.repository.createPatientCaseNote(caseId, note);
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

  /**
   * @description Delete a patient case note by ID
   * @param caseId the ID of the case
   * @param noteId the ID of the note to delete
   * @returns a success message if the note is deleted, or an error message if not found
   * @throws {ServiceResponse} if an error occurs while deleting the note
   */
  async deletePatientCaseNoteById(caseId: string, noteId: string): Promise<ServiceResponse<PatientCase | null>> {
    try {
      const deletedCase = await this.repository.deletePatientCaseNoteById(caseId, noteId);
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

  /**
   * @description Get cases by diagnosis
   * @param diagnosis to search for
   * @returns an array of patient cases with the specified diagnosis, or null if no cases are found
   * @throws {ServiceResponse} if an error occurs while finding cases
   * @throws {ServiceResponse} if no cases are found
   * @throws {ServiceResponse} if an error occurs while finding cases
   */
  async getCasesByDiagnosis(diagnosis: string): Promise<ServiceResponse<PatientCase[] | null>> {
    try {
      const cases = await this.repository.findCasesByDiagnosis(diagnosis);
      if (!cases || cases.length === 0) {
        return ServiceResponse.failure("No cases found for this diagnosis", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Cases found", cases);
    } catch (ex) {
      const errorMessage = `Error finding cases with diagnosis ${diagnosis}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while finding cases.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * @description Get cases by diagnosis ICD10
   * @param diagnosisICD10 diagnosis ICD10 to search for
   * @returns an array of patient cases with the specified diagnosis ICD10, or null if no cases are found
   * @throws {ServiceResponse} if an error occurs while finding cases
   * @throws {ServiceResponse} if no cases are found
   * @throws {ServiceResponse} if an error occurs while finding cases
   */
  async getCasesByDiagnosisICD10(diagnosisICD10: string): Promise<ServiceResponse<PatientCase[] | null>> {
    try {
      const cases = await this.repository.findCasesByDiagnosisICD10(diagnosisICD10);
      if (!cases || cases.length === 0) {
        return ServiceResponse.failure("No cases found for this diagnosis ICD10", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Cases found", cases);
    } catch (ex) {
      const errorMessage = `Error finding cases with diagnosis ICD10 ${diagnosisICD10}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while finding cases.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * @description Get cases by supervisor
   * @param supervisorId supervisor ID to search for
   * @returns an array of patient cases with the specified supervisor, or null if no cases are found
   * @throws {ServiceResponse} if an error occurs while finding cases
   * @throws {ServiceResponse} if no cases are found
   * @throws {ServiceResponse} if an error occurs while finding cases
   */
  async getCasesBySupervisor(supervisorId: string): Promise<ServiceResponse<PatientCase[] | null>> {
    try {
      const cases = await this.repository.findCasesBySupervisor(supervisorId);
      if (!cases || cases.length === 0) {
        return ServiceResponse.failure("No cases found for this supervisor", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Cases found", cases);
    } catch (ex) {
      const errorMessage = `Error finding cases with supervisor id ${supervisorId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while finding cases.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * @description Get supervisors by case ID
   * @param caseId the ID of the case
   * @returns an array of supervisors for the specified case, or null if no supervisors are found
   * @throws {ServiceResponse} if an error occurs while finding supervisors
   */
  async getSupervisorsByCaseId(caseId: string): Promise<ServiceResponse<User[] | null>> {
    try {
      const supervisors = await this.repository.findSupervisorsByCaseId(caseId);
      if (!supervisors) {
        return ServiceResponse.failure("No supervisors found for this case", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Supervisors found", supervisors);
    } catch (ex) {
      const errorMessage = `Error finding supervisors for case with id ${caseId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while finding supervisors.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
export const patientCaseService = new PatientCaseService();
