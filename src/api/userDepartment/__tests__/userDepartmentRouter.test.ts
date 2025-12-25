import { StatusCodes } from "http-status-codes";
import request from "supertest";

import type { UserDepartment } from "@/api/userDepartment/userDepartmentModel";
import { userDepartmentRepository } from "@/api/userDepartment/userDepartmentRepository";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";

describe("UserDepartment API Endpoints", () => {
  let adminSessionCookie: string;
  let userSessionCookie: string;
  let newDepartmentId: string;

  // Login as admin before running tests
  beforeAll(async () => {
    // Seed mock departments
    await userDepartmentRepository.seedMockData();

    // Login as admin user to get session cookie
    const adminLoginResponse = await request(app).post("/user/login").send({
      username: "ewilson", // admin user
      password: "password123#124",
    });

    expect(adminLoginResponse.status).toBe(StatusCodes.OK);
    adminSessionCookie = adminLoginResponse.headers["set-cookie"];

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
    it("should return user's own department", async () => {
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
        name: "Orthopädie", // Already exists in mock data
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
        .get(`/userDepartment/${userDepartmentRepository.mockDepartments[0]._id}`)
        .set("Cookie", adminSessionCookie);

      const responseBody: ServiceResponse<UserDepartment> = response.body;

      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject).toHaveProperty("_id");
      expect(responseBody.responseObject.name).toBe(userDepartmentRepository.mockDepartments[0].name);
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
    it("should prevent deletion if users are assigned to department", async () => {
      // Try to delete a department that has users assigned to it
      const response = await request(app)
        .delete(`/userDepartment/${userDepartmentRepository.mockDepartments[0]._id}`)
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
});
