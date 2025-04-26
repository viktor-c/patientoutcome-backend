import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { StatusCodes } from "http-status-codes";
import type { PatientCaseConsultation } from "./consultationModel";
import { ConsultationRepository } from "./consultationRepository";

export class ConsultationService {
  private consultationRepository: ConsultationRepository;

  constructor() {
    this.consultationRepository = new ConsultationRepository();
  }

  async createConsultation(data: PatientCaseConsultation): Promise<ServiceResponse<PatientCaseConsultation>> {
    try {
      const newConsultation = await this.consultationRepository.createConsultation(data);
      return ServiceResponse.created("Consultation created successfully", newConsultation);
    } catch (ex) {
      const errorMessage = `Error creating consultation: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while creating consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getConsultationById(consultationId: string): Promise<ServiceResponse<PatientCaseConsultation | null>> {
    try {
      const consultation = await this.consultationRepository.getConsultationById(consultationId);
      if (!consultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Consultation found", consultation);
    } catch (ex) {
      const errorMessage = `Error fetching consultation: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while fetching consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateConsultation(
    consultationId: string,
    data: Partial<PatientCaseConsultation>,
  ): Promise<ServiceResponse<PatientCaseConsultation | null>> {
    try {
      const updatedConsultation = await this.consultationRepository.updateConsultation(consultationId, data);
      return ServiceResponse.success("Consultation updated successfully", updatedConsultation);
    } catch (ex) {
      const errorMessage = `Error updating consultation: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while updating consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteConsultation(consultationId: string): Promise<ServiceResponse<null>> {
    try {
      const deleted = await this.consultationRepository.deleteConsultation(consultationId);
      if (!deleted) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.noContent("Consultation deleted successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting consultation: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while deleting consultation.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllConsultations(patientId: string, caseId: string): Promise<ServiceResponse<PatientCaseConsultation[]>> {
    try {
      const consultations = await this.consultationRepository.getAllConsultations(patientId, caseId);
      return ServiceResponse.success("Consultations retrieved successfully", consultations);
    } catch (ex) {
      const errorMessage = `Error fetching consultations: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while fetching consultations.",
        [],
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  compareConsultations(consultation1: PatientCaseConsultation, consultation2: PatientCaseConsultation): boolean {
    return JSON.stringify(consultation1) === JSON.stringify(consultation2);
  }
}

export const consultationService = new ConsultationService();
