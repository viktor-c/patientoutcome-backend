import { ServiceResponse } from "@/common/models/serviceResponse";
import { hashPassword } from "@/utils/hashUtil";
import { StatusCodes } from "http-status-codes";
import { type RegistrationCode, RegistrationCodeModel } from "../registrationCodeModel";
import { type CreateUser, type UserNoPassword, userModel } from "./userModel";
import { UserRegistrationRepository } from "./userRegistrationRepository";
import type { UserRegistrationInput } from "./userRegistrationSchemas";
import { userService } from "./userService";

export class UserRegistrationService {
  private userRegistrationRepository: UserRegistrationRepository;
  constructor(repository: UserRegistrationRepository = new UserRegistrationRepository()) {
    this.userRegistrationRepository = repository;
  }

  async registerUser(userData: UserRegistrationInput): Promise<ServiceResponse<UserNoPassword | null>> {
    // Check if username or email already exists

    // Check registration code
    let registrationCodeInfo: RegistrationCode | null = null;
    try {
      registrationCodeInfo = await this.userRegistrationRepository.useCode(userData.registrationCode);
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
      const newUserData: CreateUser = {
        ...userData,
        department: registrationCodeInfo?.userDepartment,
        belongsToCenter: registrationCodeInfo?.userDelongsToCenter,
        role: registrationCodeInfo?.userRole,
      };
      const result = await userService.createUser(newUserData);
      // if the user is created successfully, set the userCreatedWith field in the registration code
      if (!result.success) throw new Error(result.message);
      await this.userRegistrationRepository.setActivatedUserForCode(
        registrationCodeInfo.code,
        result.responseObject?._id?.toString(),
      );
      return Promise.resolve(result);
    } catch (error) {
      // reactivate code if user creation fails
      await this.userRegistrationRepository.resetDeactivatedCode(userData.registrationCode);
      return ServiceResponse.failure(
        `Error creating user: ${(error as Error).message}`,
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

export const userRegistrationService = new UserRegistrationService();
