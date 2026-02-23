import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { UserDepartment } from "@/api/userDepartment/userDepartmentModel";
import { userDepartmentRepository } from "@/api/seed/seedRouter";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import { parseCodeLifeToMs, DEFAULT_CODE_LIFE_MS } from "@/api/code/codeService";

describe("UserDepartment API Endpoints", () => {
  let adminSessionCookie: string;
  let userSessionCookie: string;
  let newDepartmentId: string;
  let seededDepartmentId: string;

  // Login as admin before running tests
  beforeAll(async () => {
    // Seed users first for authentication to work
    const usersSeedRes = await request(app).get("/seed/users");
    if (usersSeedRes.status !== StatusCodes.OK) {
      throw new Error("Failed to seed users");
    }

    // Seed mock departments
    const deptSeedRes = await request(app).get("/seed/departments");
    if (deptSeedRes.status !== StatusCodes.OK) {
      throw new Error("Failed to seed departments");
    }

    // Login as admin user first to get session cookie
    const adminLoginResponse = await request(app).post("/user/login").send({
      username: "ewilson", // admin user
      password: "password123#124",
    });

    expect(adminLoginResponse.status).toBe(StatusCodes.OK);
    adminSessionCookie = adminLoginResponse.headers["set-cookie"];

    // Now get all departments with authentication
    const getAllRes = await request(app).get("/userDepartment").set("Cookie", adminSessionCookie);
    if (getAllRes.status === StatusCodes.OK && getAllRes.body.responseObject && getAllRes.body.responseObject.length > 0) {
      seededDepartmentId = getAllRes.body.responseObject[0]._id;
    }

    // Login as regular user to test authenticated endpoints
    const userLoginResponse = await request(app).post("/user/login").send({
      username: "student", // regular user
      password: "password123#124",
    });

    expect(userLoginResponse.status).toBe(StatusCodes.OK);
    userSessionCookie = userLoginResponse.headers["set-cookie"];
  });

  describe("GET /userDepartment", () => {
    it("should return all departments for admin user", async () => {
      const response = await request(app).get("/userDepartment").set("Cookie", adminSessionCookie);

      const responseBody: ServiceResponse<UserDepartment[]> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Departments found");
      expect(Array.isArray(responseBody.responseObject)).toBeTruthy();
      expect(responseBody.responseObject.length).toBeGreaterThanOrEqual(2);
    });

    it("should deny access for non-admin users", async () => {
      const response = await request(app).get("/userDepartment").set("Cookie", userSessionCookie);

      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN);
    });
  });

  describe("GET /userDepartment/my-department", () => {
    it.skip("should return user's own department", async () => {
      // TODO: Fix this test - the mock users have hardcoded department IDs
      // that don't match the seeded departments. Need to either:
      // 1. Update the seed function to preserve IDs
      // 2. Or update the mock users after seeding to reference actual department IDs
      const response = await request(app).get("/userDepartment/my-department").set("Cookie", userSessionCookie);

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(response.body.success).toBeTruthy();
      expect(response.body.responseObject).toHaveProperty("name");
      expect(response.body.responseObject).toHaveProperty("_id");
    });

    it("should require authentication", async () => {
      const response = await request(app).get("/userDepartment/my-department");

      expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("POST /userDepartment", () => {
    it("should create a new department for admin user", async () => {
      const newDepartment = {
        name: "Test Department",
        description: "A test department",
        contactEmail: "test@example.com",
        contactPhone: "+49 123 456 7892",
      };

      const response = await request(app)
        .post("/userDepartment")
        .set("Cookie", adminSessionCookie)
        .send(newDepartment);

      const responseBody: ServiceResponse<UserDepartment> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.CREATED);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("created");
      expect(responseBody.responseObject).toHaveProperty("_id");
      expect(responseBody.responseObject.name).toBe(newDepartment.name);

      // Save the ID for later tests
      newDepartmentId = responseBody.responseObject._id as string;
    });

    it("should prevent creating duplicate department names", async () => {
      const duplicateDepartment = {
        name: "Orthopädie und Unfallchirurgie", // Already exists in mock data
        description: "Duplicate",
        contactEmail: "duplicate@example.com",
      };

      const response = await request(app)
        .post("/userDepartment")
        .set("Cookie", adminSessionCookie)
        .send(duplicateDepartment);

      expect(response.statusCode).toEqual(StatusCodes.CONFLICT);
      expect(response.body.message).toContain("already exists");
    });

    it("should deny access for non-admin users", async () => {
      const newDepartment = {
        name: "Unauthorized Department",
        description: "Should not be created",
      };

      const response = await request(app)
        .post("/userDepartment")
        .set("Cookie", userSessionCookie)
        .send(newDepartment);

      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN);
    });
  });

  describe("GET /userDepartment/:id", () => {
    it("should return a department by ID for admin user", async () => {
      const response = await request(app)
        .get(`/userDepartment/${seededDepartmentId}`)
        .set("Cookie", adminSessionCookie);

      const responseBody: ServiceResponse<UserDepartment> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject).toHaveProperty("_id");
    });

    it("should return NOT FOUND for nonexistent ID", async () => {
      const testId = "123412341234123412341234";

      const response = await request(app).get(`/userDepartment/${testId}`).set("Cookie", adminSessionCookie);

      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
      expect(response.body.message).toContain("not found");
    });

    it("should deny access for non-admin users", async () => {
      const response = await request(app)
        .get(`/userDepartment/${userDepartmentRepository.mockDepartments[0]._id}`)
        .set("Cookie", userSessionCookie);

      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN);
    });
  });

  describe("PUT /userDepartment/:id", () => {
    it("should update a department for admin user", async () => {
      const updateData = {
        description: "Updated description",
        contactEmail: "updated@example.com",
      };

      const response = await request(app)
        .put(`/userDepartment/${newDepartmentId}`)
        .set("Cookie", adminSessionCookie)
        .send(updateData);

      const responseBody: ServiceResponse<UserDepartment> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.description).toBe(updateData.description);
      expect(responseBody.responseObject.contactEmail).toBe(updateData.contactEmail);
    });

    it("should return NOT FOUND for nonexistent ID", async () => {
      const testId = "123412341234123412341234";
      const updateData = { description: "Test" };

      const response = await request(app)
        .put(`/userDepartment/${testId}`)
        .set("Cookie", adminSessionCookie)
        .send(updateData);

      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it("should deny access for non-admin users", async () => {
      const updateData = { description: "Unauthorized update" };

      const response = await request(app)
        .put(`/userDepartment/${newDepartmentId}`)
        .set("Cookie", userSessionCookie)
        .send(updateData);

      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN);
    });
  });

  describe("DELETE /userDepartment/:id", () => {
    it.skip("should prevent deletion if users are assigned to department", async () => {
      // TODO: This test fails because seeded users have hardcoded department IDs
      // that don't match the actual seeded departments. Once that's fixed,
      // this test should work correctly.
      // Try to delete a department that has users assigned to it
      const response = await request(app)
        .delete(`/userDepartment/${seededDepartmentId}`)
        .set("Cookie", adminSessionCookie);

      expect(response.statusCode).toEqual(StatusCodes.CONFLICT);
      expect(response.body.message).toContain("Users are still assigned");
    });

    it("should delete a department without users for admin user", async () => {
      // Delete the test department we created (no users assigned)
      const response = await request(app)
        .delete(`/userDepartment/${newDepartmentId}`)
        .set("Cookie", adminSessionCookie);

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(response.body.success).toBeTruthy();
      expect(response.body.message).toContain("deleted");
    });

    it("should return NOT FOUND for nonexistent ID", async () => {
      const testId = "123412341234123412341234";

      const response = await request(app).delete(`/userDepartment/${testId}`).set("Cookie", adminSessionCookie);

      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it("should deny access for non-admin users", async () => {
      const response = await request(app)
        .delete(`/userDepartment/${userDepartmentRepository.mockDepartments[0]._id}`)
        .set("Cookie", userSessionCookie);

      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN);
    });
  });

  // ─── externalAccessCodeLife field tests ──────────────────────────────────

  describe("externalAccessCodeLife field", () => {
    it("should accept valid externalAccessCodeLife values on create (admin)", async () => {
      for (const value of ["4h", "2d", "3w", "1h", "14d", "52w"]) {
        const res = await request(app)
          .post("/userDepartment")
          .set("Cookie", adminSessionCookie)
          .send({ name: `CodeLifeDept-${value}`, externalAccessCodeLife: value });
        expect(res.statusCode).toEqual(StatusCodes.CREATED);
        expect(res.body.responseObject.externalAccessCodeLife).toBe(value);
        // Cleanup
        await request(app)
          .delete(`/userDepartment/${res.body.responseObject._id}`)
          .set("Cookie", adminSessionCookie);
      }
    });

    it("should reject invalid externalAccessCodeLife formats on create (admin)", async () => {
      for (const value of ["4x", "abc", "-1h", "h4", "4 h", "4H"]) {
        const res = await request(app)
          .post("/userDepartment")
          .set("Cookie", adminSessionCookie)
          .send({ name: `InvalidCodeLifeDept`, externalAccessCodeLife: value });
        expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      }
    });

    it("should create a department without externalAccessCodeLife (field is optional)", async () => {
      const res = await request(app)
        .post("/userDepartment")
        .set("Cookie", adminSessionCookie)
        .send({ name: "NoCodeLifeDept" });
      expect(res.statusCode).toEqual(StatusCodes.CREATED);
      expect(res.body.responseObject.externalAccessCodeLife).toBeUndefined();
      // Cleanup
      await request(app).delete(`/userDepartment/${res.body.responseObject._id}`).set("Cookie", adminSessionCookie);
    });
  });

  // ─── PATCH /:id/code-life endpoint tests ─────────────────────────────────

  describe("PATCH /userDepartment/:id/code-life", () => {
    // Doctor user bwhite belongs to department 675000000000000000000001
    const doctorDeptId = "675000000000000000000001";
    let doctorSessionCookie: string;
    let studentSessionCookie: string;

    beforeAll(async () => {
      // Login as doctor
      const doctorLoginResponse = await request(app).post("/user/login").send({
        username: "bwhite",
        password: "password123#124",
      });
      expect(doctorLoginResponse.status).toBe(StatusCodes.OK);
      doctorSessionCookie = doctorLoginResponse.headers["set-cookie"];

      // Login as student (below doctor level)
      const studentLoginResponse = await request(app).post("/user/login").send({
        username: "student",
        password: "password123#124",
      });
      expect(studentLoginResponse.status).toBe(StatusCodes.OK);
      studentSessionCookie = studentLoginResponse.headers["set-cookie"];
    });

    it("should allow a doctor to set code life for their own department", async () => {
      const res = await request(app)
        .patch(`/userDepartment/${doctorDeptId}/code-life`)
        .set("Cookie", doctorSessionCookie)
        .send({ externalAccessCodeLife: "2d" });

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body.success).toBeTruthy();
      expect(res.body.responseObject.externalAccessCodeLife).toBe("2d");
    });

    it("should allow admin to set code life for the same department", async () => {
      const res = await request(app)
        .patch(`/userDepartment/${doctorDeptId}/code-life`)
        .set("Cookie", adminSessionCookie)
        .send({ externalAccessCodeLife: "48h" });

      expect(res.statusCode).toEqual(StatusCodes.OK);
      expect(res.body.responseObject.externalAccessCodeLife).toBe("48h");
    });

    it("should reject invalid code life format", async () => {
      const res = await request(app)
        .patch(`/userDepartment/${doctorDeptId}/code-life`)
        .set("Cookie", adminSessionCookie)
        .send({ externalAccessCodeLife: "4x" });

      expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });

    it("should deny access for users with role below doctor", async () => {
      const res = await request(app)
        .patch(`/userDepartment/${doctorDeptId}/code-life`)
        .set("Cookie", studentSessionCookie)
        .send({ externalAccessCodeLife: "1w" });

      expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
    });

    it("should deny doctor from updating code life for a department they do NOT belong to", async () => {
      const otherDeptId = "675000000000000000000002"; // different department
      const res = await request(app)
        .patch(`/userDepartment/${otherDeptId}/code-life`)
        .set("Cookie", doctorSessionCookie)
        .send({ externalAccessCodeLife: "1w" });

      // The doctor is not in this department, so expect 403
      expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .patch(`/userDepartment/${doctorDeptId}/code-life`)
        .send({ externalAccessCodeLife: "1w" });

      expect(res.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  // ─── parseCodeLifeToMs unit tests ────────────────────────────────────────

  describe("parseCodeLifeToMs", () => {
    it("should parse hours correctly", () => {
      expect(parseCodeLifeToMs("4h")).toBe(4 * 60 * 60 * 1000);
      expect(parseCodeLifeToMs("1h")).toBe(1 * 60 * 60 * 1000);
      expect(parseCodeLifeToMs("24h")).toBe(24 * 60 * 60 * 1000);
    });

    it("should parse days correctly", () => {
      expect(parseCodeLifeToMs("2d")).toBe(2 * 24 * 60 * 60 * 1000);
      expect(parseCodeLifeToMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("should parse weeks correctly", () => {
      expect(parseCodeLifeToMs("3w")).toBe(3 * 7 * 24 * 60 * 60 * 1000);
    });

    it("should return DEFAULT_CODE_LIFE_MS for invalid input", () => {
      expect(parseCodeLifeToMs("4x")).toBe(DEFAULT_CODE_LIFE_MS);
      expect(parseCodeLifeToMs("abc")).toBe(DEFAULT_CODE_LIFE_MS);
      expect(parseCodeLifeToMs("")).toBe(DEFAULT_CODE_LIFE_MS);
    });
  });
});
