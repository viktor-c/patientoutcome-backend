import { StatusCodes } from "http-status-codes";

import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";
import { comparePasswords, hashPassword } from "@/utils/hashUtil";
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
  async createUser(userData: CreateUser): Promise<ServiceResponse<UserNoPassword | string[] | null>> {
    try {
      const errors = [];
      // Check if the user already exists
      const existingUser = await this.userRepository.findByQueryAsync({
        username: userData.username,
      });
      if (existingUser) {
        errors.push("Username already exists");
      }
      // check it the email is already in use
      const existingEmail = await this.userRepository.findByQueryAsync({
        email: userData.email,
      });
      if (existingEmail) {
        errors.push("Email already in use");
      }
      // Check if the password and confirmPassword match
      if (userData.password !== userData.confirmPassword) {
        errors.push("Passwords do not match");
      }
      if (errors.length > 0) {
        // if there are errors, return them
        return ServiceResponse.failure("Error creating user", errors, StatusCodes.CONFLICT);
      }

      // Hash the password before saving
      userData.password = await hashPassword(userData.password);
      userData.confirmPassword = undefined; // Remove confirmPassword from the data to be saved

      //register code was processed in userController, fields were filled out correspondingly

      const newUser = new userModel(userData);
      await newUser.save();
      // now get newUser without password and return it
      const newUserWithoutPassword: UserNoPassword | null = await this.userRepository.findByIdAsync(
        newUser._id.toString(),
      );
      if (!newUserWithoutPassword) {
        return ServiceResponse.failure("User not found after creation", null, StatusCodes.INTERNAL_SERVER_ERROR);
      }
      return ServiceResponse.created<UserNoPassword>("User created successfully", newUserWithoutPassword);
    } catch (ex) {
      const errorMessage = `Error creating user: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure(
        `An error occurred while creating user. ${errorMessage}`,
        null,
        StatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  }
  // Update a user by their ID
  async updateUser(id: string, userData: Partial<User>): Promise<ServiceResponse<UserNoPassword | null>> {
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
  async deleteUser(username: string): Promise<ServiceResponse<User | null>> {
    try {
      const deletedUser = await this.userRepository.deleteByUsernameAsync(username);
      if (!deletedUser) {
        return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success<null>("User deleted successfully", null);
    } catch (ex) {
      const errorMessage = `Error deleting user with username ${username}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      if (((ex as Error).message as string).includes("Cast to ObjectId failed for value")) {
        logger.error(`Invalid ID: ${username}`);
        return ServiceResponse.failure("Invalid ID", null, StatusCodes.BAD_REQUEST);
      }
      return ServiceResponse.failure("An error occurred while deleting user.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  // Login a user
  async login(username: string, password: string): Promise<ServiceResponse<UserNoPassword | null>> {
    try {
      const user = await this.userRepository.getCompleteUserForLogin(username);
      if (!user) {
        return ServiceResponse.failure("Invalid username or password", null, StatusCodes.UNAUTHORIZED);
      }
      if (!user._id) {
        return ServiceResponse.failure("Invalid username or password", null, StatusCodes.UNAUTHORIZED);
      }
      const hashedPassword = await hashPassword(password);
      console.debug("UserService.ts: Logging in user with username", username);
      console.debug("UserService.ts: Hashed password", hashedPassword);
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        return ServiceResponse.failure("Invalid username or password", null, StatusCodes.UNAUTHORIZED);
      }
      // Update last login time
      user.lastLogin = new Date().toISOString();
      //@ts-ignore-next-line
      await user.save(); // Save the last login time
      // Remove sensitive information from the user object before returning
      //@ts-ignore
      user.password = undefined; // Remove password from the response
      user.confirmPassword = undefined; // Remove confirmPassword from the response
      // return the user without password
      return ServiceResponse.success("Login successful", user, StatusCodes.OK);
    } catch (ex) {
      const errorMessage = `Error logging in user: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return ServiceResponse.failure("An error occurred while logging in.", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  // // Logout a user
  // async logout(userId: string): Promise<ServiceResponse<null>> {
  //   try {
  //     await this.userRepository.updateByIdAsync(user._id, { sessionId: null });
  //     return ServiceResponse.success("Logout successful", null);
  //   } catch (ex) {
  //     const errorMessage = `Error logging out user: ${(ex as Error).message}`;
  //     logger.error(errorMessage);
  //     return ServiceResponse.failure("An error occurred while logging out.", null, StatusCodes.INTERNAL_SERVER_ERROR);
  //   }
  // }

  // Fetch user by ID including password
  async findByIdWithPassword(id: string) {
    try {
      const user = await this.userRepository.findByIdWithPasswordAsync(id);
      if (!user) {
        return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
      }
      return ServiceResponse.success("User found", user);
    } catch (ex) {
      return ServiceResponse.failure("Error fetching user", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  // Compare plain password with hash
  async comparePassword(plain: string, hash: string) {
    return comparePasswords(plain, hash);
  }

  // Update user password
  async updatePassword(id: string, newPassword: string) {
    try {
      const hashed = await hashPassword(newPassword);
      const updated = await this.userRepository.updatePasswordAsync(id, hashed);
      if (!updated) {
        return ServiceResponse.failure("Failed to update password", null, StatusCodes.BAD_REQUEST);
      }
      return ServiceResponse.success("Password updated", null);
    } catch (ex) {
      return ServiceResponse.failure("Error updating password", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  // Find user by username
  async findByUsername(username: string) {
    return this.userRepository.getCompleteUserForLogin(username);
  }
}

export const userService = new UserService();
