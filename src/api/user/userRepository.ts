import { type User, type UserNoPassword, userModel } from "@/api/user/userModel";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import { assertSeedingAllowed, isMockDataAccessAllowed } from "@/common/utils/seedingUtils";
import { faker } from "@faker-js/faker";

/**
 * this file connects to the database and retrieves the user data
 * it will be used in the tests for the user service
 */

export class UserRepository {
  private _mockUsers: User[] = [
    {
      _id: "676336bea497301f6eff8c8d",
      belongsToCenter: ["1"],
      department: "Orthopädie",
      email: "student@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "PJ Student",
      roles: ["student"],
      permissions: [],
      username: "student",
      password: "$2b$10$5WBwIE90gQNqIaJEf4eD5ORB5Nrpnh5YqehxWIm.b3zbl8vS7ysAe", // plaintext password123#124
    },
    {
      _id: "676336bea497301f6eff8c8e",
      belongsToCenter: ["1"],
      department: "Orthopädie",
      email: "asmith@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "Alice Smith",
      roles: ["mfa"],
      permissions: [],
      username: "asmith",
      password: "$2b$10$5WBwIE90gQNqIaJEf4eD5ORB5Nrpnh5YqehxWIm.b3zbl8vS7ysAe", // plaintext password123#124
    },
    {
      _id: "676336bea497301f6eff8c8f",
      belongsToCenter: ["1"],
      department: "Orthopädie",
      email: "bwhite@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "Bob White",
      roles: ["doctor"],
      permissions: [],
      username: "bwhite",
      password: "$2b$10$5WBwIE90gQNqIaJEf4eD5ORB5Nrpnh5YqehxWIm.b3zbl8vS7ysAe", // plaintext password123#124
    },
    {
      _id: "676336bea497301f6eff8a8f",
      belongsToCenter: ["1"],
      department: "Orthopädie",
      email: "jdoe@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "John Doe",
      roles: ["doctor"],
      permissions: [],
      username: "jdoe",
      password: "$2b$10$5WBwIE90gQNqIaJEf4eD5ORB5Nrpnh5YqehxWIm.b3zbl8vS7ysAe", // plaintext password123#124
    },
    {
      _id: "676336bea497301f6eff8c90",
      belongsToCenter: ["2"],
      department: "Orthopädie",
      email: "cjones@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "Carol Jones",
      roles: ["study-nurse"],
      permissions: [],
      username: "cjones",
      password: "$2b$10$5WBwIE90gQNqIaJEf4eD5ORB5Nrpnh5YqehxWIm.b3zbl8vS7ysAe", // plaintext password123#124
    },
    {
      _id: "676336bea497301f6eff8c91",
      belongsToCenter: ["2"],
      department: "Orthopädie",
      email: "dlee@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "David Lee",
      roles: ["project-manager"],
      permissions: [],
      username: "dlee",
      password: "$2b$10$5WBwIE90gQNqIaJEf4eD5ORB5Nrpnh5YqehxWIm.b3zbl8vS7ysAe", // plaintext password123#124
    },
    {
      _id: "676336bea497301f6eff8c92",
      belongsToCenter: ["2"],
      department: "Radiology",
      email: "ewilson@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "Emma Wilson",
      roles: ["admin"],
      permissions: [],
      username: "ewilson",
      password: "$2b$10$5WBwIE90gQNqIaJEf4eD5ORB5Nrpnh5YqehxWIm.b3zbl8vS7ysAe", // plaintext password123#124
    },
    {
      _id: "676336bea497301f6eff8c94",
      belongsToCenter: ["1"],
      department: "Orthopädie",
      email: "victor@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "Victor C",
      roles: ["developer"],
      permissions: [],
      username: "victor",
      // password: "$2b$10$EsE/ZP4QOWd4cHAnctAGm.MqjkS5spI9TVk22qZu9tGG2MMiFey8u", // plaintext
      password: "$2b$10$5WBwIE90gQNqIaJEf4eD5ORB5Nrpnh5YqehxWIm.b3zbl8vS7ysAe", // plaintext password123#124
    },
    {
      _id: "676336bea497301f6eff8c95",
      belongsToCenter: ["1"],
      department: "Orthopädie",
      email: "kiosk1@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "Kiosk Tablet 1",
      roles: ["kiosk"],
      permissions: [],
      username: "kiosk1",
      password: "$2b$10$5WBwIE90gQNqIaJEf4eD5ORB5Nrpnh5YqehxWIm.b3zbl8vS7ysAe", // plaintext password123#124
    },
    {
      _id: "676336bea497301f6eff8c96",
      belongsToCenter: ["1"],
      department: "Orthopädie",
      email: "kiosk2@example.com",
      lastLogin: faker.date.recent().toISOString(),
      name: "Kiosk Tablet 2",
      roles: ["kiosk"],
      permissions: [],
      username: "kiosk2",
      password: "$2b$10$5WBwIE90gQNqIaJEf4eD5ORB5Nrpnh5YqehxWIm.b3zbl8vS7ysAe", // plaintext password123#124
    },
  ];

