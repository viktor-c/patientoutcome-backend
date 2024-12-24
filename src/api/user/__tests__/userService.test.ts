/**
 *
 */
import { StatusCodes } from "http-status-codes";
import type { Mock } from "vitest";

import type { User } from "@/api/user/userModel";
import { UserRepository } from "@/api/user/userRepository";
import { UserService } from "@/api/user/userService";

vi.mock("@/api/user/userRepository");

describe("userService", () => {
  let userServiceInstance: UserService;
  let userRepositoryInstance: UserRepository;

  const mockUsers: User[] = [
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

  beforeEach(() => {
    userRepositoryInstance = new UserRepository();
    userServiceInstance = new UserService(userRepositoryInstance);
  });

  describe("findAll", () => {
    it("return all users", async () => {
      // Arrange
      (userRepositoryInstance.findAllAsync as Mock).mockReturnValue(mockUsers);

      // Act
      const result = await userServiceInstance.findAll();

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.OK);
      expect(result.success).toBeTruthy();
      expect(result.message).equals("Users found");
      expect(result.responseObject).not.toBeNull();
      result.responseObject?.forEach((user: User, index: number) => compareUsers(mockUsers[index] as User, user));
    });

    it("returns a not found error for no users found", async () => {
      // Arrange
      (userRepositoryInstance.findAllAsync as Mock).mockReturnValue(null);

      // Act
      const result = await userServiceInstance.findAll();

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(result.success).toBeFalsy();
      expect(result.message).equals("No Users found");
      expect(result.responseObject).toBeNull();
    });

    it("handles errors for findAllAsync", async () => {
      // Arrange
      (userRepositoryInstance.findAllAsync as Mock).mockRejectedValue(new Error("Database error"));

      // Act
      const result = await userServiceInstance.findAll();

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(result.success).toBeFalsy();
      expect(result.message).equals("An error occurred while retrieving users.");
      expect(result.responseObject).toBeNull();
    });
  });

  describe("findById", () => {
    it("returns a user for a valid ID", async () => {
      // Arrange
      const testId = "1e7f1d3e-8b6d-4b2e-9b6d-1e7f1d3e8b6d";
      const mockUser = mockUsers.find((user) => user.id === testId);
      (userRepositoryInstance.findByIdAsync as Mock).mockReturnValue(mockUser);

      // Act
      const result = await userServiceInstance.findById(testId);

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.OK);
      expect(result.success).toBeTruthy();
      expect(result.message).equals("User found");
      compareUsers(result.responseObject as User, mockUser as User);
    });

    it("handles errors for findByIdAsync", async () => {
      // Arrange
      const testId = "sadfasdfsadf";
      (userRepositoryInstance.findByIdAsync as Mock).mockRejectedValue(new Error("Database error"));

      // Act
      const result = await userServiceInstance.findById(testId);

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(result.success).toBeFalsy();
      expect(result.message).equals("An error occurred while finding user.");
      expect(result.responseObject).toBeNull();
    });

    it("returns a not found error for non-existent ID", async () => {
      // Arrange
      const testId = "1";
      (userRepositoryInstance.findByIdAsync as Mock).mockReturnValue(null);

      // Act
      const result = await userServiceInstance.findById(testId);

      // Assert
      expect(result.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(result.success).toBeFalsy();
      expect(result.message).equals("User not found");
      expect(result.responseObject).toBeNull();
    });
  });
});

/**
 * compare mockUsers and responseUsers using some fields
 * @param mockUser <User>
 * @param responseUser <User>
 */
function compareUsers(mockUser: User, responseUser: User) {
  if (!mockUser || !responseUser) {
    throw new Error("Invalid test data: mockUser or responseUser is undefined");
  }

  expect(responseUser.id).toEqual(mockUser.id);
  expect(responseUser.name).toEqual(mockUser.name);
  expect(responseUser.email).toEqual(mockUser.email);
  expect(responseUser.belongsToCenter).toEqual(mockUser.belongsToCenter);
  expect(responseUser.department).toEqual(mockUser.department);
  expect(responseUser.role).toEqual(mockUser.role);
}
