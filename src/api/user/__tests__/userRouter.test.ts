import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { User } from "@/api/user/userModel";
import { userRepository } from "@/api/user/userRepository";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import type { ObjectId } from "mongoose";

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
  beforeAll(async () => {
    try {
      const res = await request(app).get("/seed/users");
      if (res.status !== StatusCodes.OK) {
        throw new Error("Failed to insert user data");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Setup failed for user data: ${error.message}`);
      } else {
        throw new Error("Setup failed for user data: Unknown error");
      }
    }
  });
  describe("GET /user", () => {
    it("should return a list of users", async () => {
      // Act
      const response = await request(app).get("/user");
      const responseBody: ServiceResponse<User[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Users found");
      expect(responseBody.responseObject.length).toEqual(userRepository.mockUsers.length);
      responseBody.responseObject.forEach((user, index) => compareUsers(userRepository.mockUsers[index] as User, user));
    });
  });

  // get user by id
  describe("GET /user/:id", () => {
    it("should return a user for a valid ID", async () => {
      // Arrange
      const testId = userRepository.mockUsers[0]._id;
      const expectedUser = userRepository.mockUsers.find((user: User) => user._id === testId) as User;

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
      expect(responseBody.message).toContain("Validation error");
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
      expect(responseBody.message).toContain("Validation error");
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
      const testId = userRepository.mockUsers[0]._id;
      const updatedData = { name: "Updated Name" };
      const originalData = { name: userRepository.mockUsers[0].name };
      const expectedUser = userRepository.mockUsers[0] as User;
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
      const testId = userRepository.mockUsers[2]._id;

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
  });

  describe("POST /user/login", () => {
    it("should login a user successfully", async () => {
      // Arrange
      const loginData = {
        username: userRepository.mockUsers[0].username,
        password: "password123#124",
      };

      // Act
      const response = await request(app).post("/user/login").send(loginData);
      const responseBody: ServiceResponse<{ sessionId: string }> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Login successful");
      expect(responseBody.responseObject).toHaveProperty("sessionId");
    });

    it("should return an error for invalid credentials", async () => {
      // Arrange
      const loginData = {
        username: "invaliduser",
        password: "wrongpassword",
      };

      // Act
      const response = await request(app).post("/user/login").send(loginData);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Invalid username or password");
      expect(responseBody.responseObject).toBeNull();
    });
  });

  describe("POST /user/logout", () => {
    it("should logout a user successfully", async () => {
      // Arrange
      const sessionId = "valid-session-id"; // Replace with a valid session ID from a login test

      // Act
      const response = await request(app).post("/user/logout").send({ sessionId });
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Logout successful");
    });

    it("should return an error for invalid session", async () => {
      // Arrange
      const sessionId = "invalid-session-id";

      // Act
      const response = await request(app).post("/user/logout").send({ sessionId });
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Invalid session");
      expect(responseBody.responseObject).toBeNull();
    });
  });

  describe("PUT /user/change-password", () => {
    const mockUser = userRepository.mockUsers[0];
    let agent: any;
    let sessionCookie: string;

    beforeAll(async () => {
      agent = request.agent(app);
      // Login to get session
      const loginRes = await agent.post("/user/login").send({
        username: mockUser.username,
        password: "password123#124", // plaintext for first user
      });
      expect(loginRes.status).toBe(StatusCodes.OK);
      sessionCookie = loginRes.headers["set-cookie"]?.[0];
    });

    it("should fail if current password is incorrect", async () => {
      const res = await agent.put("/user/change-password").set("Cookie", sessionCookie).send({
        userId: mockUser._id,
        currentPassword: "wrongPassword",
        newPassword: "newPassword!456",
        confirmPassword: "newPassword!456",
      });
      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(res.body.message).toContain("Current password is incorrect");
    });

    it("should fail if newPassword and confirmPassword do not match", async () => {
      const res = await agent.put("/user/change-password").set("Cookie", sessionCookie).send({
        userId: mockUser._id,
        currentPassword: "password123#124",
        newPassword: "newPassword!456",
        confirmPassword: "differentPassword",
      });
      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(res.body.message).toContain("New password and confirm password do not match");
    });

    it("should fail if not logged in", async () => {
      const res = await request(app).put("/user/change-password").send({
        userId: mockUser._id,
        currentPassword: "password123#124",
        newPassword: "newPassword!456",
        confirmPassword: "newPassword!456",
      });
      expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(res.body.message).toContain("Unauthorized");
    });
    it("should change password successfully for logged in user", async () => {
      const res = await agent.put("/user/change-password").set("Cookie", sessionCookie).send({
        userId: mockUser._id,
        currentPassword: "password123#124",
        newPassword: "newPassword!456",
        confirmPassword: "newPassword!456",
      });
      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.message).toContain("Password changed successfully");

      // revert password to original value
      await agent.put("/user/change-password").set("Cookie", sessionCookie).send({
        userId: mockUser._id,
        currentPassword: "newPassword!456",
        newPassword: "password123#124",
        confirmPassword: "password123#124",
      });
      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.message).toContain("Password changed successfully");
    });
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
