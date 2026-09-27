import { StatusCodes } from "http-status-codes";

import { FormTemplateRepository } from "@/api/formtemplate/formTemplateRepository";
import type {
  CreateUserDepartmentInput,
  UpdateUserDepartmentInput,
  UserDepartment,
} from "@/api/userDepartment/userDepartmentModel";
import { UserDepartmentRepository } from "@/api/userDepartment/userDepartmentRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";

/**
 * Service class for UserDepartment operations
 * Uses the UserDepartmentRepository to interact with the database
 */
export class UserDepartmentService {
  private userDepartmentRepository: UserDepartmentRepository;
  private formTemplateRepository: FormTemplateRepository;

  constructor(
    repository: UserDepartmentRepository = new UserDepartmentRepository(),
    formTemplateRepository: FormTemplateRepository = new FormTemplateRepository(),
  ) {
    this.userDepartmentRepository = repository;
    this.formTemplateRepository = formTemplateRepository;
  }

  private async ensureDepartmentTemplateMapping(departmentId: string): Promise<void> {
    const existingMapping = await this.formTemplateRepository.getDepartmentMapping(departmentId);
    if (existingMapping) {
      return;
    }

    const allTemplates = await this.formTemplateRepository.getAllTemplates();
    const formTemplateIds = allTemplates
      .map((template) => template._id?.toString())
      .filter((templateId): templateId is string => typeof templateId === "string" && templateId.length > 0);

    await this.formTemplateRepository.setDepartmentMapping(departmentId, formTemplateIds);
  }

  private toPersistableDepartmentData(
    departmentData: Omit<UserDepartment, "_id"> | Partial<Omit<UserDepartment, "_id">>,
  ): Omit<UserDepartment, "_id"> | Partial<Omit<UserDepartment, "_id">> {
    const { hasChildDepartments: _hasChildDepartments, ...persistableData } = departmentData;
    return persistableData;
  }

  private async syncDepartmentTemplateMapping(departmentId: string, formTemplateIds?: string[]): Promise<void> {
    if (Array.isArray(formTemplateIds)) {
      await this.formTemplateRepository.setDepartmentMapping(departmentId, formTemplateIds);
      return;
    }

    await this.ensureDepartmentTemplateMapping(departmentId);
  }

  private async rollbackDepartmentTemplateMapping(
    departmentId: string,
    previousMapping: Awaited<ReturnType<FormTemplateRepository["getDepartmentMapping"]>>,
  ): Promise<void> {
    if (previousMapping) {
      await this.formTemplateRepository.setDepartmentMapping(
        departmentId,
        previousMapping.formTemplateIds.map((templateId) => templateId.toString()),
      );
      return;
    }

    await this.formTemplateRepository.deleteDepartmentMapping(departmentId);
  }

