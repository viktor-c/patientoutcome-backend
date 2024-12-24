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

export const mockUsers: User[] = [
  {
    _id: "676336bea497301f6eff8c8d",
    belongsToCenter: ["1"],
    department: "Cardiology",
    email: "jdoe@example.com",
    id: "1e7f1d3e-8b6d-4b2e-9b6d-1e7f1d3e8b6d",
    lastLogin: "2023-10-01T12:34:56Z",
    name: "John Doe",
    role: 100,
    username: "jdoe",
  },
  {
    _id: "676336bea497301f6eff8c8e",
    belongsToCenter: ["1"],
    department: "Neurology",
    email: "asmith@example.com",
    id: "2e7f1d3e-8b6d-4b2e-9b6d-2e7f1d3e8b6d",
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
    id: "3e7f1d3e-8b6d-4b2e-9b6d-3e7f1d3e8b6d",
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
    id: "4e7f1d3e-8b6d-4b2e-9b6d-4e7f1d3e8b6d",
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
    id: "5e7f1d3e-8b6d-4b2e-9b6d-5e7f1d3e8b6d",
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
    id: "6e7f1d3e-8b6d-4b2e-9b6d-6e7f1d3e8b6d",
    lastLogin: "2023-10-06T12:34:56Z",
    name: "Emma Wilson",
    role: 2,
    username: "ewilson",
  },
  {
    _id: "676336bea497301f6eff8c93",
    belongsToCenter: ["1"],
    department: "Surgery",
    email: "fmartin@example.com",
    id: "7e7f1d3e-8b6d-4b2e-9b6d-7e7f1d3e8b6d",
    lastLogin: "2023-10-07T12:34:56Z",
    name: "Frank Martin",
    role: 1,
    username: "fmartin",
  },
  {
    _id: "676336bea497301f6eff8c94",
    belongsToCenter: ["2"],
    department: "Orthopedics",
    email: "gthomas@example.com",
    id: "8e7f1d3e-8b6d-4b2e-9b6d-8e7f1d3e8b6d",
    lastLogin: "2023-10-08T12:34:56Z",
    name: "Grace Thomas",
    role: 2,
    username: "gthomas",
  },
  {
    _id: "676336bea497301f6eff8c95",
    belongsToCenter: ["1"],
    department: "Urology",
    email: "hroberts@example.com",
    id: "9e7f1d3e-8b6d-4b2e-9b6d-9e7f1d3e8b6d",
    lastLogin: "2023-10-09T12:34:56Z",
    name: "Henry Roberts",
    role: 1,
    username: "hroberts",
  },
  {
    _id: "676336bea497301f6eff8c96",
    belongsToCenter: ["2"],
    department: "Gastroenterology",
    email: "ijackson@example.com",
    id: "10e7f1d3e-8b6d-4b2e-9b6d-10e7f1d3e8b6d",
    lastLogin: "2023-10-10T12:34:56Z",
    name: "Ivy Jackson",
    role: 2,
    username: "ijackson",
  },
];
