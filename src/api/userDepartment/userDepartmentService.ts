import { StatusCodes } from "http-status-codes";

import type { UserDepartment } from "@/api/userDepartment/userDepartmentModel";
import { UserDepartmentRepository } from "@/api/userDepartment/userDepartmentRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";

/**
 * Service class for UserDepartment operations
 * Uses the UserDepartmentRepository to interact with the database
 */
export class UserDepartmentService {
  private userDepartmentRepository: UserDepartmentRepository;

  constructor(repository: UserDepartmentRepository = new UserDepartmentRepository()) {
    this.userDepartmentRepository = repository;
  }

  // Retrieves all departments from the database
  async findAll(): Promise<ServiceResponse<UserDepartment[] | null>> {
    try {
      const departments = await this.userDepartmentRepository.findAllAsync();
      if (!departments || departments.length === 0) {
        return ServiceResponse.failure("No departments found", null, StatusCodes.NOT_FOUND);
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
  async create(departmentData: Omit<UserDepartment, "_id">): Promise<ServiceResponse<UserDepartment | null>> {
    try {
      // Validate that centers don't have parent centers (prevent circular references)
      if (departmentData.departmentType === "center" && departmentData.center) {
        return ServiceResponse.failure(
          "Centers cannot have a parent center assigned",
          null,
          StatusCodes.BAD_REQUEST,
        );
      }

      // Check if department with same name already exists
      const existingDepartment = await this.userDepartmentRepository.findByNameAsync(departmentData.name);
      if (existingDepartment) {
        return ServiceResponse.failure(
          "Department with this name already exists",
          null,
          StatusCodes.CONFLICT,
        );
      }

      const department = await this.userDepartmentRepository.createAsync(departmentData);
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
  async update(id: string, departmentData: Partial<Omit<UserDepartment, "_id">>): Promise<ServiceResponse<UserDepartment | null>> {
    try {
      // Get existing department first
      const existingDepartment = await this.userDepartmentRepository.findByIdAsync(id);
      if (!existingDepartment) {
        return ServiceResponse.failure("Department not found", null, StatusCodes.NOT_FOUND);
      }

      // Check if department type is being changed
      if (departmentData.departmentType && departmentData.departmentType !== existingDepartment.departmentType) {
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
      if (departmentData.departmentType === "center" && departmentData.center) {
        return ServiceResponse.failure(
          "Centers cannot have a parent center assigned",
          null,
          StatusCodes.BAD_REQUEST,
        );
      }

      // If name is being updated, check for conflicts
      if (departmentData.name) {
        const existingDepartment = await this.userDepartmentRepository.findByNameAsync(departmentData.name);
        if (existingDepartment && existingDepartment._id?.toString() !== id) {
          return ServiceResponse.failure(
            "Department with this name already exists",
            null,
            StatusCodes.CONFLICT,
          );
        }
      }

      const department = await this.userDepartmentRepository.updateAsync(id, departmentData);
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
