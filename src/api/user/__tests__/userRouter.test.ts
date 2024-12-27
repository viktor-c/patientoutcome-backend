import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { User } from "@/api/user/userModel";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import { vi } from "vitest";
import { mockUsers } from "../userRepository";
import { userService } from "../userService";

describe("User API Endpoints", () => {
  describe("GET /user", () => {
    it("should return a list of users", async () => {
      // Act
      const response = await request(app).get("/user");
      const responseBody: ServiceResponse<User[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Users found");
      expect(responseBody.responseObject.length).toEqual(mockUsers.length);
      responseBody.responseObject.forEach((user, index) => compareUsers(mockUsers[index] as User, user));
    });
  });

  describe("GET /user/:id", () => {
    it("should return a user for a valid ID", async () => {
      // Arrange
      const testId = mockUsers[0]._id;
      const expectedUser = mockUsers.find((user: User) => user._id === testId) as User;

      // Act
      const response = await request(app).get(`/user/${testId}`);
      const responseBody: ServiceResponse<User> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("User found");
      if (!expectedUser) throw new Error("Invalid test data: expectedUser is undefined");
      compareUsers(expectedUser, responseBody.responseObject);
    });

    it("should return a not found error for non-existent ID", async () => {
      // Arrange
      const testId = Number.MAX_SAFE_INTEGER;

      // Act
      const response = await request(app).get(`/user/${testId}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("User not found");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return a NOT FOUND for invalid ID format", async () => {
      // Act
      const invalidInput = "abc";
      const response = await request(app).get(`/user/${invalidInput}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("User not found");
      expect(responseBody.responseObject).toBeNull();
    });
  });
});

describe("PUT /user/:id", () => {
  it("should update a user successfully", async () => {
    // Arrange
    const testId = mockUsers[0]._id;
    const updatedData = { name: "Updated Name" };
    const expectedUser = { ...mockUsers[0], ...updatedData };

    // Act
    const response = await request(app).put(`/user/${testId}`).send(updatedData);
    const responseBody: ServiceResponse<User> = response.body;

    // Assert
    expect(response.statusCode).toEqual(StatusCodes.OK);
    expect(responseBody.success).toBeTruthy();
    expect(responseBody.message).toContain("User updated successfully");
    compareUsers(expectedUser, responseBody.responseObject);
  });

  it("should return an error if id is not valid", async () => {
    // Arrange
    const testId = "invalid-id";
    const updatedData = { name: "Updated Name" };

    // Act
    const response = await request(app).put(`/user/${testId}`).send(updatedData);
    const responseBody: ServiceResponse = response.body;

    // Assert
    expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(responseBody.success).toBeFalsy();
    expect(responseBody.message).toContain("An error occurred while updating user.");
    expect(responseBody.responseObject).toBeNull();
  });

  it("should return User not found if id is was not found", async () => {
    // Arrange
    const testId = "123412341234123412341234";
    const updatedData = { name: "Updated Name" };

    // Act
    const response = await request(app).put(`/user/${testId}`).send(updatedData);
    const responseBody: ServiceResponse = response.body;

    // Assert
    expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    expect(responseBody.success).toBeFalsy();
    expect(responseBody.message).toContain("User not found");
    expect(responseBody.responseObject).toBeNull();
  });

  // it("should handle errors", async () => {
  //   // Arrange
  //   const testId = mockUsers[0]._id;
  //   const updatedData = { name: "Updated Name" };

  //   vi.spyOn(userService, "updateUser").mockRejectedValue(new Error("Database error"));

  //   // Act
  //   const response = await request(app).put(`/user/${testId}`).send(updatedData);
  //   const responseBody: ServiceResponse = response.body;

  //   // Assert
  //   expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
  //   expect(responseBody.success).toBeFalsy();
  //   expect(responseBody.message).toContain("An error occurred while updating user.");
  //   expect(responseBody.responseObject).toBeNull();
  // });
});

describe("DELETE /user/:id", () => {
  it("should delete a user successfully", async () => {
    // Arrange
    const testId = mockUsers[0]._id;

    // Act
    const response = await request(app).delete(`/user/${testId}`);
    const responseBody: ServiceResponse<User> = response.body;

    // Assert
    expect(response.statusCode).toEqual(StatusCodes.OK);
    expect(responseBody.success).toBeTruthy();
    expect(responseBody.message).toContain("User deleted successfully");
    expect(responseBody.responseObject).toBeNull();
  });

  it("should return not found if user does not exist", async () => {
    // Arrange
    const testId = "123412341234123412341234";

    // Act
    const response = await request(app).delete(`/user/${testId}`);
    const responseBody: ServiceResponse = response.body;

    // Assert
    expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    expect(responseBody.success).toBeFalsy();
    expect(responseBody.message).toContain("User not found");
    expect(responseBody.responseObject).toBeNull();
  });

  it("should return an internal server error if the id is invalid", async () => {
    // Arrange
    const testId = "nonexistent-id";

    // Act
    const response = await request(app).delete(`/user/${testId}`);
    const responseBody: ServiceResponse = response.body;

    // Assert
    expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(responseBody.success).toBeFalsy();
    expect(responseBody.message).toContain("An error occurred while deleting user.");
    expect(responseBody.responseObject).toBeNull();
  });

  // it("should handle errors", async () => {
  //   // Arrange
  //   const testId = mockUsers[0]._id;

  //   vi.spyOn(userService, "deleteUser").mockRejectedValue(new Error("Database error"));

  //   // Act
  //   const response = await request(app).delete(`/user/${testId}`);
  //   const responseBody: ServiceResponse = response.body;

  //   // Assert
  //   expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
  //   expect(responseBody.success).toBeFalsy();
  //   expect(responseBody.message).toContain("An error occurred while deleting user.");
  //   expect(responseBody.responseObject).toBeNull();
  // });
});

function compareUsers(mockUser: User, responseUser: User) {
  if (!mockUser || !responseUser) {
    throw new Error("Invalid test data: mockUser or responseUser is undefined");
  }

  expect(responseUser._id).toEqual(mockUser._id);
  expect(responseUser.name).toEqual(mockUser.name);
  expect(responseUser.email).toEqual(mockUser.email);
  expect(responseUser.belongsToCenter).toEqual(mockUser.belongsToCenter);
  expect(responseUser.department).toEqual(mockUser.department);
  expect(responseUser.role).toEqual(mockUser.role);
}
