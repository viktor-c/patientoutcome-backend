import { type User, type UserNoPassword, userModel } from "@/api/user/userModel";

/**
 * this file connects to the database and retrieves the user data
 * it will be used in the tests for the user service
 */

export class UserRepository {
  public mockUsers: User[] = [
    {
      _id: "676336bea497301f6eff8c8e",
      belongsToCenter: ["1"],
      department: "Neurology",
      email: "asmith@example.com",
      lastLogin: "2023-10-02T12:34:56Z",
      name: "Alice Smith",
      role: 2,
      username: "asmith",
      password: "password123#124",
    },
    {
      _id: "676336bea497301f6eff8c8f",
      belongsToCenter: ["1"],
      department: "Oncology",
      email: "bwhite@example.com",
      lastLogin: "2023-10-03T12:34:56Z",
      name: "Bob White",
      role: 1,
      username: "bwhite",
      password: "password123#125",
    },
    {
      _id: "676336bea497301f6eff8c90",
      belongsToCenter: ["2"],
      department: "Pediatrics",
      email: "cjones@example.com",
      lastLogin: "2023-10-04T12:34:56Z",
      name: "Carol Jones",
      role: 2,
      username: "cjones",
      password: "password123#126",
    },
    {
      _id: "676336bea497301f6eff8c91",
      belongsToCenter: ["2"],
      department: "Dermatology",
      email: "dlee@example.com",
      lastLogin: "2023-10-05T12:34:56Z",
      name: "David Lee",
      role: 1,
      username: "dlee",
      password: "password123#127",
    },
    {
      _id: "676336bea497301f6eff8c92",
      belongsToCenter: ["2"],
      department: "Radiology",
      email: "ewilson@example.com",
      lastLogin: "2023-10-06T12:34:56Z",
      name: "Emma Wilson",
      role: 2,
      username: "ewilson",
      password: "password123#128",
    },
  ];

  async findAllAsync(): Promise<UserNoPassword[]> {
    try {
      const users = await userModel.find().select("-password").lean();
      return users;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findByQueryAsync(field: any): Promise<UserNoPassword | null> {
    try {
      const user = await userModel.find(field).select("-password").lean();
      if (!user) {
        return null;
      }
      return user[0];
    } catch (error: any) {
      if (error.name === "CastError") {
        console.error("Invalid ID format:", error.message);
        return null;
      }
      console.error("Error finding user by username:", error.message);
      return Promise.reject(error);
    }
  }

  async findByIdAsync(id: string): Promise<UserNoPassword | null> {
    try {
      console.debug("UserRepository.ts: Finding user with id ", id);
      return userModel.findById(id).select("-password").lean();
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async updateByIdAsync(id: string, userData: Partial<User>): Promise<UserNoPassword> {
    try {
      const updatedUser = await userModel.findByIdAndUpdate(id, userData, {
        new: true,
        lean: true,
        select: { password: 0 },
      });
      return updatedUser;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async deleteByIdAsync(id: string): Promise<User | null> {
    try {
      const deletedUser = await userModel.findByIdAndDelete(id).lean();
      return deletedUser;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async createMockUserData(): Promise<void> {
    try {
      await userModel.deleteMany({});
      const result = await userModel.insertMany(this.mockUsers);
      console.log("Mock user data seeded successfully:", result);
    } catch (error) {
      console.error("Error seeding mock user data:", error);
      return Promise.reject(error);
    }
  }
}

export const userRepository = new UserRepository();
