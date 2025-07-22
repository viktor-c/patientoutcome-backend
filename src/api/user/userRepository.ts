import { type User, type UserNoPassword, userModel } from "@/api/user/userModel";
import { faker } from "@faker-js/faker";

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
      lastLogin: faker.date.recent().toISOString(),
      name: "Alice Smith",
      role: 2,
      username: "asmith",
      password: "$2b$10$5WBwIE90gQNqIaJEf4eD5ORB5Nrpnh5YqehxWIm.b3zbl8vS7ysAe", // plaintext password123#124
    },
    {
      _id: "676336bea497301f6eff8c8f",
      belongsToCenter: ["1"],
      department: "Oncology",
      email: "bwhite@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "Bob White",
      role: 1,
      username: "bwhite",
      password: "$2b$10$pwcxQAJP18D9bsPESBxodea5r9Cde9PQfhj775LtYqHUD7ATlUXDK", // plaintext password123#125
    },
    {
      _id: "676336bea497301f6eff8c90",
      belongsToCenter: ["2"],
      department: "Pediatrics",
      email: "cjones@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "Carol Jones",
      role: 2,
      username: "cjones",
      password: "$2b$10$2I0qmUwqE8gGi8ET93KITOEAFa6LdxVltH1ILZtxzCOlhv47g.nHW", // plaintext password123#126
    },
    {
      _id: "676336bea497301f6eff8c91",
      belongsToCenter: ["2"],
      department: "Dermatology",
      email: "dlee@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "David Lee",
      role: 1,
      username: "dlee",
      password: "$2b$10$fp.9cJTu03oR9BrKcun.h.wNfV5whuKL/5dbNVh9Ivl5TedcYSaUq", // plaintext password123#127
    },
    {
      _id: "676336bea497301f6eff8c92",
      belongsToCenter: ["2"],
      department: "Radiology",
      email: "ewilson@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "Emma Wilson",
      role: 2,
      username: "ewilson",
      password: "$2b$10$3I1MNP2Up9dg46iph9DSbO85a9bVRqw4UwGsHhoz/5ExvSE/mo4se", // password123#128
    },
    {
      _id: "676336bea497301f6eff8c94",
      belongsToCenter: ["1"],
      department: "Orthopädie",
      email: "victor@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "Victor Cov",
      role: 2,
      username: "victor",
      password: "$2b$10$EsE/ZP4QOWd4cHAnctAGm.MqjkS5spI9TVk22qZu9tGG2MMiFey8u", // plaintext
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
      if (!user || user.length === 0) {
        console.debug("UserRepository.ts: No user found for query", field);
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

  async getCompleteUserForLogin(user: string): Promise<User | null> {
    try {
      const foundUser = await userModel.findOne({ username: user }).select("+password").lean();
      if (!foundUser) {
        console.debug("UserRepository.ts: No user found for username", user);
        return null;
      }
      return foundUser;
    } catch (error: any) {
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

  // Find user by ID including password
  async findByIdWithPasswordAsync(id: string): Promise<User | null> {
    try {
      return userModel.findById(id).select("+password").lean();
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  // Update only the password field for a user
  async updatePasswordAsync(id: string, hashedPassword: string): Promise<boolean> {
    try {
      const result = await userModel.findByIdAndUpdate(
        id,
        { password: hashedPassword },
        { new: true, lean: true, select: { password: 0 } },
      );
      return !!result;
    } catch (error: any) {
      return false;
    }
  }
}

export const userRepository = new UserRepository();
