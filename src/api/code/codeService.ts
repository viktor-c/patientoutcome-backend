import { ServiceResponse } from "@/common/models/serviceResponse";
import { StatusCodes } from "http-status-codes";
import type { Code } from "./codeModel";
import { CodeRepository } from "./codeRepository";

class CodeService {
  private codeRepository: CodeRepository;
  constructor(repository: CodeRepository = new CodeRepository()) {
    this.codeRepository = repository;
  }
  async findAll(): Promise<ServiceResponse<Code[] | null>> {
    try {
      const codes = await this.codeRepository.findAll();
      return ServiceResponse.success("Codes found", codes);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving codes.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllAvailableCodes(): Promise<ServiceResponse<Code[]>> {
    try {
      const codes = await this.codeRepository.getAllAvailableCodes();
      return ServiceResponse.success("Available codes retrieved successfully", codes);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving available codes.",
        [],
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async activateCode(internalCode: string, consultationId: string): Promise<ServiceResponse<Code | null>> {
    try {
      const code = await this.codeRepository.activateCode(internalCode, consultationId);
      if (typeof code === "string") {
        if (code === "Internal code not found") {
          return ServiceResponse.failure("Internal code not found", null, StatusCodes.NOT_FOUND);
        } else if (code === "code already activated") {
          return ServiceResponse.failure("Code already activated", null, StatusCodes.CONFLICT);
        } else if (code === "consultation not found") {
          return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
        } else if (code === "Consultation already has an active code") {
          return ServiceResponse.failure("Consultation already has an active code", null, StatusCodes.CONFLICT);
        }
      } else if (code === null) {
        return ServiceResponse.failure("Internal code not found", null, StatusCodes.NOT_FOUND);
      }
      if (typeof code === "object" && code !== null) {
        return ServiceResponse.success("Code activated successfully", code);
      }
      return ServiceResponse.failure("Unexpected error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while activating the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deactivateCode(internalCode: string): Promise<ServiceResponse<Code | null>> {
    try {
      const code = await this.codeRepository.deactivateCode(internalCode);
      if (!code) {
        return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Code deactivated successfully", code);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while deactivating the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addCode(code: Code): Promise<ServiceResponse<Code | null>> {
    try {
      const newCode = await this.codeRepository.saveCode(code);
      return ServiceResponse.created("Code added successfully", newCode);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while adding the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteCode(internalCode: string): Promise<ServiceResponse<null>> {
    try {
      const result = await this.codeRepository.deleteCode(internalCode);
      if (!result) {
        return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.noContent("Code deleted successfully", null);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while deleting the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCodeById(internalCode: string): Promise<ServiceResponse<Code | null>> {
    try {
      const code = await this.codeRepository.findByInternalCode(internalCode);
      if (!code) {
        return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Code retrieved successfully", code);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getCodeByExternalCode(externalCode: string): Promise<ServiceResponse<Code | null>> {
    try {
      const code = await this.codeRepository.findByExternalCode(externalCode);
      if (!code) {
        return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Code retrieved successfully", code);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getAllCodes(): Promise<ServiceResponse<Code[]>> {
    try {
      const codes = await this.codeRepository.findAll();
      return ServiceResponse.success("Codes retrieved successfully", codes);
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while retrieving the codes.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const codeService = new CodeService();