  // Retrieves all departments from the database
  async findAll(): Promise<ServiceResponse<UserDepartment[] | null>> {
    try {
      const departments = await this.userDepartmentRepository.findAllAsync();
      if (!departments || departments.length === 0) {
        return ServiceResponse.success<UserDepartment[]>("No departments found", []);
      }

      // Enrich departments with hasChildDepartments info
      const enrichedDepartments = await Promise.all(
        departments.map(async (dept) => {
          const hasChildDepartments = dept.departmentType === "center"
            ? await this.userDepartmentRepository.countChildDepartments(dept._id?.toString() || "") > 0
            : false;
          return {
            ...dept,
            hasChildDepartments,
          };
        })
      );

      return ServiceResponse.success<UserDepartment[]>("Departments found", enrichedDepartments);
    } catch (ex) {
      const errorMessage = `Error finding all departments: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving departments.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Retrieves a single department by ID
  async findById(id: string): Promise<ServiceResponse<UserDepartment | null>> {
    try {
      const department = await this.userDepartmentRepository.findByIdAsync(id);
      if (!department) {
        return ServiceResponse.failure("Department not found", null, StatusCodes.NOT_FOUND);
      }

      // Add hasChildDepartments info
      const hasChildDepartments = department.departmentType === "center"
        ? await this.userDepartmentRepository.countChildDepartments(department._id?.toString() || "") > 0
        : false;

      const enrichedDepartment = {
        ...department,
        hasChildDepartments,
      };

      return ServiceResponse.success<UserDepartment>("Department found", enrichedDepartment);
    } catch (ex) {
      const errorMessage = `Error finding department by id: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving department.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get user's own department
  async getUserDepartment(departmentId: string): Promise<ServiceResponse<UserDepartment | null>> {
    try {
      const department = await this.userDepartmentRepository.findByIdAsync(departmentId);
      if (!department) {
        return ServiceResponse.failure("Department not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<UserDepartment>("Department found", department);
    } catch (ex) {
      const errorMessage = `Error finding user's department: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving department.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Creates a new department
  async create(departmentData: CreateUserDepartmentInput): Promise<ServiceResponse<UserDepartment | null>> {
    try {
      const { formTemplateIds, ...departmentFields } = departmentData;
      const persistableDepartmentData = this.toPersistableDepartmentData(departmentFields) as Omit<UserDepartment, "_id">;

      // Validate that centers don't have parent centers (prevent circular references)
      if (persistableDepartmentData.departmentType === "center" && persistableDepartmentData.center) {
        return ServiceResponse.failure(
          "Centers cannot have a parent center assigned",
          null,
          StatusCodes.BAD_REQUEST,
        );
      }

      // Check if department with same name already exists
      const existingDepartment = await this.userDepartmentRepository.findByNameAsync(persistableDepartmentData.name);
      if (existingDepartment) {
        return ServiceResponse.failure(
          "Department with this name already exists",
          null,
          StatusCodes.CONFLICT,
        );
      }

      const department = await this.userDepartmentRepository.createAsync(persistableDepartmentData);

      const departmentId = department._id?.toString();
      if (!departmentId) {
        throw new Error("Created department is missing an id");
      }

      try {
        await this.syncDepartmentTemplateMapping(departmentId, formTemplateIds);
      } catch (mappingError) {
        try {
          await this.userDepartmentRepository.deleteAsync(departmentId);
        } catch (rollbackError) {
          logger.error({ rollbackError, departmentId }, "Failed to rollback department creation after mapping initialization error");
        }

        throw mappingError;
      }

      return ServiceResponse.success<UserDepartment>("Department created successfully", department, StatusCodes.CREATED);
    } catch (ex) {
      const errorMessage = `Error creating department: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while creating department.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Updates an existing department
  async update(id: string, departmentData: UpdateUserDepartmentInput): Promise<ServiceResponse<UserDepartment | null>> {
    try {
      const { formTemplateIds, ...departmentFields } = departmentData;
      const persistableDepartmentData = this.toPersistableDepartmentData(departmentFields) as Partial<Omit<UserDepartment, "_id">>;

      // Get existing department first
      const existingDepartment = await this.userDepartmentRepository.findByIdAsync(id);
      if (!existingDepartment) {
        return ServiceResponse.failure("Department not found", null, StatusCodes.NOT_FOUND);
      }

      // Check if department type is being changed
      if (persistableDepartmentData.departmentType && persistableDepartmentData.departmentType !== existingDepartment.departmentType) {
        // Check if current type is "center" and has child departments
        if (existingDepartment.departmentType === "center") {
          const childCount = await this.userDepartmentRepository.countChildDepartments(id);
          if (childCount > 0) {
            return ServiceResponse.failure(
              "Cannot change department type. This center has child departments assigned to it.",
              null,
              StatusCodes.BAD_REQUEST,
            );
          }
        }
      }

      // Validate that centers don't have parent centers (prevent circular references)
      if (persistableDepartmentData.departmentType === "center" && persistableDepartmentData.center) {
        return ServiceResponse.failure(
          "Centers cannot have a parent center assigned",
          null,
          StatusCodes.BAD_REQUEST,
        );
      }

      // If name is being updated, check for conflicts
      if (persistableDepartmentData.name) {
        const existingDepartment = await this.userDepartmentRepository.findByNameAsync(persistableDepartmentData.name);
        if (existingDepartment && existingDepartment._id?.toString() !== id) {
          return ServiceResponse.failure(
            "Department with this name already exists",
            null,
            StatusCodes.CONFLICT,
          );
        }
      }

      const previousMapping = await this.formTemplateRepository.getDepartmentMapping(id);
      const department = await this.userDepartmentRepository.updateAsync(id, persistableDepartmentData);
      if (!department) {
        return ServiceResponse.failure("Department not found", null, StatusCodes.NOT_FOUND);
      }

      try {
        await this.syncDepartmentTemplateMapping(id, formTemplateIds);
      } catch (mappingError) {
        try {
          await this.userDepartmentRepository.updateAsync(
            id,
            this.toPersistableDepartmentData(existingDepartment) as Partial<Omit<UserDepartment, "_id">>,
          );
          await this.rollbackDepartmentTemplateMapping(id, previousMapping);
        } catch (rollbackError) {
          logger.error({ rollbackError, departmentId: id }, "Failed to rollback department update after mapping sync error");
        }

        throw mappingError;
      }

      // Add hasChildDepartments info
      const hasChildDepartments = department.departmentType === "center"
        ? await this.userDepartmentRepository.countChildDepartments(department._id?.toString() || "") > 0
        : false;

      const enrichedDepartment = {
        ...department,
        hasChildDepartments,
      };

      return ServiceResponse.success<UserDepartment>("Department updated successfully", enrichedDepartment);
    } catch (ex) {
      const errorMessage = `Error updating department: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while updating department.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update the external access code life setting for a department.
   * Only the user's own departments can be updated (enforced at controller level).
   */
  async updateCodeLifeSetting(
    id: string,
    externalAccessCodeLife: string,
  ): Promise<ServiceResponse<UserDepartment | null>> {
    try {
      const department = await this.userDepartmentRepository.findByIdAsync(id);
      if (!department) {
        return ServiceResponse.failure("Department not found", null, StatusCodes.NOT_FOUND);
      }
      const updated = await this.userDepartmentRepository.updateAsync(id, { externalAccessCodeLife });
      if (!updated) {
        return ServiceResponse.failure("Department not found after update", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<UserDepartment>("Code life setting updated", updated);
    } catch (ex) {
      const errorMessage = `Error updating code life setting: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while updating the code life setting.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateConsultationAccessWindow(
    id: string,
    consultationAccessDaysBefore: number,
    consultationAccessDaysAfter: number,
  ): Promise<ServiceResponse<UserDepartment | null>> {
    try {
      const department = await this.userDepartmentRepository.findByIdAsync(id);
      if (!department) {
        return ServiceResponse.failure("Department not found", null, StatusCodes.NOT_FOUND);
      }

      const updated = await this.userDepartmentRepository.updateAsync(id, {
        consultationAccessDaysBefore,
        consultationAccessDaysAfter,
      });
      if (!updated) {
        return ServiceResponse.failure("Department not found after update", null, StatusCodes.NOT_FOUND);
      }

      return ServiceResponse.success<UserDepartment>("Consultation access window updated", updated);
    } catch (ex) {
      const errorMessage = `Error updating consultation access window: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while updating the consultation access window.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update the case code validity setting for a department.
   * Only the user's own departments can be updated (enforced at controller level).
   */
  async updateCaseCodeValiditySetting(
    id: string,
    patientCaseAccessCodeValidUntil: string,
  ): Promise<ServiceResponse<UserDepartment | null>> {
    try {
      const department = await this.userDepartmentRepository.findByIdAsync(id);
      if (!department) {
        return ServiceResponse.failure("Department not found", null, StatusCodes.NOT_FOUND);
      }
      const updated = await this.userDepartmentRepository.updateAsync(id, { patientCaseAccessCodeValidUntil });
      if (!updated) {
        return ServiceResponse.failure("Department not found after update", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<UserDepartment>("Case code validity setting updated", updated);
    } catch (ex) {
      const errorMessage = `Error updating case code validity setting: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while updating the case code validity setting.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Deletes a department
  async delete(id: string): Promise<ServiceResponse<null>> {
    try {
      // Check if department exists
      const department = await this.userDepartmentRepository.findByIdAsync(id);
      if (!department) {
        return ServiceResponse.failure("Department not found", null, StatusCodes.NOT_FOUND);
      }

      // Check if any users are assigned to this department (by ID)
      const { userModel } = await import("../user/userModel.js");
      const usersInDepartment = await userModel.find({ department: id }).lean();

      if (usersInDepartment && usersInDepartment.length > 0) {
        return ServiceResponse.failure(
          "Cannot delete department. Users are still assigned to this department.",
          null,
          StatusCodes.CONFLICT,
        );
      }

      const deleted = await this.userDepartmentRepository.deleteAsync(id);
      if (!deleted) {
        return ServiceResponse.failure("Failed to delete department", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }

      try {
        await this.formTemplateRepository.deleteDepartmentMapping(id);
      } catch (mappingError) {
        logger.error({ mappingError, departmentId: id }, "Department deleted but failed to remove department-formtemplate mapping");
      }

      return ServiceResponse.success("Department deleted successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting department: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while deleting department.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

// Export a singleton instance
export const userDepartmentService = new UserDepartmentService();
