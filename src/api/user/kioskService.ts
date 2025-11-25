import { StatusCodes } from "http-status-codes";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/common/utils/logger";
import { hashPassword } from "@/utils/hashUtil";
import { type User, type UserNoPassword, userModel } from "./userModel";
import { UserRepository } from "./userRepository";
import { consultationService } from "@/api/consultation/consultationService";
import { FormTemplateModel } from "@/api/formtemplate/formTemplateModel";
import type { CreateConsultation } from "@/api/consultation/consultationModel";
import { kioskService as kioskServiceApi} from "@/api/kiosk/kioskService";
/**
 * Service class for Kiosk-specific operations
 * Handles passwordless authentication and automatic consultation setup
 */
export class KioskService {
  private userRepository: UserRepository;

  constructor(repository: UserRepository = new UserRepository()) {
    this.userRepository = repository;
  }

  /**
   * Generate a random 2-character string for unique kiosk username
   */
  private generateRandomSuffix(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  /**
   * Calculate postoperative weeks based on user sequence number
   * @param userNumber - The n-th kiosk user (1-indexed)
   * @returns Number of postoperative weeks
   */
  private calculatePostopWeeks(userNumber: number): number {
    const weekArray = [2, 4, 6, 12];
    
    // First 4 users get values from the array [2, 4, 6, 12]
    if (userNumber <= 4) {
      return weekArray[userNumber - 1];
    }
    
    // After 4th user: continue in 4-week increments (1 month = 4 weeks)
    // User 5 -> 16 weeks (4 months), User 6 -> 20 weeks (5 months), etc.
    return 12 + (userNumber - 4) * 4;
  }

  /**
   * Generate a random reason for consultation
   */
  private getRandomConsultationReason(): ("planned" | "unplanned" | "emergency" | "pain" | "followup")[] {
    const reasons: ("planned" | "unplanned" | "emergency" | "pain" | "followup")[] = [
      "planned",
      "unplanned",
      "emergency",
      "pain",
      "followup",
    ];
    return [reasons[Math.floor(Math.random() * reasons.length)]];
  }

  /**
   * Generate a random date within the past 30 days
   */
  private getRandomPastDate(): string {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const randomDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return randomDate.toISOString();
  }

  /**
   * Calculate consultation date based on surgery date and postop weeks
   * @param surgeryDate - Date of the surgery
   * @param weeksAfterSurgery - Number of weeks after surgery for the consultation
   * @returns Date object for the consultation, adjusted to Monday or Wednesday
   */
  private calculateConsultationDate(surgeryDate: Date, weeksAfterSurgery: number): Date {
    const consultationDate = new Date(surgeryDate);
    consultationDate.setDate(consultationDate.getDate() + weeksAfterSurgery * 7);

    // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = consultationDate.getDay();

    // Adjust to Monday (1) or Wednesday (3)
    if (dayOfWeek === 0 || dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6) {
      // Sunday, Tuesday, Thursday, Friday, Saturday -> move to Monday
      const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
      consultationDate.setDate(consultationDate.getDate() + daysToAdd);
    } else if (dayOfWeek === 1) {
      // Already Monday, keep it
    } else {
      // Already Wednesday (3), keep it
    }

    return consultationDate;
  }

  /**
   * Generate a random German description for the consultation note
   */
  private getRandomGermanNote(): string {
    const notes = [
      "Routinekontrolle durchgeführt. Patient in gutem Zustand.",
      "Nachuntersuchung nach Operation. Heilungsverlauf positiv.",
      "Akute Schmerzen im Fußbereich. Weitere Untersuchung erforderlich.",
      "Präoperative Untersuchung abgeschlossen. OP-Termin vereinbart.",
      "Postoperative Kontrolle. Keine Komplikationen festgestellt.",
      "Schmerztherapie angepasst. Patient zeigt Verbesserung.",
      "Diagnostik abgeschlossen. Behandlungsplan erstellt.",
      "Verlaufskontrolle nach Physiotherapie. Gute Fortschritte.",
    ];
    return notes[Math.floor(Math.random() * notes.length)];
  }

  /**
   * Kiosk login: passwordless authentication with automatic consultation creation
   * @param username - Username starting with "kiosk" prefix
   */
  async kioskLogin(username: string): Promise<ServiceResponse<UserNoPassword | null>> {
    try {
      // Validate username starts with "kiosk"
      if (!username.startsWith("kiosk")) {
        return ServiceResponse.failure("Username must start with 'kiosk' prefix", null, StatusCodes.BAD_REQUEST);
      }

      // Check if user already exists
      let kioskUser = await this.userRepository.getCompleteUserForLogin(username);

      // If user exists, generate unique username with random suffix
      if (kioskUser) {
        let attempts = 0;
        const maxAttempts = 10;
        let uniqueUsername = username;

        while (attempts < maxAttempts) {
          const suffix = this.generateRandomSuffix();
          uniqueUsername = `${username}${suffix}`;

          const existingUser = await this.userRepository.getCompleteUserForLogin(uniqueUsername);
          if (!existingUser) {
            break;
          }
          attempts++;
        }

        if (attempts === maxAttempts) {
          return ServiceResponse.failure(
            "Could not generate unique username",
            null,
            StatusCodes.INTERNAL_SERVER_ERROR,
          );
        }

        username = uniqueUsername;
      }

      // Count existing kiosk users to determine postopWeek
      // Subtract 2 because we have 2 pre-existing test kiosk users
      const kioskUserCount = await userModel.countDocuments({ roles: "kiosk" });
      const userNumber = Math.max(1, kioskUserCount + 1 - 2); // Ensure minimum of 1
      const postopWeek = this.calculatePostopWeeks(userNumber);

      // Create the kiosk user
      const randomPassword = Math.random().toString(36).substring(7);
      const hashedPassword = await hashPassword(randomPassword);

      const newKioskUser = new userModel({
        username,
        name: `Kiosk User ${username}`,
        email: `${username}@kiosk.local`,
        password: hashedPassword,
        department: "Orthopädie",
        belongsToCenter: ["1"],
        roles: ["kiosk"],
        permissions: [],
        postopWeek,
      });

      await newKioskUser.save();

      // Get the user without password
      kioskUser = await this.userRepository.getCompleteUserForLogin(username);
      if (!kioskUser || !kioskUser._id) {
        return ServiceResponse.failure("Failed to create kiosk user", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }

      // Extract suffix from kiosk username for doctor user
      const suffixMatch = username.match(/kiosk-?(.+)$/);
      const suffix = suffixMatch ? suffixMatch[1] : Math.random().toString(36).substring(2, 8);

      // Create corresponding doctor user
      const doctorUsername = `user${suffix}`;
      let doctorUser = await this.userRepository.getCompleteUserForLogin(doctorUsername);

      if (!doctorUser) {
        const doctorPassword = Math.random().toString(36).substring(7);
        const hashedDoctorPassword = await hashPassword(doctorPassword);

        const newDoctorUser = new userModel({
          username: doctorUsername,
          name: `Doctor ${suffix}`,
          email: `${doctorUsername}@doctor.local`,
          password: hashedDoctorPassword,
          department: "Orthopädie",
          belongsToCenter: ["1"],
          roles: ["doctor"],
          permissions: [],
          postopWeek, // Same postopWeek as corresponding kiosk user
        });

        await newDoctorUser.save();
        doctorUser = await this.userRepository.getCompleteUserForLogin(doctorUsername);
      }

      if (!doctorUser || !doctorUser._id) {
        return ServiceResponse.failure("Failed to create doctor user", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }

      // Get form template IDs for AOFAS, EFAS, MOXFQ, VAS
      const formTemplates = await FormTemplateModel.find({
        title: { $in: ["EFAS Score", "AOFAS Forefoot Score", "Manchester-Oxford Foot Questionnaire", "VAS Pain Scale"] },
      }).select("_id");

      if (formTemplates.length !== 4) {
        logger.warn(`Not all required form templates found: ${formTemplates.length}/4`);
      }

      const formTemplateIds = formTemplates.map((template) => template._id.toString());

      // Create consultation for the specified case
      const caseId = "677da5d8cb4569ad1c65515f";
      
      // Try to fetch the surgery date for this case
      let consultationDate: Date;
      try {
        const { PatientCaseModel } = await import("@/api/case/patientCaseModel");
        const { SurgeryModel } = await import("@/api/surgery/surgeryModel");
        
        const patientCase = await PatientCaseModel.findById(caseId).lean();
        
        if (patientCase && patientCase.surgeries && patientCase.surgeries.length > 0) {
          // Get the first surgery date
          const surgery = await SurgeryModel.findById(patientCase.surgeries[0]).lean();
          
          if (surgery && surgery.surgeryDate) {
            // Calculate consultation date based on surgery date and postop weeks
            consultationDate = this.calculateConsultationDate(new Date(surgery.surgeryDate), postopWeek);
            logger.info(
              { surgeryDate: surgery.surgeryDate, postopWeek, consultationDate },
              "📅 Consultation date calculated from surgery date"
            );
          } else {
            // Fallback to random past date if surgery has no date
            consultationDate = new Date(this.getRandomPastDate());
            logger.warn("Surgery found but no surgery date, using random date");
          }
        } else {
          // Fallback to random past date if no surgery found
          consultationDate = new Date(this.getRandomPastDate());
          logger.warn("No surgery found for case, using random date");
        }
      } catch (error) {
        // Fallback to random past date on error
        consultationDate = new Date(this.getRandomPastDate());
        logger.warn({ error }, "Error fetching surgery date, using random date");
      }

      const consultationData: CreateConsultation = {
        patientCaseId: caseId as any,
        dateAndTime: consultationDate,
        reasonForConsultation: this.getRandomConsultationReason(),
        notes: [
          {
            dateCreated: new Date(),
            note: this.getRandomGermanNote(),
            createdBy: doctorUser._id.toString(),
          },
        ],
        formTemplates: formTemplateIds as any[],
        images: [],
        visitedBy: [doctorUser._id.toString() as any],
        kioskId: kioskUser._id.toString() as any,
      };

      const consultationResult = await consultationService.createConsultation(caseId, consultationData);

      if (!consultationResult.success || !consultationResult.responseObject) {
        return ServiceResponse.failure(
          "Failed to create consultation",
          null,
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
      }

      // Update last login time
      kioskUser.lastLogin = new Date().toISOString();
      await (kioskUser as any).save();

      // Create UserNoPassword object
      const userWithoutPassword: UserNoPassword = {
        _id: kioskUser._id,
        username: kioskUser.username,
        name: kioskUser.name,
        department: kioskUser.department,
        roles: kioskUser.roles,
        permissions: kioskUser.permissions,
        email: kioskUser.email,
        lastLogin: kioskUser.lastLogin,
        belongsToCenter: kioskUser.belongsToCenter,
        consultationId: consultationResult.responseObject._id as any,
        postopWeek: kioskUser.postopWeek,
      };

      // set the consultation for this kiosk user
      // use the setConsultation method to link the consultation from api/KioskService, this is not the same KioskService in this file
      await kioskServiceApi.setConsultation(kioskUser._id.toString(), consultationResult.responseObject._id.toString());

      logger.info(
        {
          kioskUser: username,
          doctorUser: doctorUsername,
          consultationId: consultationResult.responseObject._id,
        },
        "🎯 Kiosk user logged in successfully",
      );

      return ServiceResponse.success("Kiosk login successful", userWithoutPassword, StatusCodes.OK);
    } catch (ex) {
      const errorMessage = `Error during kiosk login: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred during kiosk login.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Passwordless login for kiosk and doctor users (role switching)
   * @param username - Username to switch to
   */
  async passwordlessLogin(username: string): Promise<ServiceResponse<UserNoPassword | null>> {
    try {
      const user = await this.userRepository.getCompleteUserForLogin(username);
      if (!user) {
        return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
      }

      if (!user._id) {
        return ServiceResponse.failure("Invalid user", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }

      // Only allow passwordless login for kiosk and doctor roles
      const allowedRoles = ["kiosk", "doctor"];
      const hasAllowedRole = user.roles.some((role) => allowedRoles.includes(role));

      if (!hasAllowedRole) {
        return ServiceResponse.failure(
          "Passwordless login only allowed for kiosk and doctor users",
          null,
          StatusCodes.FORBIDDEN,
        );
      }

      // Update last login time
      user.lastLogin = new Date().toISOString();
      await (user as any).save();

      // Create UserNoPassword object
      const userWithoutPassword: UserNoPassword = {
        _id: user._id,
        username: user.username,
        name: user.name,
        department: user.department,
        roles: user.roles,
        permissions: user.permissions,
        email: user.email,
        lastLogin: user.lastLogin,
        belongsToCenter: user.belongsToCenter,
        consultationId: user.consultationId,
        postopWeek: user.postopWeek,
      };

      logger.info({ username, roles: user.roles }, "🔄 Role switch successful");

      return ServiceResponse.success("Role switch successful", userWithoutPassword, StatusCodes.OK);
    } catch (ex) {
      const errorMessage = `Error during passwordless login: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred during role switch.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const kioskService = new KioskService();
