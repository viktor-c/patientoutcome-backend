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
      // const objectid = new mongoose.Types.ObjectId(id);
      console.debug("UserRepository.ts: Finding user with id ", id);
      const user = userModel.findById(id).select("-password").lean();
      return user;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async updateByIdAsync(id: string, userData: Partial<User>): Promise<User> {
    try {
      const updatedUser = userModel.findByIdAndUpdate(id, userData, { new: true, lean: true, select: { password: 0 } }); //.select("-password");
      return updatedUser;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }

  async deleteByIdAsync(id: string): Promise<User> {
    try {
      const deletedUser = userModel.findByIdAndDelete(id);
      return deletedUser;
    } catch (error: any) {
      return Promise.reject(error);
    }
  }
}

export const mockUsers: UserNoPassword[] = [
  {
    _id: "676336bea497301f6eff8c8e",
    belongsToCenter: ["1"],
    department: "Neurology",
    email: "asmith@example.com",
    lastLogin: "2023-10-02T12:34:56Z",
    name: "Alice Smith",
    role: 2,
    username: "asmith",
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
  },
];
