import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { beforeAll, describe, expect, it, beforeEach, afterEach } from "vitest";

import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import { loginUserAgent, logoutUser } from "@/utils/unitTesting";
import { RegistrationCodeModel } from "../registrationCodeModel";
import { userModel } from "../userModel";
import type { BatchCreateCodesResponse } from "../userRegistrationService";

describe("Batch User Creation API", () => {
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

  describe("POST /user/batch-registration-codes", () => {
    it("should create batch registration codes when admin is logged in", async () => {
      const agent = await loginUserAgent("admin");

      const batchRequest = {
        roles: [
          { role: "doctor", count: 3 },
          { role: "nurse", count: 2 },
        ],
        department: "Cardiology",
        belongsToCenter: ["center1"],
        expiryType: "days",
        expiryValue: 30,
      };

      const response = await agent.post("/user/batch-registration-codes").send(batchRequest);
      const responseBody: ServiceResponse<BatchCreateCodesResponse> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Batch registration codes created successfully");
      
      // Check that the correct number of codes were created for each role
      expect(responseBody.responseObject.doctor).toHaveLength(3);
      expect(responseBody.responseObject.nurse).toHaveLength(2);

      // Verify all codes are unique
      const allCodes = [
        ...responseBody.responseObject.doctor,
        ...responseBody.responseObject.nurse,
      ];
      const uniqueCodes = new Set(allCodes);
      expect(uniqueCodes.size).toBe(5);

      // Verify codes match the expected format (ABC-123-XYZ with alphanumeric)
      allCodes.forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/);
      });

      // Verify codes exist in database with correct properties
      const createdCodes = await RegistrationCodeModel.find({
        code: { $in: allCodes },
      });
      expect(createdCodes).toHaveLength(5);

      // Check doctor codes
      const doctorCodes = createdCodes.filter((c) => c.roles.includes("doctor"));
      expect(doctorCodes).toHaveLength(3);
      doctorCodes.forEach((code) => {
        expect(code.userDepartment).toBe("Cardiology");
        expect(code.userBelongsToCenter).toEqual(["center1"]);
        expect(code.active).toBe(true);
        // Check expiry is approximately 30 days from now
        const expiryTime = code.validUntil.getTime();
        const expectedTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
        expect(Math.abs(expiryTime - expectedTime)).toBeLessThan(60000); // Within 1 minute
      });

      // Check nurse codes
      const nurseCodes = createdCodes.filter((c) => c.roles.includes("nurse"));
      expect(nurseCodes).toHaveLength(2);
      nurseCodes.forEach((code) => {
        expect(code.userDepartment).toBe("Cardiology");
        expect(code.userBelongsToCenter).toEqual(["center1"]);
        expect(code.active).toBe(true);
      });

      await logoutUser(agent);
    });

    it("should create codes with months expiry type", async () => {
      const agent = await loginUserAgent("admin");

      const batchRequest = {
        roles: [{ role: "doctor", count: 2 }],
        department: "Neurology",
        belongsToCenter: ["center2"],
        expiryType: "months",
        expiryValue: 3,
      };

      const response = await agent.post("/user/batch-registration-codes").send(batchRequest);
      const responseBody: ServiceResponse<BatchCreateCodesResponse> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.doctor).toHaveLength(2);

      // Verify expiry is approximately 3 months from now
      const codes = await RegistrationCodeModel.find({
        code: { $in: responseBody.responseObject.doctor },
      });
      
      codes.forEach((code) => {
        const expiryTime = code.validUntil.getTime();
        const now = new Date();
        const expectedDate = new Date(now);
        expectedDate.setMonth(expectedDate.getMonth() + 3);
        const expectedTime = expectedDate.getTime();
        
        // Allow 1 day tolerance for month calculations
        expect(Math.abs(expiryTime - expectedTime)).toBeLessThan(24 * 60 * 60 * 1000);
      });

      await logoutUser(agent);
    });

    it("should create codes with years expiry type", async () => {
      const agent = await loginUserAgent("admin");

      const batchRequest = {
        roles: [{ role: "nurse", count: 1 }],
        department: "Emergency",
        belongsToCenter: ["center1", "center2"],
        expiryType: "years",
        expiryValue: 1,
      };

      const response = await agent.post("/user/batch-registration-codes").send(batchRequest);
      const responseBody: ServiceResponse<BatchCreateCodesResponse> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.nurse).toHaveLength(1);

      // Verify expiry is approximately 1 year from now
      const codes = await RegistrationCodeModel.find({
        code: { $in: responseBody.responseObject.nurse },
      });
      
      codes.forEach((code) => {
        const expiryTime = code.validUntil.getTime();
        const now = new Date();
        const expectedDate = new Date(now);
        expectedDate.setFullYear(expectedDate.getFullYear() + 1);
        const expectedTime = expectedDate.getTime();
        
        // Allow 1 day tolerance
        expect(Math.abs(expiryTime - expectedTime)).toBeLessThan(24 * 60 * 60 * 1000);
      });

      await logoutUser(agent);
    });

    it("should create codes with absolute date expiry", async () => {
      const agent = await loginUserAgent("admin");

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      const futureDateString = futureDate.toISOString(); // Full ISO datetime

      const batchRequest = {
        roles: [{ role: "doctor", count: 1 }],
        department: "Orthopedics",
        belongsToCenter: ["center3"],
        expiryType: "date",
        expiryValue: futureDateString,
      };

      const response = await agent.post("/user/batch-registration-codes").send(batchRequest);
      const responseBody: ServiceResponse<BatchCreateCodesResponse> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.doctor).toHaveLength(1);

      // Verify expiry matches the specified date
      const codes = await RegistrationCodeModel.find({
        code: { $in: responseBody.responseObject.doctor },
      });
      
      codes.forEach((code) => {
        const expiryTime = code.validUntil.getTime();
        const expectedTime = new Date(futureDateString).getTime();
        expect(Math.abs(expiryTime - expectedTime)).toBeLessThan(1000); // Within 1 second
      });

      await logoutUser(agent);
    });

    it("should reject batch creation when not logged in as admin", async () => {
      const agent = await loginUserAgent("doctor");

      const batchRequest = {
        roles: [{ role: "nurse", count: 1 }],
        department: "Oncology",
        belongsToCenter: ["center1"],
        expiryType: "days",
        expiryValue: 7,
      };

      const response = await agent.post("/user/batch-registration-codes").send(batchRequest);

      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN);

      await logoutUser(agent);
    });

    it("should reject batch creation when not authenticated", async () => {
      const batchRequest = {
        roles: [{ role: "doctor", count: 1 }],
        department: "Surgery",
        belongsToCenter: ["center1"],
        expiryType: "months",
        expiryValue: 1,
      };

      const response = await request(app)
        .post("/user/batch-registration-codes")
        .send(batchRequest);

      expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });

    it("should validate request schema - reject invalid count", async () => {
      const agent = await loginUserAgent("admin");

      const batchRequest = {
        roles: [{ role: "doctor", count: 150 }], // exceeds max of 100
        department: "Radiology",
        belongsToCenter: ["center1"],
        expiryType: "days",
        expiryValue: 30,
      };

      const response = await agent.post("/user/batch-registration-codes").send(batchRequest);

      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);

      await logoutUser(agent);
    });

    it("should validate request schema - reject missing required fields", async () => {
      const agent = await loginUserAgent("admin");

      const batchRequest = {
        roles: [{ role: "doctor", count: 2 }],
        // missing department
        belongsToCenter: ["center1"],
        expiryType: "days",
        expiryValue: 30,
      };

      const response = await agent.post("/user/batch-registration-codes").send(batchRequest);

      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);

      await logoutUser(agent);
    });

    it("should handle creating zero codes for a role", async () => {
      const agent = await loginUserAgent("admin");

      const batchRequest = {
        roles: [
          { role: "doctor", count: 2 },
          { role: "nurse", count: 0 }, // zero count
        ],
        department: "ICU",
        belongsToCenter: ["center1"],
        expiryType: "days",
        expiryValue: 14,
      };

      const response = await agent.post("/user/batch-registration-codes").send(batchRequest);
      const responseBody: ServiceResponse<BatchCreateCodesResponse> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.doctor).toHaveLength(2);
      expect(responseBody.responseObject.nurse).toBeUndefined(); // Zero count roles are not included

      await logoutUser(agent);
    });

    it("should create codes for multiple centers", async () => {
      const agent = await loginUserAgent("admin");

      const batchRequest = {
        roles: [{ role: "admin", count: 1 }],
        department: "Administration",
        belongsToCenter: ["center1", "center2", "center3"],
        expiryType: "months",
        expiryValue: 6,
      };

      const response = await agent.post("/user/batch-registration-codes").send(batchRequest);
      const responseBody: ServiceResponse<BatchCreateCodesResponse> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.admin).toHaveLength(1);

      // Verify code has all centers
      const codes = await RegistrationCodeModel.find({
        code: { $in: responseBody.responseObject.admin },
      });
      
      expect(codes[0].userBelongsToCenter).toHaveLength(3);
      expect(codes[0].userBelongsToCenter).toContain("center1");
      expect(codes[0].userBelongsToCenter).toContain("center2");
      expect(codes[0].userBelongsToCenter).toContain("center3");

      await logoutUser(agent);
    });
  });

  describe("GET /user/check-username/:username", () => {
    beforeEach(async () => {
      // Ensure we have a clean state with seeded users
      await request(app).get("/seed/users/reset");
    });

    it("should return available for non-existent username", async () => {
      const response = await request(app).get("/user/check-username/uniqueuser123");
      const responseBody: ServiceResponse<{ available: boolean; suggestions?: string[] }> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.available).toBe(true);
      expect(responseBody.responseObject.suggestions).toBeUndefined();
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
      
      // Verify suggestion is different from the original username
      expect(responseBody.responseObject.suggestion).not.toBe("ewilson");
      expect(responseBody.responseObject.suggestion).toMatch(/^ewilson\d+$/); // Should be ewilson followed by numbers
    });

    it("should validate username format - reject too short", async () => {
      const response = await request(app).get("/user/check-username/ab");

      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });

    it("should accept long usernames", async () => {
      const longUsername = "a".repeat(30); // long but valid
      const response = await request(app).get("/user/check-username/" + longUsername);

      expect(response.statusCode).toEqual(StatusCodes.OK);
    });

    it("should accept usernames with special characters", async () => {
      const response = await request(app).get("/user/check-username/user_name-123");

      expect(response.statusCode).toEqual(StatusCodes.OK);
    });

    it("should handle case-sensitive username check", async () => {
      // 'ewilson' exists, check with different case - should be available
      const response = await request(app).get("/user/check-username/EWILSON");
      const responseBody: ServiceResponse<{ available: boolean; suggestion?: string }> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      // Username check is case-sensitive, so EWILSON is available
      expect(responseBody.responseObject.available).toBe(true);
    });

    it("should provide unique suggestion", async () => {
      const response = await request(app).get("/user/check-username/ewilson");
      const responseBody: ServiceResponse<{ available: boolean; suggestion?: string }> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.responseObject.suggestion).toBeDefined();
      expect(responseBody.responseObject.suggestion).toMatch(/^ewilson\d+$/);
      
      // Verify suggestion doesn't exist in database
      const existingUser = await userModel.findOne({
        username: responseBody.responseObject.suggestion,
      });
      expect(existingUser).toBeNull();
    });
  });
});
