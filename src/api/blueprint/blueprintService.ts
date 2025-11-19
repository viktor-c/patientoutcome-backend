import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";
import { StatusCodes } from "http-status-codes";
import type { Blueprint, CreateBlueprint, UpdateBlueprint } from "./blueprintModel";
import {
  BlueprintRepository,
  type PaginatedResult,
  type PaginationOptions,
  type SearchOptions,
} from "./blueprintRepository";

export class BlueprintService {
  private blueprintRepository: BlueprintRepository;

  constructor(repository: BlueprintRepository = new BlueprintRepository()) {
    this.blueprintRepository = repository;
  }

  async findAll(options: PaginationOptions = {}): Promise<ServiceResponse<PaginatedResult<Blueprint> | null>> {
    try {
      const result = await this.blueprintRepository.findAllAsync(options);
      return ServiceResponse.success("Blueprints found", result);
    } catch (error) {
      logger.error({ error, options }, "Error in BlueprintService.findAll");
      return ServiceResponse.failure(
        "An error occurred while retrieving blueprints.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findById(id: string): Promise<ServiceResponse<Blueprint | null>> {
    try {
      const blueprint = await this.blueprintRepository.findByIdAsync(id);
      if (!blueprint) {
        return ServiceResponse.failure("Blueprint not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("Blueprint found", blueprint);
    } catch (error) {
      logger.error({ error, id }, "Error in BlueprintService.findById");

      if (
        (error as Error).message?.includes("Invalid ObjectId") ||
        (error as Error).message?.includes("Cast to ObjectId failed")
      ) {
        return ServiceResponse.failure("Invalid ID format", null, StatusCodes.BAD_REQUEST);
      }

      return ServiceResponse.failure(
        "An error occurred while retrieving the blueprint.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async search(options: SearchOptions): Promise<ServiceResponse<PaginatedResult<Blueprint> | null>> {
    try {
      const result = await this.blueprintRepository.searchAsync(options);
      return ServiceResponse.success("Blueprints found", result);
    } catch (error) {
      logger.error({ error, options }, "Error in BlueprintService.search");
      return ServiceResponse.failure(
        "An error occurred while searching blueprints.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createBlueprint(blueprintData: CreateBlueprint, userId: string): Promise<ServiceResponse<Blueprint | null>> {
    try {
      const dataWithCreator = {
        ...blueprintData,
        createdBy: userId,
      };

      const newBlueprint = await this.blueprintRepository.createAsync(dataWithCreator);
      return ServiceResponse.success("Blueprint created successfully", newBlueprint, StatusCodes.CREATED);
    } catch (error) {
      logger.error({ error, blueprintData, userId }, "Error in BlueprintService.createBlueprint");

      // Handle validation errors
      if ((error as any).name === "ValidationError") {
        return ServiceResponse.failure(`Validation error: ${(error as any).message}`, null, StatusCodes.BAD_REQUEST);
      }

      return ServiceResponse.failure(
        "An error occurred while creating the blueprint.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateBlueprint(
    id: string,
    blueprintData: UpdateBlueprint,
    userId: string,
  ): Promise<ServiceResponse<Blueprint | null>> {
    try {
      const dataWithModifier = {
        ...blueprintData,
        modifiedBy: userId,
      };

      const updatedBlueprint = await this.blueprintRepository.updateByIdAsync(id, dataWithModifier);
      if (!updatedBlueprint) {
        return ServiceResponse.failure("Blueprint not found", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success("Blueprint updated successfully", updatedBlueprint);
    } catch (error) {
      logger.error({ error, id, blueprintData, userId }, "Error in BlueprintService.updateBlueprint");

      if (
        (error as Error).message?.includes("Invalid ObjectId") ||
        (error as Error).message?.includes("Cast to ObjectId failed")
      ) {
        return ServiceResponse.failure("Invalid ID format", null, StatusCodes.BAD_REQUEST);
      }

      // Handle validation errors
      if ((error as any).name === "ValidationError") {
        return ServiceResponse.failure(`Validation error: ${(error as any).message}`, null, StatusCodes.BAD_REQUEST);
      }

      return ServiceResponse.failure(
        "An error occurred while updating the blueprint.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteBlueprint(id: string): Promise<ServiceResponse<null>> {
    try {
      const deletedBlueprint = await this.blueprintRepository.deleteByIdAsync(id);
      if (!deletedBlueprint) {
        return ServiceResponse.failure("Blueprint not found", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success("Blueprint deleted successfully", null);
    } catch (error) {
      logger.error({ error, id }, "Error in BlueprintService.deleteBlueprint");

      if (
        (error as Error).message?.includes("Invalid ObjectId") ||
        (error as Error).message?.includes("Cast to ObjectId failed")
      ) {
        return ServiceResponse.failure("Invalid ID format", null, StatusCodes.BAD_REQUEST);
      }

      return ServiceResponse.failure(
        "An error occurred while deleting the blueprint.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const blueprintService = new BlueprintService();
