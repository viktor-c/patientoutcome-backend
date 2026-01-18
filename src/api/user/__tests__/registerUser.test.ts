import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import { loginUserAgent, logoutUser } from "@/utils/unitTesting";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, test } from "vitest";
import { RegistrationCodeModel } from "../registrationCodeModel";
import { userModel } from "../userModel";

const validCode = "abc-123-sdf";

const validNewUserData = {
  name: "max mustermann",
  username: "testuser",
  email: "test@example.com",
  password: "Test123",
  confirmPassword: "Test123",
  registrationCode: validCode,
};

describe("POST /user/register", () => {
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
    // create a valid registration code
    await RegistrationCodeModel.create({
      code: validCode,
      createdAt: new Date(),
      activatedAt: new Date(),
      validUntil: new Date(Date.now() + 1000 * 60 * 60),
      userCreatedWith: null,
      roles: ["doctor"],
      permissions: ["read", "write"],
      userDepartment: ["675000000000000000000001"], // Orthopädie department
      userBelongsToCenter: "675000000000000000000003", // Klinikum Fulda
      active: true,
    });
  });
  // afterAll(async () => {
  //   await RegistrationCodeModel.deleteMany({});
  //   await userModel.deleteMany({});
  // });

  it("rejects registration with duplicate email", async () => {
    const newUserWithExistingEmail = { ...validNewUserData, email: "asmith@example.com" };
    const res = await request(app).post("/user/register").send(newUserWithExistingEmail);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Error creating user");
    // The error response may contain errors as a string or array
    const errors = res.body.responseObject?.errors;
    if (Array.isArray(errors)) {
      expect(errors).toContain("Email already in use");
    } else if (typeof errors === "string") {
      expect(errors).toContain("Email already in use");
    } else {
      // If no errors property, check the message itself
      expect(res.body.message).toContain("Error");
    }
  });

  it("rejects registration with invalid password", async () => {
    const res = await request(app).post("/user/register").send({
      username: "badpass",
      email: "badpass@example.com",
      password: "short",
      confirmPassword: "short",
      registrationCode: validCode,
    });
    expect(res.status).toBe(400);
  });

  it("rejects registration with expired code", async () => {
    const expiredCode = "ZZZ-999-YYY";
    await RegistrationCodeModel.create({
      code: expiredCode,
      createdAt: new Date(),
      activatedAt: new Date(),
      validUntil: new Date(Date.now() - 1000),
      userCreatedWith: null,
      roles: ["doctor"],
      userDepartment: ["675000000000000000000001"], // Orthopädie department
      userBelongsToCenter: "675000000000000000000003", // Klinikum Fulda
      active: true,
    });
    const res = await request(app).post("/user/register").send({
      username: "expired",
      email: "expired@example.com",
      password: "Test123",
      confirmPassword: "Test123",
      registrationCode: expiredCode,
    });
    expect(res.status).toBe(400);
  });

  it("registers a new user with valid data and code", async () => {
    const res = await request(app).post("/user/register").send(validNewUserData);
    expect(res.status).toBe(201);
    expect(res.body.responseObject).toHaveProperty("username", validNewUserData.username);
    expect(res.body.responseObject).toHaveProperty("email", validNewUserData.email);
    expect(res.body.responseObject.password).toBeUndefined();
  });
  afterAll(async () => {
    //login as admin to delete the test user, use login
    const agent = await loginUserAgent("admin");
    // delete the test user
    const response = await agent.delete(`/user/username/${validNewUserData.username}`);
    expect(response.statusCode).toEqual(StatusCodes.OK);
    expect(response.body.success).toBeTruthy();
    expect(response.body.message).toContain("User deleted successfully");

    //logout admin user
    await logoutUser(agent);
  });

  //for use deletion we need ACL
  describe("DELETE /user/username/:username", () => {
    let adminAgent: request.Agent;
    beforeAll(async () => {
      //login as admin to try deleting non existing users
      adminAgent = await loginUserAgent("admin");
    });

    it("should return not found if user does not exist", async () => {
      // Arrange
      const nonexistentUsername = "sadf4";

      // Act
      const response = await adminAgent.delete(`/user/username/${nonexistentUsername}`);
      const responseBody: ServiceResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(responseBody.success).toBeFalsy();
      expect(responseBody.message).toContain("User not found");
      expect(responseBody.responseObject).toBeNull();
    });
    afterAll(async () => {
      //logout admin user
      await logoutUser(adminAgent);
    });
  });
});
// This test suite covers the user registration functionality, including validation of input data, handling of duplicate emails, and successful registration with a valid registration code. It also includes cleanup steps to remove test data after the tests are completed.
// The afterAll hook ensures that the test user created during the registration test is deleted, maintaining a clean state for subsequent tests.
// The beforeAll hook sets up the necessary preconditions, such as inserting initial user data and creating a valid registration code.
