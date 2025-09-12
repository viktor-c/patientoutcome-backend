import type { User } from "@/api/user/userModel";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import type { Surgery } from "./surgeryModel";
import { SurgeryRepository } from "./surgeryRepository";

/**
 * This service class contains methods for handling surgeries.
 * The SurgeryService class is a service layer that interacts with a repository to perform CRUD operations on surgeries.
 */
export class SurgeryService {
  private repository: SurgeryRepository;

  constructor() {
    this.repository = new SurgeryRepository();
  }

  /**
   * @description Get all surgeries
   * @returns an array of surgeries, or null if no surgeries are found
   * @throws {ServiceResponse} if an error occurs while finding surgeries
   */
  async getAllSurgeries(): Promise<ServiceResponse<Surgery[] | null>> {
    try {
      const surgeries = await this.repository.getAllSurgeries();
      if (!surgeries || surgeries.length === 0) {
        return ServiceResponse.failure("No surgeries found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgeries found", surgeries);
    } catch (ex) {
      const errorMessage = `Error finding all surgeries: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving surgeries.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Get a surgery by ID
   * @param surgeryId the ID of the surgery to find
   * @returns the surgery, or null if not found
   * @throws {ServiceResponse} if an error occurs while finding the surgery
   */
  async getSurgeryById(surgeryId: string): Promise<ServiceResponse<Surgery | null>> {
    try {
      const surgery = await this.repository.getSurgeryById(surgeryId);
      if (!surgery) {
        return ServiceResponse.failure("Surgery not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgery found", surgery);
    } catch (ex) {
      if ((ex as Error).message.includes("Cast to ObjectId failed for value")) {
        logger.error(`Invalid ID: ${surgeryId}`);
        return ServiceResponse.failure("Invalid ID", null, StatusCodes.BAD_REQUEST);
      }
      const errorMessage = `Error finding surgery with id ${surgeryId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while finding surgery.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Get surgeries by patient case ID
   * @param patientCaseId the ID of the patient case
   * @returns an array of surgeries for the specified patient case, or null if no surgeries are found
   * @throws {ServiceResponse} if an error occurs while finding surgeries
   */
  async getSurgeriesByPatientCaseId(patientCaseId: string): Promise<ServiceResponse<Surgery[] | null>> {
    try {
      const surgeries = await this.repository.getSurgeriesByPatientCaseId(patientCaseId);
      if (!surgeries || surgeries.length === 0) {
        return ServiceResponse.failure("No surgeries found for this patient case", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgeries found", surgeries);
    } catch (ex) {
      const errorMessage = `Error finding surgeries for patient case ${patientCaseId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving surgeries.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Create a new surgery
   * @param surgeryData the data for the new surgery
   * @returns the created surgery, or null if not found
   * @throws {ServiceResponse} if an error occurs while creating the surgery
   */
  async createSurgery(surgeryData: Partial<Surgery>): Promise<ServiceResponse<Surgery | null>> {
    try {
      const newSurgery = await this.repository.createSurgery(surgeryData);
      return ServiceResponse.created("Surgery created successfully", newSurgery);
    } catch (ex) {
      const errorMessage = `Error creating surgery: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while creating surgery.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Update a surgery by ID
   * @param surgeryId the ID of the surgery to update
   * @param surgeryData the data to update in the surgery
   * @returns the updated surgery, or null if not found
   * @throws {ServiceResponse} if an error occurs while updating the surgery
   */
  async updateSurgeryById(surgeryId: string, surgeryData: Partial<Surgery>): Promise<ServiceResponse<Surgery | null>> {
    try {
      const updatedSurgery = await this.repository.updateSurgeryById(surgeryId, surgeryData);
      if (!updatedSurgery) {
        return ServiceResponse.failure("Surgery not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgery updated successfully", updatedSurgery);
    } catch (ex) {
      const errorMessage = `Error updating surgery with id ${surgeryId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while updating surgery.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Delete a surgery by ID
   * @param surgeryId the ID of the surgery to delete
   * @returns a success message if the surgery is deleted, or an error message if not found
   * @throws {ServiceResponse} if an error occurs while deleting the surgery
   */
  async deleteSurgeryById(surgeryId: string): Promise<ServiceResponse<null>> {
    try {
      const deleted = await this.repository.deleteSurgeryById(surgeryId);
      if (!deleted) {
        return ServiceResponse.failure("Surgery not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.noContent("Surgery deleted successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting surgery with id ${surgeryId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      if ((ex as Error).message.includes("Cast to ObjectId failed for value")) {
        logger.error(`Invalid ID: ${surgeryId}`);
        return ServiceResponse.failure("Invalid ID", null, StatusCodes.BAD_REQUEST);
      }
      return ServiceResponse.failure(
        "An error occurred while deleting surgery.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Search surgeries by external ID
   * @param searchQuery the query to search for
   * @returns an array of surgeries matching the search query, or null if no surgeries are found
   * @throws {ServiceResponse} if an error occurs while searching surgeries
   */
  async searchSurgeriesByExternalId(searchQuery: string): Promise<ServiceResponse<Surgery[] | null>> {
    try {
      const surgeries = await this.repository.searchSurgeriesByExternalId(searchQuery);
      if (!surgeries || !surgeries.length) {
        return ServiceResponse.failure("No surgeries match query", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgeries found", surgeries);
    } catch (ex) {
      const errorMessage = `Error searching for surgeries: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while searching for surgeries.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Get surgeries by diagnosis
   * @param diagnosis diagnosis to search for
   * @returns an array of surgeries with the specified diagnosis, or null if no surgeries are found
   * @throws {ServiceResponse} if an error occurs while finding surgeries
   */
  async getSurgeriesByDiagnosis(diagnosis: string): Promise<ServiceResponse<Surgery[] | null>> {
    try {
      const surgeries = await this.repository.findSurgeriesByDiagnosis(diagnosis);
      if (!surgeries || surgeries.length === 0) {
        return ServiceResponse.failure("No surgeries found for this diagnosis", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgeries found", surgeries);
    } catch (ex) {
      const errorMessage = `Error finding surgeries with diagnosis ${diagnosis}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while finding surgeries.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Get surgeries by diagnosis ICD10
   * @param diagnosisICD10 diagnosis ICD10 to search for
   * @returns an array of surgeries with the specified diagnosis ICD10, or null if no surgeries are found
   * @throws {ServiceResponse} if an error occurs while finding surgeries
   */
  async getSurgeriesByDiagnosisICD10(diagnosisICD10: string): Promise<ServiceResponse<Surgery[] | null>> {
    try {
      const surgeries = await this.repository.findSurgeriesByDiagnosisICD10(diagnosisICD10);
      if (!surgeries || surgeries.length === 0) {
        return ServiceResponse.failure("No surgeries found for this diagnosis ICD10", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgeries found", surgeries);
    } catch (ex) {
      const errorMessage = `Error finding surgeries with diagnosis ICD10 ${diagnosisICD10}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while finding surgeries.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Get surgeries by surgeon
   * @param surgeonId surgeon ID to search for
   * @returns an array of surgeries with the specified surgeon, or null if no surgeries are found
   * @throws {ServiceResponse} if an error occurs while finding surgeries
   */
  async getSurgeriesBySurgeon(surgeonId: string): Promise<ServiceResponse<Surgery[] | null>> {
    try {
      const surgeries = await this.repository.findSurgeriesBySurgeon(surgeonId);
      if (!surgeries || surgeries.length === 0) {
        return ServiceResponse.failure("No surgeries found for this surgeon", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgeries found", surgeries);
    } catch (ex) {
      const errorMessage = `Error finding surgeries with surgeon id ${surgeonId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while finding surgeries.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Get surgeons by surgery ID
   * @param surgeryId the ID of the surgery
   * @returns an array of surgeons for the specified surgery, or null if no surgeons are found
   * @throws {ServiceResponse} if an error occurs while finding surgeons
   */
  async getSurgeonsBySurgeryId(surgeryId: string): Promise<ServiceResponse<User[] | null>> {
    try {
      const surgeons = await this.repository.findSurgeonsBySurgeryId(surgeryId);
      if (!surgeons) {
        return ServiceResponse.failure("No surgeons found for this surgery", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgeons found", surgeons);
    } catch (ex) {
      const errorMessage = `Error finding surgeons for surgery with id ${surgeryId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while finding surgeons.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Get notes by surgery ID
   * @param surgeryId the ID of the surgery
   * @returns an array of notes for the specified surgery, or null if no notes are found
   * @throws {ServiceResponse} if an error occurs while finding notes
   */
  async getNotesBySurgeryId(surgeryId: string): Promise<ServiceResponse<Surgery["additionalData"] | null>> {
    try {
      const notes = await this.repository.findNotesBySurgeryId(surgeryId);
      return ServiceResponse.success("Notes found", notes);
    } catch (ex) {
      const errorMessage = `Error finding notes for surgery with id ${surgeryId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while finding notes.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * @description Create a new surgery note
   * @param surgeryId the ID of the surgery
   * @param note the note to add
   * @returns the updated surgery with the new note, or an error message if not found
   * @throws {ServiceResponse} if an error occurs while adding the note
   */
  async createSurgeryNote(surgeryId: string, note: any): Promise<ServiceResponse<Surgery | null>> {
    try {
      const updatedSurgery = await this.repository.createSurgeryNote(surgeryId, note);
      if (!updatedSurgery) {
        return ServiceResponse.failure("Surgery not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.created("Note added successfully", updatedSurgery);
    } catch (ex) {
      const errorMessage = `Error adding note to surgery with id ${surgeryId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while adding note.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * @description Delete a surgery note by ID
   * @param surgeryId the ID of the surgery
   * @param noteId the ID of the note to delete
   * @returns a success message if the note is deleted, or an error message if not found
   * @throws {ServiceResponse} if an error occurs while deleting the note
   */
  async deleteSurgeryNoteById(surgeryId: string, noteId: string): Promise<ServiceResponse<Surgery | null>> {
    try {
      const deletedSurgery = await this.repository.deleteSurgeryNoteById(surgeryId, noteId);
      if (!deletedSurgery) {
        return ServiceResponse.failure("Surgery not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.noContent("Note deleted successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting note from surgery with id ${surgeryId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while deleting note.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * @description Get surgeries by date range
   * @param startDate start date for the range
   * @param endDate end date for the range
   * @returns an array of surgeries within the specified date range, or null if no surgeries are found
   * @throws {ServiceResponse} if an error occurs while finding surgeries
   */
  async getSurgeriesByDateRange(startDate: Date, endDate: Date): Promise<ServiceResponse<Surgery[] | null>> {
    try {
      const surgeries = await this.repository.findSurgeriesByDateRange(startDate, endDate);
      if (!surgeries || surgeries.length === 0) {
        return ServiceResponse.failure("No surgeries found for this date range", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgeries found", surgeries);
    } catch (ex) {
      const errorMessage = `Error finding surgeries for date range ${startDate} to ${endDate}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while finding surgeries.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Get surgeries by side
   * @param side the side to search for
   * @returns an array of surgeries with the specified side, or null if no surgeries are found
   * @throws {ServiceResponse} if an error occurs while finding surgeries
   */
  async getSurgeriesBySide(side: "left" | "right" | "none"): Promise<ServiceResponse<Surgery[] | null>> {
    try {
      const surgeries = await this.repository.findSurgeriesBySide(side);
      if (!surgeries || surgeries.length === 0) {
        return ServiceResponse.failure("No surgeries found for this side", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgeries found", surgeries);
    } catch (ex) {
      const errorMessage = `Error finding surgeries with side ${side}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while finding surgeries.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * @description Get surgeries by therapy
   * @param therapy the therapy to search for
   * @returns an array of surgeries with the specified therapy, or null if no surgeries are found
   * @throws {ServiceResponse} if an error occurs while finding surgeries
   */
  async getSurgeriesByTherapy(therapy: string): Promise<ServiceResponse<Surgery[] | null>> {
    try {
      const surgeries = await this.repository.findSurgeriesByTherapy(therapy);
      if (!surgeries || surgeries.length === 0) {
        return ServiceResponse.failure("No surgeries found for this therapy", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Surgeries found", surgeries);
    } catch (ex) {
      const errorMessage = `Error finding surgeries with therapy ${therapy}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while finding surgeries.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const surgeryService = new SurgeryService();
