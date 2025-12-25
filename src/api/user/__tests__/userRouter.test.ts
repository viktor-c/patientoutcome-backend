import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import type { User } from "@/api/user/userModel";
import { userRepository } from "@/api/user/userRepository";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import type { ObjectId } from "mongoose";

import { loginUserAgent, loginUserWithRole, logoutUser, logoutUserWithCookie } from "@/utils/unitTesting";
import type TestAgent from "supertest/lib/agent";

import { z } from "zod";

describe("User API Endpoints", () => {
  // seed users and all registration codes before all tests
  beforeAll(async () => {
    // setup first users - use reset to ensure fresh data
    try {
      const res = await request(app).get("/seed/users/reset");
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
    // reset all registration codes
    try {
      const res = await request(app).get("/seed/user-registration-codes");
      if (res.status !== StatusCodes.OK) {
        throw new Error("Failed to insert user registration code data");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Setup failed for user registration code data: ${error.message}`);
      } else {
        throw new Error("Setup failed for user registration code data: Unknown error");
      }
    }

    // reset all user sessions
    try {
      const res = await request(app).get("/seed/clear-all-sessions");
      if (res.status !== StatusCodes.OK) {
        throw new Error("Failed to clear user sessions");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Setup failed for clearing user sessions: ${error.message}`);
      } else {
        throw new Error("Setup failed for clearing user sessions: Unknown error");
      }
    }
  });
  describe("GET /user", () => {
    it("should return all users when admin is logged in", async () => {
      const agent = await loginUserAgent("admin");
      // Act
      const response = await agent.get("/user");
      const responseBody: ServiceResponse<User[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Users found");
      // At least the mock users should be present (may be more if other tests created users)
      expect(responseBody.responseObject.length).toBeGreaterThanOrEqual(userRepository.mockUsers.length);

      // logout user to clear session
      await logoutUser(agent);
    });

    it("should return only users from same department for non-admin users", async () => {
      const agent = await loginUserAgent("doctor"); // bwhite user in "Oncology" department
      // Act
      const response = await agent.get("/user");
      const responseBody: ServiceResponse<User[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Users found");

      const sameDepartmentUsers = userRepository.mockUsers.filter(
        (user) => user.department === responseBody.responseObject[0].department,
      );
      expect(responseBody.responseObject.length).toEqual(sameDepartmentUsers.length);

      // Department is now returned as ID, not name
      expect(responseBody.responseObject[0].department).toEqual("675000000000000000000001");
      const expectedUsername = sameDepartmentUsers[0].username;
      expect(responseBody.responseObject[0].username).toEqual(expectedUsername);

      // logout user to clear session
      await logoutUser(agent);
    });

    it("should return users filtered by role from same department for non-admin users", async () => {
      const agent = await loginUserAgent("developer"); // victor user in "Orthopädie" department
      // Act - filter by kiosk role
      const response = await agent.get("/user?role=kiosk");
      const responseBody: ServiceResponse<User[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Users found");

      // Should return kiosk users from "Orthopädie" department (kiosk1, kiosk2)
      expect(responseBody.responseObject.length).toEqual(2);
      responseBody.responseObject.forEach((user) => {
        // Department is now returned as ID, not name
        expect(user.department).toEqual("675000000000000000000001");
        expect(user.roles).toContain("kiosk");
      });

      // logout user to clear session
      await logoutUser(agent);
    });

    it("should return users filtered by role from all departments for admin users", async () => {
      const agent = await loginUserAgent("admin"); // admin user
      // Act - filter by kiosk role
      const response = await agent.get("/user?role=kiosk");
      const responseBody: ServiceResponse<User[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Users found");

      // Should return all kiosk users from all departments
      expect(responseBody.responseObject.length).toEqual(2);
      responseBody.responseObject.forEach((user) => {
        expect(user.roles).toContain("kiosk");
      });

      // logout user to clear session
      await logoutUser(agent);
    });

    it("should return an error when no user is logged in", async () => {
      const response = await request(app).get("/user");
      expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toContain("Authentication required");
    });

    it("should return no users found when role filter returns no results", async () => {
      const agent = await loginUserAgent("mfa"); // asmith user in "Orthopädie" department
      // Act - filter by a role that doesn't exist in the Orthopädie department
      const response = await agent.get("/user?role=nonexistent-role");
      const responseBody: ServiceResponse<User[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("No Users found");

      // logout user to clear session
      await logoutUser(agent);
    });
  });

  describe("GET /user/kiosk-users", () => {
    it("should return a list of kiosk users for authenticated users", async () => {
      const agent = await loginUserAgent("student");
      // Act
      const response = await agent.get("/user/kiosk-users");
      const responseBody: ServiceResponse<User[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Kiosk users found");
      expect(responseBody.responseObject.length).toBeGreaterThan(0);
      // Check that all returned users have kiosk role
      responseBody.responseObject.forEach((user) => {
        expect(user.roles).toContain("kiosk");
      });

      // logout user to clear session
      await logoutUser(agent);
    });

    it("should return kiosk users for any authenticated user role", async () => {
      const agent = await loginUserAgent("doctor");
      // Act
      const response = await agent.get("/user/kiosk-users");
      const responseBody: ServiceResponse<User[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Kiosk users found");

      // logout user to clear session
      await logoutUser(agent);
    });

    it("should return an error when no user is logged in", async () => {
      const response = await request(app).get("/user/kiosk-users");
      expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  // get user by id
  describe("GET /user/:id", () => {
    let adminTestAgent: TestAgent;
    beforeAll(async () => {
      adminTestAgent = await loginUserAgent("admin");
    });

    it("should return a user for a valid ID, when admin is logged in", async () => {
      // Arrange
      const testId = userRepository.mockUsers[0]._id;

      // Act
      const response = await adminTestAgent.get(`/user/${testId}`);
      const responseBody: ServiceResponse<User> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("User found");
    });

    it("should return a NOT FOUND for nonexistent ID", async () => {
      // Arrange
      const testId = "123412341234123412341234";

      // Act
      const response = await adminTestAgent.get(`/user/${testId}`);
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
      const response = await adminTestAgent.get(`/user/${testId}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
      expect(Array.isArray(responseBody.responseObject)).toBeTruthy();
      expect(responseBody.responseObject.length).toBeGreaterThan(0);
    });

    it("should return a BAD REQUEST for invalid ID format", async () => {
      // Act
      const invalidInput = "abc";
      const response = await adminTestAgent.get(`/user/${invalidInput}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
      expect(Array.isArray(responseBody.responseObject)).toBeTruthy();
      expect(responseBody.responseObject.length).toBeGreaterThan(0);
    });
  });

  // update user
  describe("PUT /user/update/:id", () => {
    const mockUser = userRepository.mockUsers[0];

    it("should update a user successfully", async () => {
      const agent = await loginUserAgent("admin");
      // Arrange
      //first login user, use useragent to save session cookie, then update the user
      const updatedData = { name: "Updated Name" };
      const originalData = { name: userRepository.mockUsers[0].name };
      const expectedUser = userRepository.mockUsers[0] as User;
      const originalName = expectedUser.name; // Store original name
      expectedUser.name = updatedData.name;

      // Act
      const response = await agent.put("/user/update").send(updatedData);
      const responseBody: ServiceResponse = response.body;
      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("User updated successfully");
      expect(responseBody.responseObject).toBeDefined();
      expect(responseBody.responseObject).toHaveProperty("name", updatedData.name);

      // Restore original data to avoid affecting other tests
      expectedUser.name = originalName;
    });

    it("should return an error if id is not valid", async () => {
      const agent = await loginUserAgent("admin");
      const updatedData = { name: "Updated Name", _id: "invalid" };

      // Act
      const response = await agent.put("/user/update").send(updatedData);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
      expect(Array.isArray(responseBody.responseObject)).toBeTruthy();
      expect(responseBody.responseObject.length).toBeGreaterThan(0);
    });

    it("should return an error if user is not logged in", async () => {
      const agent = await loginUserAgent("admin");
      //first logout the user
      await logoutUser(agent);

      // Arrange
      const updatedData = { name: "Updated Name" };
      const response = await agent.put("/user/update").send(updatedData);

      expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("POST /user/login", () => {
    it("should login a user successfully and include roles in response", async () => {
      // Arrange
      const expectedUser = userRepository.mockUsers[0];
      const loginData = {
        username: expectedUser.username,
        password: "password123#124",
      };

      // Act
      const response = await request(app).post("/user/login").send(loginData);
      const responseBody: ServiceResponse<any> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Login successful");
      expect(responseBody.responseObject).toBeDefined();
      expect(responseBody.responseObject.roles).toEqual(expectedUser.roles);
      expect(responseBody.responseObject.username).toEqual(expectedUser.username);
      expect(responseBody.responseObject.name).toEqual(expectedUser.name);
      expect(responseBody.responseObject.department).toEqual(expectedUser.department);
      expect(responseBody.responseObject.email).toEqual(expectedUser.email);
      expect(responseBody.responseObject.belongsToCenter).toEqual(expectedUser.belongsToCenter);
      // Ensure password is not included in response
      expect(responseBody.responseObject.password).toBeUndefined();
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

  describe("PUT /user/change-password", () => {
    const mockUser = userRepository.mockUsers[0];

    it("should fail if current password is incorrect", async () => {
      const agent = await loginUserAgent("admin");
      const res = await agent.put("/user/change-password").send({
        currentPassword: "wrongPassword",
        newPassword: "newPassword!456",
        confirmPassword: "newPassword!456",
      });
      const responseBody: ServiceResponse = res.body;
      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Current password is incorrect");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should fail if newPassword and confirmPassword do not match", async () => {
      const agent = await loginUserAgent("admin");
      const res = await agent.put("/user/change-password").send({
        currentPassword: "password123#124",
        newPassword: "newPassword!456",
        confirmPassword: "differentPassword",
      });
      const responseBody: ServiceResponse = res.body;
      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("New password and confirm password do not match");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should fail if not logged in", async () => {
      const res = await request(app).put("/user/change-password").send({
        currentPassword: "password123#124",
        newPassword: "newPassword!456",
        confirmPassword: "newPassword!456",
      });
      const responseBody: ServiceResponse = res.body;
      expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Authentication required");
      expect(responseBody.responseObject).toBeNull();
    });
    it("should change password successfully for logged in user", async () => {
      const agent = await loginUserAgent("admin");
      const res = await agent.put("/user/change-password").send({
        currentPassword: "password123#124",
        newPassword: "newPassword!456",
        confirmPassword: "newPassword!456",
      });
      const responseBody: ServiceResponse = res.body;
      expect(res.status).toBe(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Password changed successfully");

      // revert password to original value
      await agent.put("/user/change-password").send({
        currentPassword: "newPassword!456",
        newPassword: "password123#124",
        confirmPassword: "password123#124",
      });
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
  expect(responseUser.roles).toEqual(mockUser.roles);
}
