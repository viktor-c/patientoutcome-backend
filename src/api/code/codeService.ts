import { ServiceResponse } from "@/common/models/serviceResponse";
import { StatusCodes } from "http-status-codes";
import { string } from "zod/v4";
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

  async activateCode(externalCode: string, consultationId: string): Promise<ServiceResponse<Code | null>> {
    try {
      const code = await this.codeRepository.activateCode(externalCode, consultationId);
      if (typeof code === "string") {
        if (code === "External code not found") {
          return ServiceResponse.failure("External code not found", null, StatusCodes.NOT_FOUND);
        } else if (code === "code already activated") {
          return ServiceResponse.failure("Code already activated", null, StatusCodes.CONFLICT);
        } else if (code === "Consultation not found") {
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
      console.error("Error activating code:", error);
      return ServiceResponse.failure(
        "An error occurred while activating the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deactivateCode(externalCode: string): Promise<ServiceResponse<Code | null>> {
    try {
      const code = await this.codeRepository.deactivateCode(externalCode);
      if (typeof code === "object" && code !== null) {
        return ServiceResponse.success("Code deactivated successfully", code);
      }
      return ServiceResponse.failure("Unexpected error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
    } catch (error) {
      if (typeof error === "string") {
        if (error === "External code not found") {
          return ServiceResponse.failure("External code not found", null, StatusCodes.NOT_FOUND);
        } else if (error === "Code already deactivated") {
          return ServiceResponse.failure("Code already deactivated", null, StatusCodes.CONFLICT);
        }
      } else if (error === null) {
        return ServiceResponse.failure("External code not found", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.failure(
        "An unknown error occurred while deactivating the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addCodes(numberOfCodes: string): Promise<ServiceResponse<Code[] | null>> {
    try {
      const numCodes = Number.parseInt(numberOfCodes, 10);
      // this should not happen, because zod already validates the input
      // but we keep it here just in case
      // to ensure that we do not try to create an invalid number of codes
      if (Number.isNaN(numCodes) || numCodes <= 0 || numCodes > 10) {
        return ServiceResponse.failure("Invalid number of codes specified", null, StatusCodes.BAD_REQUEST);
      }
      const codes = await this.codeRepository.createMultipleCodes(numCodes);
      if (codes.length === 0) {
        return ServiceResponse.failure("No codes were created", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }
      return ServiceResponse.created("Codes created successfully", codes);
    } catch (error) {
      console.error("Error adding codes:", error);
      return ServiceResponse.failure("An error occurred while adding codes.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteCode(externalCode: string): Promise<ServiceResponse<null>> {
    try {
      const result = await this.codeRepository.deleteCode(externalCode);
      return ServiceResponse.noContent("Code deleted successfully", null);
    } catch (error) {
      if (typeof error === "string") {
        if (error === "External code not found")
          return ServiceResponse.failure("External code not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.failure(
        "An error occurred while deleting the code.",
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

  /**
   *
   * @param internalCode
   * @returns
   */
  async getCodeByInternalCode(internalCode: string): Promise<ServiceResponse<Code | null>> {
    try {
      const code = await this.codeRepository.findByInternalCode(internalCode);
      if (!code) {
        return ServiceResponse.failure("Internal code not found", null, StatusCodes.NOT_FOUND);
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

  async getAllCodes(): Promise<ServiceResponse<Code[] | null>> {
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

  async isValidExternalCode(externalCode: string): Promise<ServiceResponse<boolean>> {
    try {
      const code = await this.codeRepository.findByExternalCode(externalCode);
      if (!code) {
        return ServiceResponse.failure("Code not found", false, StatusCodes.NOT_FOUND);
      }
      if (code.activatedOn && code.expiresOn && code.expiresOn > new Date()) {
        return ServiceResponse.success("Code is valid", true);
      } else {
        return ServiceResponse.failure("Code is not active", false, StatusCodes.BAD_REQUEST);
      }
    } catch (error) {
      return ServiceResponse.failure(
        "An error occurred while checking the external code.",
        false,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const codeService = new CodeService();
