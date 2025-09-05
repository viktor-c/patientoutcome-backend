import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import type { User } from "@/api/user/userModel";
import { userRepository } from "@/api/user/userRepository";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import type { ObjectId } from "mongoose";

import { loginUserWithRole, logoutUserWithCookie } from "@/utils/unitTesting";
import type TestAgent from "supertest/lib/agent";

describe("User API Endpoints", () => {
  // seed users and all registration codes before all tests
  beforeAll(async () => {
    // setup first users
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
    it("should return a list of users, when at least admin is logged in", async () => {
      const { agent, sessionCookie } = await loginUserWithRole("admin");
      // Act
      const response = await agent.get("/user").set("Cookie", sessionCookie);
      const responseBody: ServiceResponse<User[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Users found");
      expect(responseBody.responseObject.length).toEqual(userRepository.mockUsers.length);
      responseBody.responseObject.forEach((user, index) => compareUsers(userRepository.mockUsers[index] as User, user));

      // logout user to clear session cookie
      await logoutUserWithCookie(agent, sessionCookie);
    });
    it("should return error, when not admin is logged in", async () => {
      const { agent, sessionCookie } = await loginUserWithRole("doctor");
      // Act
      const response = await agent.get("/user").set("Cookie", sessionCookie);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Forbidden");
      expect(responseBody.responseObject).toBeUndefined();

      // logout user to clear session cookie
      await logoutUserWithCookie(agent, sessionCookie);
    });
    it("should return an error, when no user is logged in", async () => {
      const response = await request(app).get("/user");
      expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("GET /user/kiosk-users", () => {
    it("should return a list of kiosk users for authenticated users", async () => {
      const { agent, sessionCookie } = await loginUserWithRole("student");
      // Act
      const response = await agent.get("/user/kiosk-users").set("Cookie", sessionCookie);
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

      // logout user to clear session cookie
      await logoutUserWithCookie(agent, sessionCookie);
    });

    it("should return kiosk users for any authenticated user role", async () => {
      const { agent, sessionCookie } = await loginUserWithRole("doctor");
      // Act
      const response = await agent.get("/user/kiosk-users").set("Cookie", sessionCookie);
      const responseBody: ServiceResponse<User[]> = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Kiosk users found");

      // logout user to clear session cookie
      await logoutUserWithCookie(agent, sessionCookie);
    });

    it("should return an error when no user is logged in", async () => {
      const response = await request(app).get("/user/kiosk-users");
      expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  // get user by id
  describe("GET /user/:id", () => {
    let adminTestAgent: TestAgent;
    let adminSessionCookie: string;
    beforeAll(async () => {
      const { agent, sessionCookie } = await loginUserWithRole("admin");
      // Save the agent and sessionCookie for use in tests
      adminTestAgent = agent;
      adminSessionCookie = sessionCookie;
    });

    it("should return a user for a valid ID, when admin is logged in", async () => {
      // Arrange
      const testId = userRepository.mockUsers[0]._id;

      // Act
      const response = await adminTestAgent.get(`/user/${testId}`).set("Cookie", adminSessionCookie);
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
      const response = await adminTestAgent.get(`/user/${testId}`).set("Cookie", adminSessionCookie);
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
      const response = await adminTestAgent.get(`/user/${testId}`).set("Cookie", adminSessionCookie);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return a BAD REQUEST for invalid ID format", async () => {
      // Act
      const invalidInput = "abc";
      const response = await adminTestAgent.get(`/user/${invalidInput}`).set("Cookie", adminSessionCookie);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
      expect(responseBody.responseObject).toBeNull();
    });
  });

  // update user
  describe("PUT /user/update/:id", () => {
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

    it("should update a user successfully", async () => {
      // Arrange
      //first login user, use useragent to save session cookie, then update the user
      const updatedData = { name: "Updated Name" };
      const originalData = { name: userRepository.mockUsers[0].name };
      const expectedUser = userRepository.mockUsers[0] as User;
      expectedUser.name = updatedData.name;

      // Act
      const response = await agent.put("/user/update").set("Cookie", sessionCookie).send(updatedData);
      const responseBody: ServiceResponse = response.body;
      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("User updated successfully");
      expect(responseBody.responseObject).toBeDefined();
      expect(responseBody.responseObject).toHaveProperty("name", updatedData.name);
    });

    it("should return an error if id is not valid", async () => {
      const updatedData = { name: "Updated Name", _id: "invalid" };

      // Act
      const response = await agent.put("/user/update").set("Cookie", sessionCookie).send(updatedData);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("Validation error");
      expect(responseBody.responseObject).toBeNull();
    });

    it("should return an error if user is not logged in", async () => {
      //first logout the user
      const responseLogout = await agent.get("/user/logout").set("Cookie", sessionCookie);
      expect(responseLogout.statusCode).toEqual(StatusCodes.OK);

      // Arrange
      const updatedData = { name: "Updated Name" };
      const response = await agent.put("/user/update").set("Cookie", sessionCookie).send(updatedData);

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
  expect(responseUser.roles).toEqual(mockUser.roles);
}
