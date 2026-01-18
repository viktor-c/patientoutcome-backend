import { type User, userModel } from "@/api/user/userModel";
import { UserDepartmentRepository } from "@/api/userDepartment/userDepartmentRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import type { CreateAdminRequest, SetupStatus } from "./setupModel";
import { setupRepository } from "./setupRepository";

// Import repository classes to create fresh instances
import { BlueprintRepository } from "@/api/blueprint/blueprintRepository";
import { PatientCaseRepository } from "@/api/case/patientCaseRepository";
import { ClinicalStudyRepository } from "@/api/clinicalStudy/clinicalStudyRepository";
import { CodeRepository } from "@/api/code/codeRepository";
import { consultationRepository } from "@/api/consultation/consultationRepository";
import { FormRepository } from "@/api/form/formRepository";
import { FormTemplateRepository } from "@/api/formtemplate/formTemplateRepository";
import { PatientRepository } from "@/api/patient/patientRepository";
import { SurgeryRepository } from "@/api/surgery/surgeryRepository";
import { userRepository } from "@/api/user/userRepository";

const SALT_ROUNDS = 10;

export class SetupService {
  /**
   * Get the current setup status
   */
  async getSetupStatus(): Promise<ServiceResponse<SetupStatus | null>> {
    try {
      const status = await setupRepository.getSetupStatus();
      return ServiceResponse.success("Setup status retrieved successfully", status);
    } catch (error) {
      logger.error({ error }, "Error getting setup status");
      return ServiceResponse.failure("Failed to get setup status", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Create the initial admin user
   * This only works if no admin user exists yet
   */
  async createAdminUser(adminData: CreateAdminRequest): Promise<ServiceResponse<{ adminUserId: string } | null>> {
    try {
      // Check if setup is still required
      const status = await setupRepository.getSetupStatus();

      if (!status.databaseConnected) {
        return ServiceResponse.failure("Database is not connected", null, StatusCodes.SERVICE_UNAVAILABLE);
      }

      if (status.hasAdminUser) {
        return ServiceResponse.failure(
          "Setup already completed - admin user already exists",
          null,
          StatusCodes.CONFLICT,
        );
      }

      // Check if username already exists
      const existingUser = await userModel.findOne({ username: adminData.username });
      if (existingUser) {
        return ServiceResponse.failure("Username already exists", null, StatusCodes.CONFLICT);
      }

      // Create the department if provided
      let departmentId = adminData.department;
      const userDepartmentRepository = new UserDepartmentRepository();

      // Create the center if provided
      let centerIds: string[] = [];
      let centerId: string | null = null;
      const existingCenter = await userDepartmentRepository.findByNameAsync(adminData.centerName);
      
      if (!existingCenter) {
        // Create new center with the provided data
        const newCenterData = {
          name: adminData.centerName,
          shortName: adminData.centerShortName || adminData.centerName.substring(0, 3).toUpperCase(),
          description: adminData.centerDescription || `${adminData.centerName} medical center`,
          contactEmail: adminData.email, // Use admin email as contact
          contactPhone: "",
          departmentType: "center" as const,
          center: null, // Centers don't have a parent center
        };

        try {
          const createdCenter = await userDepartmentRepository.createAsync(newCenterData);
          if (createdCenter._id) {
            centerId = createdCenter._id.toString();
            centerIds = [centerId];
            logger.info(
              { centerId: createdCenter._id, centerName: adminData.centerName },
              "Center created during setup"
            );
          }
        } catch (centerError) {
          logger.warn(
            { centerError, centerName: adminData.centerName },
            "Failed to create center, user will have no center assignment"
          );
        }
      } else {
        if (existingCenter._id) {
          centerId = existingCenter._id.toString();
          centerIds = [centerId];
        }
      }

      // Now create/update the department with link to center
      const existingDepartment = await userDepartmentRepository.findByNameAsync(adminData.department);
      
      if (!existingDepartment) {
        // Create new department with the provided data
        const newDepartmentData = {
          name: adminData.department,
          shortName: adminData.departmentShortName || adminData.department.substring(0, 3).toUpperCase(),
          description: adminData.departmentDescription || `${adminData.department} department`,
          contactEmail: adminData.email, // Use admin email as contact
          contactPhone: "",
          departmentType: "department" as const,
          center: centerId, // Link department to center
        };

        try {
          const createdDepartment = await userDepartmentRepository.createAsync(newDepartmentData);
          departmentId = createdDepartment._id?.toString() || adminData.department;
          logger.info(
            { departmentId, departmentName: adminData.department, centerId },
            "Department created during setup and linked to center"
          );
        } catch (departmentError) {
          logger.warn(
            { departmentError, departmentName: adminData.department },
            "Failed to create department, will use department name instead"
          );
          // Continue with department name as fallback
        }
      } else {
        departmentId = existingDepartment._id?.toString() || adminData.department;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(adminData.password, SALT_ROUNDS);

      // Create the admin user
      const newAdmin: Partial<User> = {
        username: adminData.username,
        password: hashedPassword,
        name: adminData.name,
        email: adminData.email,
        department: [departmentId],
        belongsToCenter: centerId || undefined,
        roles: ["admin"],
        permissions: [],
        lastLogin: new Date().toISOString(),
      };

      const doc = await userModel.create(newAdmin as unknown as Parameters<typeof userModel.create>[0]);
      const createdUser = Array.isArray(doc) ? doc[0] : doc;

      logger.info(
        { adminId: createdUser._id, username: adminData.username, departmentId, centerIds },
        "Initial admin user created successfully",
      );

      return ServiceResponse.created("Admin user created successfully", {
        adminUserId: createdUser._id.toString(),
      });
    } catch (error) {
      logger.error({ error }, "Error creating admin user");
      return ServiceResponse.failure("Failed to create admin user", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<ServiceResponse<Record<string, number> | null>> {
    try {
      const stats = await setupRepository.getDatabaseStats();
      return ServiceResponse.success("Database statistics retrieved", stats);
    } catch (error) {
      logger.error({ error }, "Error getting database stats");
      return ServiceResponse.failure("Failed to get database statistics", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}

export const setupService = new SetupService();
