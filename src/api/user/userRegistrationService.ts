import { ServiceResponse } from "@/common/models/serviceResponse";
import { hashPassword } from "@/utils/hashUtil";
import { StatusCodes } from "http-status-codes";
import { addDays, addMonths, addYears } from "date-fns";
import { type RegistrationCode, RegistrationCodeModel } from "./registrationCodeModel";
import { type CreateUser, type User, type UserNoPassword, userModel } from "./userModel";
import { UserRegistrationRepository } from "./userRegistrationRepository";
import type { UserRegistrationInput } from "./userRegistrationSchemas";
import { userService } from "./userService";
import type { Role } from "@/common/middleware/aclConfig";

export interface BatchCreateCodesRequest {
  roles: {
    role: string;
    count: number;
  }[];
  department: string[];
  belongsToCenter?: string;
  expiryType: 'days' | 'months' | 'years' | 'date';
  expiryValue: number | string; // number for relative, date string for absolute
}

export interface BatchCreateCodesResponse {
  [role: string]: string[]; // role as key, array of codes as value
}

export class UserRegistrationService {
  private userRegistrationRepository: UserRegistrationRepository;
  constructor(repository: UserRegistrationRepository = new UserRegistrationRepository()) {
    this.userRegistrationRepository = repository;
  }

  async registerUser(userData: UserRegistrationInput): Promise<ServiceResponse<UserNoPassword | string[] | null>> {
    // Check if username or email already exists
    let newUser: CreateUser = {} as User;
    // Check registration code
    let registrationCodeInfo: RegistrationCode | null = null;
    try {
      registrationCodeInfo = await this.userRegistrationRepository.useCode(userData.registrationCode);
      newUser = {
        ...userData,
        roles: registrationCodeInfo.roles,
        permissions: registrationCodeInfo.permissions,
        department: registrationCodeInfo.userDepartment,
        belongsToCenter: registrationCodeInfo.userBelongsToCenter || undefined,
      };
    } catch (error) {
      return ServiceResponse.failure(
        `Error using registration code: ${(error as Error).message}`,
        null,
        StatusCodes.BAD_REQUEST,
      );
    }

    // if we got so far, create a new user
    // import userService and use it to create a new user
    try {
      // registrationCodeInfo cannot be null, because if it not valid or not found, the previous step would have returned an error
      const result = await userService.createUser(newUser);

      // if we have no success, return errors and reject the promise
      if (!result.success) {
        await this.userRegistrationRepository.resetDeactivatedCode(userData.registrationCode);
        return ServiceResponse.failure("Error creating user", result.responseObject, StatusCodes.CONFLICT);
      }

      // if the user is created successfully, set the userCreatedWith field in the registration code
      const userId = (result.responseObject as UserNoPassword)?._id?.toString();
      if (userId) {
        await this.userRegistrationRepository.setActivatedUserForCode(registrationCodeInfo.code, userId);
      }
      return Promise.resolve(result);
    } catch (error) {
      // reactivate code if user creation fails
      await this.userRegistrationRepository.resetDeactivatedCode(userData.registrationCode);
      return ServiceResponse.failure((error as Error).message, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Create multiple registration codes in batch
   * @param request - Batch creation request with roles and counts
   * @returns Object with role as key and array of codes as value
   */
  async batchCreateCodes(request: BatchCreateCodesRequest): Promise<ServiceResponse<BatchCreateCodesResponse | null>> {
    try {
      const result: BatchCreateCodesResponse = {};
      
      // Calculate expiry date
      let validUntil: Date;
      if (request.expiryType === 'date') {
        validUntil = new Date(request.expiryValue as string);
      } else {
        const now = new Date();
        const value = request.expiryValue as number;
        
        switch (request.expiryType) {
          case 'days':
            validUntil = addDays(now, value);
            break;
          case 'months':
            validUntil = addMonths(now, value);
            break;
          case 'years':
            validUntil = addYears(now, value);
            break;
          default:
            validUntil = addYears(now, 1); // Default to 1 year
        }
      }

      // Create codes for each role
      for (const roleConfig of request.roles) {
        if (roleConfig.count > 0) {
          const codes = await this.userRegistrationRepository.createMultipleCodes(
            roleConfig.count,
            {
              roles: [roleConfig.role as Role],
              permissions: [],
              userDepartment: request.department,
              userBelongsToCenter: request.belongsToCenter,
            },
            validUntil,
          );

          result[roleConfig.role] = codes.map(c => c.code);
        }
      }

      return ServiceResponse.success("Batch registration codes created successfully", result);
    } catch (error) {
      return ServiceResponse.failure(
        `Error creating batch registration codes: ${(error as Error).message}`,
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if a username is available and suggest alternatives if not
   * @param username - The username to check
   * @returns Object with availability status and suggestions
   */
  async checkUsernameAvailability(username: string): Promise<ServiceResponse<{ available: boolean; suggestion?: string } | null>> {
    try {
      const existingUser = await userModel.findOne({ username });
      
      if (!existingUser) {
        return ServiceResponse.success("Username is available", { available: true });
      }

      // Generate suggestion by appending numbers
      let suggestion = username;
      let counter = 1;
      let found = false;

      while (!found && counter < 100) {
        suggestion = `${username}${counter}`;
        const exists = await userModel.findOne({ username: suggestion });
        if (!exists) {
          found = true;
        } else {
          counter++;
        }
      }

      if (!found) {
        // If we couldn't find a suggestion, add random suffix
        suggestion = `${username}${Math.floor(Math.random() * 10000)}`;
      }

      return ServiceResponse.success("Username is not available", { 
        available: false, 
        suggestion 
      });
    } catch (error) {
      return ServiceResponse.failure(
        `Error checking username availability: ${(error as Error).message}`,
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const userRegistrationService = new UserRegistrationService();
