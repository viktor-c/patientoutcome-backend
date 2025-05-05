import { StatusCodes } from "http-status-codes";

import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { hashPassword } from "@/utils/hashUtil";
import { type CreateUser, type User, type UserNoPassword, userModel } from "./userModel";
import { UserRepository } from "./userRepository";
/**
 * Service class for User operations
 * this uses the UserRepository to interact with the database
 * the data from UserRepository can then be manipulated and returned to the user
 */

export class UserService {
  // userRepository will connect to the database
  private userRepository: UserRepository;

  constructor(repository: UserRepository = new UserRepository()) {
    this.userRepository = repository;
  }

  // Retrieves all users from the database
  async findAll(): Promise<ServiceResponse<UserNoPassword[] | null>> {
    try {
      const users = await this.userRepository.findAllAsync();
      if (!users || users.length === 0) {
        return ServiceResponse.failure("No Users found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<UserNoPassword[]>("Users found", users);
    } catch (ex) {
      const errorMessage = `Error finding all users: $${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        "An error occurred while retrieving users.",
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Retrieves a single user by their ID
  async findById(id: string): Promise<ServiceResponse<UserNoPassword | null>> {
    try {
      console.debug("UserRepository.ts: Finding user with id ", id);
      const user = await this.userRepository.findByIdAsync(id);
      if (!user) {
        return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<UserNoPassword>("User found", user);
    } catch (ex) {
      if (((ex as Error).message as string).includes("Cast to ObjectId failed for value")) {
        logger.error(`Invalid ID: ${id}`);
        return ServiceResponse.failure("Invalid ID", null, StatusCodes.BAD_REQUEST);
      }

      const errorMessage = `Error finding user with id ${id}:, ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while finding user.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
  // Create a new user
  async createUser(userData: CreateUser): Promise<ServiceResponse<UserNoPassword | null>> {
    try {
      // Check if the user already exists
      const existingUser = await this.userRepository.findByQueryAsync({ username: userData.username });
      if (existingUser) {
        return ServiceResponse.failure("User already exists", null, StatusCodes.CONFLICT);
      }
      // check it the email is already in use
      const existingEmail = await this.userRepository.findByQueryAsync({ email: userData.email });
      if (existingEmail) {
        return ServiceResponse.failure("Email already in use", null, StatusCodes.CONFLICT);
      }
      // Check if the password and confirmPassword match
      if (userData.password !== userData.confirmPassword) {
        return ServiceResponse.failure("Passwords do not match", null, StatusCodes.BAD_REQUEST);
      }
      // Hash the password before saving
      //@ts-expect-error
      userData.password = await hashPassword(userData.password);

      userData.confirmPassword = undefined; // Remove confirmPassword from the data to be saved
      userData.registerCode = undefined; // Remove registerCode from the data to be saved

      const newUser = new userModel(userData);
      await newUser.save();
      return ServiceResponse.created<UserNoPassword>("User created successfully", newUser);
    } catch (ex) {
      const errorMessage = `Error creating user: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while creating user.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
  // Update a user by their ID
  async updateUser(id: string, userData: Partial<User>): Promise<ServiceResponse<User | null>> {
    try {
      if (userData.password) userData.password = await hashPassword(userData.password);

      const updatedUser = await this.userRepository.updateByIdAsync(id, userData);
      if (!updatedUser) {
        return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<UserNoPassword>("User updated successfully", updatedUser);
    } catch (ex) {
      const errorMessage = `Error updating user with id ${id}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while updating user.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  // Delete a user by their ID
  async deleteUser(id: string): Promise<ServiceResponse<User | null>> {
    try {
      const deletedUser = await this.userRepository.deleteByIdAsync(id);
      if (!deletedUser) {
        return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<null>("User deleted successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting user with id ${id}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      if (((ex as Error).message as string).includes("Cast to ObjectId failed for value")) {
        logger.error(`Invalid ID: ${id}`);
        return ServiceResponse.failure("Invalid ID", null, StatusCodes.BAD_REQUEST);
      }
      return ServiceResponse.failure("An error occurred while deleting user.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}

export const userService = new UserService();
