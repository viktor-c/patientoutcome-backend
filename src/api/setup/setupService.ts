import { type User, userModel } from "@/api/user/userModel";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import type { CreateAdminRequest, SeedRequest, SetupStatus } from "./setupModel";
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

      // Hash the password
      const hashedPassword = await bcrypt.hash(adminData.password, SALT_ROUNDS);

      // Create the admin user
      const newAdmin: Partial<User> = {
        username: adminData.username,
        password: hashedPassword,
        name: adminData.name,
        email: adminData.email,
        department: adminData.department,
        belongsToCenter: adminData.belongsToCenter,
        roles: ["admin"],
        permissions: [],
        lastLogin: new Date().toISOString(),
      };

      const doc = await userModel.create(newAdmin as unknown as Parameters<typeof userModel.create>[0]);
      const createdUser = Array.isArray(doc) ? doc[0] : doc;

      logger.info(
        { adminId: createdUser._id, username: adminData.username },
        "Initial admin user created successfully",
      );

      return ServiceResponse.success("Admin user created successfully", {
        adminUserId: createdUser._id.toString(),
      });
    } catch (error) {
      logger.error({ error }, "Error creating admin user");
      return ServiceResponse.failure("Failed to create admin user", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Seed demo data into the database
   * This should only be used during initial setup
   */
  async seedDemoData(options: SeedRequest): Promise<ServiceResponse<{ seeded: string[]; failed: string[] } | null>> {
    const seeded: string[] = [];
    const failed: string[] = [];

    // Create fresh repository instances
    const blueprintRepository = new BlueprintRepository();
    const patientRepository = new PatientRepository();
    const patientCaseRepository = new PatientCaseRepository();
    const formTemplateRepository = new FormTemplateRepository();
    const formRepository = new FormRepository();
    const surgeryRepository = new SurgeryRepository();
    const clinicalStudyRepository = new ClinicalStudyRepository();
    const codeRepository = new CodeRepository();

    const run = async (name: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
        seeded.push(name);
        logger.info({ repo: name }, `Seeded ${name} successfully`);
      } catch (error) {
        failed.push(name);
        logger.error({ repo: name, error }, `Failed to seed ${name}`);
      }
    };

    try {
      // If seedAll is true, seed everything
      const seedAll = options.seedAll;

      if (seedAll || options.seedUsers) {
        // Use the new method that preserves existing users (like the admin created during setup)
        await run("users", () => userRepository.insertMockUsersPreserveExisting());
      }

      if (seedAll || options.seedBlueprints) {
        await run("blueprints", () => blueprintRepository.createMockData());
        await run("formTemplates", () => formTemplateRepository.createMockDataFormTemplate());
      }

      if (seedAll || options.seedPatients) {
        await run("patients", () => patientRepository.createMockData());
        await run("patientCases", () => patientCaseRepository.createMockPatientCaseData());
        await run("surgeries", () => surgeryRepository.createMockSurgeryData());
      }

      if (seedAll || options.seedForms) {
        await run("consultations", () => consultationRepository.createMockData());
        await run("forms", () => formRepository.createFormMockData());
      }

      if (seedAll) {
        await run("clinicalStudies", () => clinicalStudyRepository.createMockDataClinicalStudies());
        await run("codes", () => codeRepository.createMockDataFormAccessCodes());
      }

      if (failed.length > 0) {
        return ServiceResponse.failure(
          `Some seed operations failed: ${failed.join(", ")}`,
          { seeded, failed },
          StatusCodes.MULTI_STATUS,
        );
      }

      return ServiceResponse.success("Demo data seeded successfully", { seeded, failed });
    } catch (error) {
      logger.error({ error }, "Error seeding demo data");
      return ServiceResponse.failure("Failed to seed demo data", null, StatusCodes.INTERNAL_SERVER_ERROR);
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
