/**
 * @file Setup Router Tests
 * @description Tests for setup endpoints to ensure responses match OpenAPI spec
 */

import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { userModel } from "@/api/user/userModel";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import type { CreateAdminRequest, SetupStatus } from "../setupModel";

describe("Setup API Endpoints", () => {
  let testAdminId: string | null = null;

  beforeAll(async () => {
    // Clear all users to ensure clean state for setup tests
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test admin user if created
    if (testAdminId) {
      await userModel.findByIdAndDelete(testAdminId);
    }
  });

  describe("GET /setup/status", () => {
    it("should return setup status when no admin exists", async () => {
      // Ensure no admin users exist
      await userModel.deleteMany({ roles: { $in: ["admin"] } });

      const response = await request(app).get("/setup/status");
      const result: ServiceResponse<SetupStatus> = response.body;

      // Validate HTTP status
      expect(response.statusCode).toEqual(StatusCodes.OK);

      // Validate ServiceResponse structure
      expect(result.success).toBe(true);
      expect(result.message).toBe("Setup status retrieved successfully");
      expect(result.statusCode).toBe(StatusCodes.OK);

      // Validate SetupStatus data structure matches OpenAPI spec
      expect(result.responseObject).toBeDefined();
      expect(result.responseObject).toHaveProperty("setupRequired");
      expect(result.responseObject).toHaveProperty("hasAdminUser");
      expect(result.responseObject).toHaveProperty("hasAnyUsers");
      expect(result.responseObject).toHaveProperty("databaseConnected");

      // Validate correct values
      expect(result.responseObject.setupRequired).toBe(true);
      expect(result.responseObject.hasAdminUser).toBe(false);
      expect(result.responseObject.databaseConnected).toBe(true);

      // Validate types
      expect(typeof result.responseObject.setupRequired).toBe("boolean");
      expect(typeof result.responseObject.hasAdminUser).toBe("boolean");
      expect(typeof result.responseObject.hasAnyUsers).toBe("boolean");
      expect(typeof result.responseObject.databaseConnected).toBe("boolean");
    });

    it("should return setup status when admin exists", async () => {
      // Create a test admin user
      const adminUser = await userModel.create({
        username: "test-admin-status",
        password: "$2b$10$abcdefghijklmnopqrstuv", // Mock hashed password
        name: "Test Admin",
        email: "test-admin@example.com",
        department: "675000000000000000000001",
        belongsToCenter: ["1"],
        roles: ["admin"],
        permissions: [],
        lastLogin: new Date().toISOString(),
      });

      testAdminId = adminUser._id.toString();

      const response = await request(app).get("/setup/status");
      const result: ServiceResponse<SetupStatus> = response.body;

      // Validate HTTP status
      expect(response.statusCode).toEqual(StatusCodes.OK);

      // Validate ServiceResponse structure
      expect(result.success).toBe(true);
      expect(result.message).toBe("Setup status retrieved successfully");
      expect(result.statusCode).toBe(StatusCodes.OK);

      // Validate SetupStatus data - admin exists now
      expect(result.responseObject).toBeDefined();
      expect(result.responseObject.setupRequired).toBe(false);
      expect(result.responseObject.hasAdminUser).toBe(true);
      expect(result.responseObject.hasAnyUsers).toBe(true);
      expect(result.responseObject.databaseConnected).toBe(true);

      // Clean up
      await userModel.findByIdAndDelete(testAdminId);
      testAdminId = null;
    });
  });

  describe("POST /setup/create-admin", () => {
    beforeAll(async () => {
      // Ensure no admin users exist before these tests
      await userModel.deleteMany({ roles: { $in: ["admin"] } });
    });

    afterAll(async () => {
      // Clean up any admin users created during tests
      await userModel.deleteMany({ username: { $regex: /^test-setup-admin/ } });
    });

    it("should create admin user with valid data", async () => {
      // Ensure no admin exists
      await userModel.deleteMany({ roles: { $in: ["admin"] } });

      const adminData: CreateAdminRequest = {
        username: "test-setup-admin1",
        password: "SecurePass123!",
        name: "Test Setup Admin",
        email: "setup-admin@example.com",
        department: "Administration",
        belongsToCenter: ["1"],
      };

      const response = await request(app).post("/setup/create-admin").send(adminData);
      const result = response.body;

      // Validate HTTP status - should be 201 CREATED
      expect(response.statusCode).toEqual(StatusCodes.CREATED);

      // Validate response structure matches OpenAPI spec
      expect(result.success).toBe(true);
      expect(result.message).toBe("Admin user created successfully");
      expect(result.statusCode).toBe(StatusCodes.CREATED);

      // Validate data structure - should have adminUserId
      expect(result.responseObject).toBeDefined();
      expect(result.responseObject).toHaveProperty("adminUserId");
      expect(typeof result.responseObject.adminUserId).toBe("string");
      expect(result.responseObject.adminUserId).toMatch(/^[0-9a-f]{24}$/); // MongoDB ObjectId format

      // Verify user was actually created in database
      const createdUser = await userModel.findById(result.responseObject.adminUserId);
      expect(createdUser).toBeDefined();
      expect(createdUser?.username).toBe(adminData.username);
      expect(createdUser?.roles).toContain("admin");
      expect(createdUser?.email).toBe(adminData.email);
      expect(createdUser?.name).toBe(adminData.name);

      testAdminId = result.responseObject.adminUserId;
    });

    it("should return 409 CONFLICT when admin already exists", async () => {
      // Admin was created in previous test
      const adminData: CreateAdminRequest = {
        username: "test-setup-admin2",
        password: "SecurePass123!",
        name: "Another Admin",
        email: "another-admin@example.com",
        department: "Administration",
        belongsToCenter: ["1"],
      };

      const response = await request(app).post("/setup/create-admin").send(adminData);
      const result = response.body;

      // Validate HTTP status - should be 409 CONFLICT
      expect(response.statusCode).toEqual(StatusCodes.CONFLICT);

      // Validate response structure
      expect(result.success).toBe(false);
      expect(result.message).toBe("Setup already completed - admin user already exists");
      expect(result.statusCode).toBe(StatusCodes.CONFLICT);
      expect(result.responseObject).toBeNull();
    });

    it("should return 409 CONFLICT when username already exists", async () => {
      // Try to create admin with same username
      const adminData: CreateAdminRequest = {
        username: "test-setup-admin1", // Same as first test
        password: "SecurePass123!",
        name: "Duplicate Username",
        email: "duplicate@example.com",
        department: "Administration",
        belongsToCenter: ["1"],
      };

      const response = await request(app).post("/setup/create-admin").send(adminData);
      const result = response.body;

      // Validate HTTP status
      expect(response.statusCode).toEqual(StatusCodes.CONFLICT);

      // Validate response structure
      expect(result.success).toBe(false);
      // When admin already exists, it checks that first before username
      expect(result.message).toContain("Setup already completed");
      expect(result.statusCode).toBe(StatusCodes.CONFLICT);
      expect(result.responseObject).toBeNull();
    });

    it("should return 400 BAD_REQUEST with invalid username", async () => {
      // Clear admin users for this test
      await userModel.deleteMany({ roles: { $in: ["admin"] } });

      const invalidData = {
        username: "ab", // Too short (min 3 chars)
        password: "SecurePass123!",
        name: "Test Admin",
        email: "test@example.com",
        department: "Administration",
        belongsToCenter: ["1"],
      };

      const response = await request(app).post("/setup/create-admin").send(invalidData);
      const result = response.body;

      // Validate HTTP status
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);

      // Validate response structure
      expect(result.success).toBe(false);
      expect(result.message).toContain("Validation error");
      expect(result.message).toContain("Username must be at least 3 characters");
      expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
      // Validation errors return null, not undefined
      expect(result.responseObject).toBe(null);
    });

    it("should return 400 BAD_REQUEST with invalid username characters", async () => {
      // Clear admin users for this test
      await userModel.deleteMany({ roles: { $in: ["admin"] } });

      const invalidData = {
        username: "admin@user!", // Invalid characters
        password: "SecurePass123!",
        name: "Test Admin",
        email: "test@example.com",
        department: "Administration",
        belongsToCenter: ["1"],
      };

      const response = await request(app).post("/setup/create-admin").send(invalidData);
      const result = response.body;

      // Validate HTTP status
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);

      // Validate response structure
      expect(result.success).toBe(false);
      expect(result.message).toContain("Validation error");
      expect(result.message).toContain("Username can only contain letters, numbers, underscores, and hyphens");
      expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(result.responseObject).toBe(null);
    });

    it("should return 400 BAD_REQUEST with weak password", async () => {
      // Clear admin users for this test
      await userModel.deleteMany({ roles: { $in: ["admin"] } });

      const invalidData = {
        username: "test-admin",
        password: "weak", // Too short, no uppercase, no special char
        name: "Test Admin",
        email: "test@example.com",
        department: "Administration",
        belongsToCenter: ["1"],
      };

      const response = await request(app).post("/setup/create-admin").send(invalidData);
      const result = response.body;

      // Validate HTTP status
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);

      // Validate response structure
      expect(result.success).toBe(false);
      expect(result.message).toContain("Validation error");
      expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(result.responseObject).toBe(null);
    });

    it("should return 400 BAD_REQUEST with invalid email", async () => {
      // Clear admin users for this test
      await userModel.deleteMany({ roles: { $in: ["admin"] } });

      const invalidData = {
        username: "test-admin",
        password: "SecurePass123!",
        name: "Test Admin",
        email: "not-an-email", // Invalid email format
        department: "Administration",
        belongsToCenter: ["1"],
      };

      const response = await request(app).post("/setup/create-admin").send(invalidData);
      const result = response.body;

      // Validate HTTP status
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);

      // Validate response structure
      expect(result.success).toBe(false);
      expect(result.message).toContain("Validation error");
      expect(result.message).toContain("Invalid email format");
      expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(result.responseObject).toBe(null);
    });

    it("should return 400 BAD_REQUEST with missing required fields", async () => {
      // Clear admin users for this test
      await userModel.deleteMany({ roles: { $in: ["admin"] } });

      const invalidData = {
        username: "test-admin",
        // Missing password, name, email
      };

      const response = await request(app).post("/setup/create-admin").send(invalidData);
      const result = response.body;

      // Validate HTTP status
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);

      // Validate response structure
      expect(result.success).toBe(false);
      expect(result.message).toContain("Validation error");
      expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(result.responseObject).toBe(null);
    });

    it("should use default values for department and belongsToCenter", async () => {
      // Clear admin users for this test
      await userModel.deleteMany({ roles: { $in: ["admin"] } });

      const minimalData = {
        username: "test-admin-minimal",
        password: "SecurePass123!",
        name: "Minimal Admin",
        email: "minimal@example.com",
        // Omitting department and belongsToCenter to test defaults
      };

      const response = await request(app).post("/setup/create-admin").send(minimalData);
      const result = response.body;

      // Should succeed with defaults
      expect(response.statusCode).toEqual(StatusCodes.CREATED);
      expect(result.success).toBe(true);
      expect(result.responseObject.adminUserId).toBeDefined();

      // Verify defaults were applied
      const createdUser = await userModel.findById(result.responseObject.adminUserId);
      expect(createdUser?.department).toBe("Administration");
      expect(createdUser?.belongsToCenter).toEqual(["1"]);

      // Clean up
      await userModel.findByIdAndDelete(result.responseObject.adminUserId);
    });
  });

  describe("GET /setup/stats", () => {
    it("should return database statistics", async () => {
      const response = await request(app).get("/setup/stats");
      const result: ServiceResponse<Record<string, number>> = response.body;

      // Validate HTTP status
      expect(response.statusCode).toEqual(StatusCodes.OK);

      // Validate ServiceResponse structure
      expect(result.success).toBe(true);
      expect(result.message).toBe("Database statistics retrieved");
      expect(result.statusCode).toBe(StatusCodes.OK);

      // Validate data structure - should be a record of collection names to counts
      expect(result.responseObject).toBeDefined();
      expect(typeof result.responseObject).toBe("object");

      // Should have at least the major collections
      const expectedCollections = [
        "users",
        "patients",
        "consultations",
        "forms",
        "formtemplates",
        "surgeries",
        "patientcases",
      ];

      for (const collection of expectedCollections) {
        expect(result.responseObject).toHaveProperty(collection);
        expect(typeof result.responseObject[collection]).toBe("number");
        expect(result.responseObject[collection]).toBeGreaterThanOrEqual(0);
      }
    });

    it("should return valid number counts for all collections", async () => {
      const response = await request(app).get("/setup/stats");
      const result: ServiceResponse<Record<string, number>> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(result.success).toBe(true);
      expect(result.responseObject).toBeDefined();

      // All values should be non-negative numbers
      for (const [collection, count] of Object.entries(result.responseObject)) {
        expect(typeof count).toBe("number");
        expect(count).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(count)).toBe(true);
      }
    });
  });

  describe("Response Structure Validation", () => {
    it("should match ServiceResponse structure for all endpoints", async () => {
      // Test all endpoints return proper ServiceResponse structure
      const endpoints = [
        { method: "get", path: "/setup/status" },
        { method: "get", path: "/setup/stats" },
      ];

      for (const endpoint of endpoints) {
        const response =
          endpoint.method === "get" ? await request(app).get(endpoint.path) : await request(app).post(endpoint.path);

        const result = response.body;

        // Every response should have ServiceResponse structure
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("message");
        expect(result).toHaveProperty("responseObject");
        expect(result).toHaveProperty("statusCode");

        // Types validation
        expect(typeof result.success).toBe("boolean");
        expect(typeof result.message).toBe("string");
        expect(typeof result.statusCode).toBe("number");
      }
    });
  });
});
