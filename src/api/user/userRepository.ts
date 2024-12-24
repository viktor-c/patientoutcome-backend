import { type User, type UserNoPassword, userModel } from "@/api/user/userModel";

/**
 * this file connects to the database and retrieves the user data
 * it will be used in the tests for the user service
 */

export class UserRepository {
  async findAllAsync(): Promise<User[]> {
    try {
      const users = userModel.find().select("-password").lean();
      return users;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findByIdAsync(id: string): Promise<User> {
    try {
      const user = userModel.findOne({ id }).select("-password").lean();
      return user;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }
}