  async findAllAsync(): Promise<UserNoPassword[]> {
    try {
      const users = (await userModel.find().select("-password").lean()) as unknown as UserNoPassword[];
      return users;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findAllFilteredAsync(department?: string, role?: string): Promise<UserNoPassword[]> {
    try {
      const query: any = {};

      // If department is specified, filter by department
      if (department) {
        query.department = department;
      }

      // If role is specified, filter by role
      if (role) {
        query.roles = { $in: [role] };
      }

      const users = (await userModel.find(query).select("-password").lean()) as unknown as UserNoPassword[];
      return users;
    } catch (error: any) {
      logger.error({ error: error.message }, "Error finding filtered users");
      return Promise.reject(error);
    }
  }

  async findAllByRoleAsync(role: string): Promise<UserNoPassword[]> {
    try {
      const users = (await userModel
        .find({ roles: { $in: [role] } })
        .select("-password")
        .lean()) as unknown as UserNoPassword[];
      return users;
    } catch (error: any) {
      logger.error({ error: error.message }, `Error finding users with role ${role}`);
      return Promise.reject(error);
    }
  }

  async findByQueryAsync(field: any): Promise<UserNoPassword | null> {
    try {
      const user = await userModel.find(field).select("-password").lean();
      if (!user || user.length === 0) {
        logger.debug({ field }, "UserRepository.ts: No user found for query");
        return null;
      }
      return user[0] as unknown as UserNoPassword;
    } catch (error: any) {
      if (error.name === "CastError") {
        logger.error({ error: error.message }, "Invalid ID format");
        return null;
      }
      logger.error({ error: error.message }, "Error finding user by username");
      return Promise.reject(error);
    }
  }

  async getCompleteUserForLogin(user: string): Promise<User | null> {
    try {
      const foundUser = await userModel.findOne({ username: user }).select("+password"); //dont lean, we want to be able to save last login
      if (!foundUser) {
        logger.debug({ user }, "UserRepository.ts: No user found for username");
        return null;
      }
      return foundUser as unknown as User;
    } catch (error: any) {
      logger.error({ error: error.message }, "Error finding user by username");
      return Promise.reject(error);
    }
  }

  async findByIdAsync(id: string): Promise<UserNoPassword | null> {
    try {
      logger.debug({ id }, "UserRepository.ts: Finding user with id");
      return userModel.findById(id).select("-password").lean() as unknown as UserNoPassword;
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
      return updatedUser as unknown as UserNoPassword;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async deleteByUsernameAsync(username: string): Promise<User | null> {
    try {
      const deletedUser = await userModel.findOneAndDelete({ username }).lean();
      return deletedUser as unknown as User;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async createMockUserData(forceReset = false): Promise<void> {
    await assertSeedingAllowed();

    try {
      // If forceReset is false, check if mock users already exist to avoid duplicate key errors in parallel tests
      if (!forceReset) {
        const existingUserCount = await userModel.countDocuments({
          _id: { $in: this.mockUsers.map((user) => user._id) },
        });

        // If all mock users already exist, skip insertion
        if (existingUserCount === this.mockUsers.length) {
          logger.info("Mock user data already exists, skipping insertion");
          return;
        }
      }

      // Clear existing data and insert fresh mock data
      await userModel.deleteMany({});
      const result = await userModel.insertMany(this.mockUsers);
      logger.info({ count: result.length }, `Mock user data ${forceReset ? "reset and " : ""}seeded successfully`);
    } catch (error) {
      logger.error({ error }, "Error seeding mock user data");
      return Promise.reject(error);
    }
  }

  /**
   * Insert mock users without deleting existing users.
   * Skips users that already exist (by username or _id).
   * Used during setup to preserve admin user created during initial setup.
   */
  async insertMockUsersPreserveExisting(): Promise<{ inserted: number; skipped: number }> {
    await assertSeedingAllowed();

    try {
      let inserted = 0;
      let skipped = 0;

      for (const mockUser of this.mockUsers) {
        // Check if user already exists by username or _id
        const existingUser = await userModel.findOne({
          $or: [{ username: mockUser.username }, { _id: mockUser._id }],
        });

        if (existingUser) {
          logger.debug({ username: mockUser.username }, "User already exists, skipping");
          skipped++;
          continue;
        }

        // Insert the mock user
        await userModel.create(mockUser);
        inserted++;
      }

      logger.info({ inserted, skipped }, "Mock users inserted (preserving existing)");
      return { inserted, skipped };
    } catch (error) {
      logger.error({ error }, "Error inserting mock users");
      return Promise.reject(error);
    }
  }

  /**
   * Getter to access mock data only in development or test environments.
   * In production, accessing this property will throw an error to prevent
   * accidental exposure of mock data.
   */
  public get mockUsers(): User[] {
    if (!isMockDataAccessAllowed()) {
      logger.error("Attempted to access mock data in production environment");
      throw new Error("Mock data is not available in production environment");
    }
    return this._mockUsers;
  }

  // Find user by ID including password
  async findByIdWithPasswordAsync(id: string): Promise<User | null> {
    try {
      return userModel.findById(id).select("+password").lean() as unknown as User;
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
