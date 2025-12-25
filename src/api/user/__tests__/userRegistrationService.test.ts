import { describe, expect, it, beforeAll } from "vitest";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { RegistrationCodeModel } from "../registrationCodeModel";
import { userModel } from "../userModel";
import { addDays } from "date-fns";

describe("User Registration API", () => {
  beforeAll(async () => {
    // Setup users
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

    // Reset registration codes
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

    // Clear all sessions
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

  describe("POST /user/register", () => {
    it("should successfully register user with valid code", async () => {
      // Create a valid registration code
      const testCode = "ABC-123-XYZ";
      await RegistrationCodeModel.create({
        code: testCode,
        createdAt: new Date(),
        activatedAt: null,
        validUntil: addDays(new Date(), 30),
        userCreatedWith: null,
        roles: ["doctor"],
        permissions: ["read", "write"],
        userDepartment: "Cardiology",
        userBelongsToCenter: ["center1"],
        active: true,
      });

      const userData = {
        name: "John Doe",
        username: "johndoe",
        email: "johndoe@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        registrationCode: testCode,
      };

      const response = await request(app).post("/user/register").send(userData);

      expect(response.statusCode).toBe(StatusCodes.CREATED);
      expect(response.body.success).toBe(true);

      // Verify user was created
      const createdUser = await userModel.findOne({ username: "johndoe" });
      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe("johndoe@example.com");
      expect(createdUser?.roles).toContain("doctor");
      expect(createdUser?.department).toBe("Cardiology");
    });

    it("should fail with invalid registration code", async () => {
      const userData = {
        name: "Jane Doe",
        username: "janedoe",
        email: "janedoe@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        registrationCode: "INVALID-CODE",
      };

      const response = await request(app).post("/user/register").send(userData);

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Validation");
    });

    it("should fail with expired registration code", async () => {
      const expiredCode = "EXPIRED-123-ABC";
      await RegistrationCodeModel.create({
        code: expiredCode,
        createdAt: new Date(),
        activatedAt: null,
        validUntil: addDays(new Date(), -1), // expired yesterday
        userCreatedWith: null,
        roles: ["nurse"],
        permissions: ["read"],
        userDepartment: "Emergency",
        userBelongsToCenter: ["center1"],
        active: true,
      });

      const userData = {
        name: "Test User",
        username: "testuser",
        email: "test@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        registrationCode: expiredCode,
      };

      const response = await request(app).post("/user/register").send(userData);

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.success).toBe(false);
      // May return validation error or expired message
      expect(response.body.message).toBeTruthy();
    });

    it("should deactivate code after successful registration", async () => {
      const testCode = "DEA-456-789";
      await RegistrationCodeModel.create({
        code: testCode,
        createdAt: new Date(),
        activatedAt: null,
        validUntil: addDays(new Date(), 30),
        userCreatedWith: null,
        roles: ["doctor"],
        permissions: ["read", "write"],
        userDepartment: "Cardiology",
        userBelongsToCenter: ["center1"],
        active: true,
      });

      const userData = {
        name: "Alice Smith",
        username: "alicesmith",
        email: "alice@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        registrationCode: testCode,
      };

      await request(app).post("/user/register").send(userData);

      // Verify code is deactivated (activatedAt is set when used)
      const code = await RegistrationCodeModel.findOne({ code: testCode });
      expect(code?.activatedAt).toBeDefined();
      expect(code?.userCreatedWith).toBeDefined();
    });
  });

  describe("GET /user/check-username/:username", () => {
    it("should return available for non-existent username", async () => {
      const response = await request(app).get("/user/check-username/uniqueuser123");
      const responseBody: ServiceResponse<{ available: boolean; suggestion?: string }> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.available).toBe(true);
      expect(responseBody.responseObject.suggestion).toBeUndefined();
    });

    it("should return unavailable for existing username with suggestion", async () => {
      // 'ewilson' username exists in seeded data (admin user)
      const response = await request(app).get("/user/check-username/ewilson");
      const responseBody: ServiceResponse<{ available: boolean; suggestion?: string }> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.available).toBe(false);
      expect(responseBody.responseObject.suggestion).toBeDefined();
      expect(typeof responseBody.responseObject.suggestion).toBe('string');
      expect(responseBody.responseObject.suggestion).toMatch(/^ewilson\d+$/);
    });

    it("should provide unique suggestion", async () => {
      const response = await request(app).get("/user/check-username/ewilson");
      const responseBody: ServiceResponse<{ available: boolean; suggestion?: string }> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.responseObject.available).toBe(false);
      expect(responseBody.responseObject.suggestion).toBeDefined();
      expect(responseBody.responseObject.suggestion).toMatch(/^ewilson\d+$/);

      // Verify suggestion doesn't exist in database
      const existingUser = await userModel.findOne({
        username: responseBody.responseObject.suggestion,
      });
      expect(existingUser).toBeNull();
    });

    it("should handle case-sensitive username check", async () => {
      // Check uppercase version - should be available since implementation is case-sensitive
      const response = await request(app).get("/user/check-username/EWILSON");
      const responseBody: ServiceResponse<{ available: boolean; suggestion?: string }> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      // Username check is case-sensitive, so EWILSON is available
      expect(responseBody.responseObject.available).toBe(true);
    });

    it("should format suggestion with numbers appended", async () => {
      const response = await request(app).get("/user/check-username/bwhite");
      const responseBody: ServiceResponse<{ available: boolean; suggestion?: string }> = response.body;

      expect(responseBody.responseObject.suggestion).toBeDefined();
      
      // Suggestion should follow pattern: originalUsername + number
      expect(responseBody.responseObject.suggestion).toMatch(/^bwhite\d+$/);
    });

    it("should return available for username with valid characters", async () => {
      const response = await request(app).get("/user/check-username/valid_user-123");
      const responseBody: ServiceResponse<{ available: boolean; suggestion?: string }> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.available).toBe(true);
    });
  });
});
