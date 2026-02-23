import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";
import { StatusCodes } from "http-status-codes";
import { string } from "zod/v4";
import type { Code } from "./codeModel";
import { CodeRepository } from "./codeRepository";

/** Default code expiry: 4 hours in milliseconds. */
export const DEFAULT_CODE_LIFE_MS = 4 * 60 * 60 * 1000;

/**
 * Parse a human-readable code life string (e.g. "4h", "2d", "3w") to milliseconds.
 * Returns DEFAULT_CODE_LIFE_MS when the string is invalid.
 */
export function parseCodeLifeToMs(codeLife: string): number {
  const match = codeLife.match(/^(\d+)([hdw])$/);
  if (!match) return DEFAULT_CODE_LIFE_MS;
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "h") return amount * 60 * 60 * 1000;
  if (unit === "d") return amount * 24 * 60 * 60 * 1000;
  if (unit === "w") return amount * 7 * 24 * 60 * 60 * 1000;
  return DEFAULT_CODE_LIFE_MS;
}

/**
 * Look up the configured code life for a department and convert it to milliseconds.
 * Falls back to DEFAULT_CODE_LIFE_MS when the department has no setting or is not found.
 */
export async function getDepartmentCodeLifeMs(departmentId: string | undefined): Promise<number> {
  if (!departmentId) return DEFAULT_CODE_LIFE_MS;
  try {
    const { userDepartmentService } = await import("@/api/userDepartment/userDepartmentService.js");
    const result = await userDepartmentService.findById(departmentId);
    if (result.success && result.responseObject?.externalAccessCodeLife) {
      return parseCodeLifeToMs(result.responseObject.externalAccessCodeLife);
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_CODE_LIFE_MS;
}

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

  async activateCode(code: string, consultationId: string, expiresInMs?: number): Promise<ServiceResponse<Code | null>> {
    try {
      const foundCode = await this.codeRepository.activateCode(code, consultationId, expiresInMs);
      if (typeof foundCode === "string") {
        if (foundCode === "Code not found") {
          return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
        } else if (foundCode === "Code already activated") {
          return ServiceResponse.failure("Code already activated", null, StatusCodes.CONFLICT);
        } else if (foundCode === "Consultation not found") {
          return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
        } else if (foundCode === "Consultation already has an active code") {
          return ServiceResponse.failure("Consultation already has an active code", null, StatusCodes.CONFLICT);
        }
      } else if (foundCode === null) {
        return ServiceResponse.failure("Internal code not found", null, StatusCodes.NOT_FOUND);
      }
      if (typeof foundCode === "object" && foundCode !== null) {
        return ServiceResponse.success("Code activated successfully", foundCode);
      }
      return ServiceResponse.failure("Unexpected error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
    } catch (error) {
      logger.error({ error }, "Error activating code");
      return ServiceResponse.failure(
        "An error occurred while activating the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deactivateCode(code: string): Promise<ServiceResponse<Code | null>> {
    try {
      const foundCode = await this.codeRepository.deactivateCode(code);
      if (typeof foundCode === "object" && foundCode !== null) {
        return ServiceResponse.success("Code deactivated successfully", foundCode);
      }
      return ServiceResponse.failure("Unexpected error occurred", null, StatusCodes.INTERNAL_SERVER_ERROR);
    } catch (error) {
      if (typeof error === "string") {
        if (error === "Code not found") {
          return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
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
      logger.error({ error }, "Error adding codes");
      return ServiceResponse.failure("An error occurred while adding codes.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteCode(code: string): Promise<ServiceResponse<null>> {
    try {
      const result = await this.codeRepository.deleteCode(code);
      return ServiceResponse.noContent("Code deleted successfully", null);
    } catch (error) {
      if (typeof error === "string") {
        if (error === "Code not found") return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.failure(
        "An error occurred while deleting the code.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCode(code: string): Promise<ServiceResponse<Code | null>> {
    try {
      const codeDocument = await this.codeRepository.findByCode(code);
      if (!codeDocument) {
        return ServiceResponse.failure("Code not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Code retrieved successfully", codeDocument);
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
  async getCodeById(id: string): Promise<ServiceResponse<Code | null>> {
    try {
      const code = await this.codeRepository.findById(id);
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

  async validateCode(code: string): Promise<ServiceResponse<boolean>> {
    try {
      const codeDocument = await this.codeRepository.findByCode(code);
      if (!codeDocument) {
        return ServiceResponse.failure("Code not found", false, StatusCodes.NOT_FOUND);
      }
      if (codeDocument.activatedOn && codeDocument.expiresOn && codeDocument.expiresOn > new Date()) {
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
