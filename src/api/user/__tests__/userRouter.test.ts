import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { User } from "@/api/user/userModel";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import type { ObjectId } from "mongoose";
import { mockUsers } from "../userRepository";

//TODO regenerate Database
let newUserId: string | ObjectId = "";

const newUser = {
  username: "newuser",
  name: "New User",
  department: "orthopedics",
  role: 1,
  email: "newuser@example.com",
  belongsToCenter: ["1"],
} as User;

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

  // get user by id
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

    it("should return a NOT FOUND for nonexistent ID", async () => {
      // Arrange
      const testId = "123412341234123412341234";

      // Act
      const response = await request(app).get(`/user/${testId}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("User not found");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return a BAD REQUEST for number instead ID", async () => {
      // Arrange
      const testId = Number.MAX_SAFE_INTEGER;

      // Act
      const response = await request(app).get(`/user/${testId}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Invalid");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return a BAD REQUEST for invalid ID format", async () => {
      // Act
      const invalidInput = "abc";
      const response = await request(app).get(`/user/${invalidInput}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Invalid");
      expect(responseBody.responseObject).toBeNull();
    });
  });

  // create user
  describe("POST /user", () => {
    it("should create a user successfully", async () => {
      // Arrange
      const newUserWithPassword = {
        ...newUser,
        password: "password123",
        confirmPassword: "password123",
      };

      // Act
      const response = await request(app).post("/user").send(newUserWithPassword);
      const responseBody: ServiceResponse<User> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.CREATED);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("User created successfully");
      expect(responseBody.responseObject).toMatchObject({
        username: newUserWithPassword.username,
        name: newUserWithPassword.name,
        department: newUserWithPassword.department,
        role: newUserWithPassword.role,
        email: newUserWithPassword.email,
        belongsToCenter: newUserWithPassword.belongsToCenter,
      });
      newUserId = responseBody.responseObject._id as string;
    });
    it("should return an error if required fields are missing", async () => {
      // Arrange
      const newUserWithMissingFields = {
        username: "newuser",
        name: "New User",
        department: "orthopedics",
      };

      // Act
      const response = await request(app).post("/user").send(newUserWithMissingFields);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Invalid input: Required");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return an error if password is too short", async () => {
      // Arrange
      const newUserWithShortPassword = {
        ...newUser,
        password: "short",
        confirmPassword: "short",
      };

      // Act
      const response = await request(app).post("/user").send(newUserWithShortPassword);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Invalid input:");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return an error if passwords do not match", async () => {
      // Arrange
      newUser.password = "password123";
      newUser.confirmPassword = "password456";

      // Act
      const response = await request(app).post("/user").send(newUser);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Passwords do not match");
      expect(responseBody.responseObject).toBeNull();
    });
  });

  // update user
  describe("PUT /user/:id", () => {
    it("should update a user successfully", async () => {
      // Arrange
      const testId = mockUsers[0]._id;
      const updatedData = { name: "Updated Name" };
      const originalData = { name: mockUsers[0].name };
      const expectedUser = mockUsers[0] as User;
      expectedUser.name = updatedData.name;

      // Act
      const response = await request(app).put(`/user/${testId}`).send(updatedData);
      const responseBody: ServiceResponse<User> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("User updated successfully");
      compareUsers(expectedUser, responseBody.responseObject);

      // Reset the name back to original
      await request(app).put(`/user/${testId}`).send(originalData);
    });

    it("should return an error if id is not valid", async () => {
      // Arrange
      const testId = "invalid-id";
      const updatedData = { name: "Updated Name" };

      // Act
      const response = await request(app).put(`/user/${testId}`).send(updatedData);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("An error occured on validation: ");
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
  });

  describe("DELETE /user/:id", () => {
    it("should delete a user successfully", async () => {
      // Arrange
      const testId = newUserId;

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
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("An error occured on validation: ");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return an not found code if the id is not found", async () => {
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
