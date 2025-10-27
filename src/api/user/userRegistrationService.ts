import { ServiceResponse } from "@/common/models/serviceResponse";
import { hashPassword } from "@/utils/hashUtil";
import { StatusCodes } from "http-status-codes";
import { type RegistrationCode, RegistrationCodeModel } from "./registrationCodeModel";
import { type CreateUser, type User, type UserNoPassword, userModel } from "./userModel";
import { UserRegistrationRepository } from "./userRegistrationRepository";
import type { UserRegistrationInput } from "./userRegistrationSchemas";
import { userService } from "./userService";

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
        belongsToCenter: registrationCodeInfo.userBelongsToCenter,
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
}

export const userRegistrationService = new UserRegistrationService();
