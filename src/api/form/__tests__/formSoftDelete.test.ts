import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FormModel } from "../formModel";
import { formRepository } from "../formRepository";

describe("Form Soft Delete API", () => {
  let testFormId: string;
  let sessionCookie: string;

  beforeAll(async () => {
    // Seed users first for authentication
    const usersSeedRes = await request(app).get("/seed/users");
    if (usersSeedRes.status !== StatusCodes.OK) {
      throw new Error("Failed to seed users");
    }

    // Seed forms
    try {
      const res = await request(app).get("/seed/forms");
      if (res.status !== 200) {
        throw new Error("Failed to seed forms");
      }
    } catch (error) {
      console.error("Setup form seed has failed", error);
      throw error;
    }

    // Login as doctor to get session
    const loginRes = await request(app)
      .post("/user/login")
      .send({
        username: "jdoe",
        password: "password123#124",
      });

    expect(loginRes.status).toBe(StatusCodes.OK);
    expect(loginRes.headers["set-cookie"]).toBeDefined();
    sessionCookie = loginRes.headers["set-cookie"];

    // Create a test form
    const newForm = {
      ...formRepository.mockForms[0],
      _id: new mongoose.Types.ObjectId(),
    };

    const createRes = await request(app)
      .post("/form")
      .set("Cookie", sessionCookie)
      .send(newForm);
    testFormId = createRes.body.responseObject._id;
  });

  afterAll(async () => {
    // Cleanup: permanently delete test form if it exists
    if (testFormId) {
      await FormModel.findByIdAndDelete(testFormId);
    }
  });

  describe("POST /form/:formId/soft-delete", () => {
    it("should soft delete a form with deletion reason", async () => {
      const deletionReason = "Test form - duplicate entry";
      const res = await request(app)
        .post(`/form/${testFormId}/soft-delete`)
        .set("Cookie", sessionCookie)
        .send({ deletionReason });

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.responseObject).toHaveProperty("deletedAt");
      expect(res.body.responseObject).toHaveProperty("deletionReason", deletionReason);
      expect(res.body.responseObject.deletionReason).toBe(deletionReason);

      // Verify form is soft deleted in database
      const form = await FormModel.findById(testFormId).lean();
      expect(form?.deletedAt).toBeTruthy();
      expect(form?.deletionReason).toBe(deletionReason);
    });

    it("should fail without deletion reason", async () => {
      const formId = formRepository.mockForms[1]._id;
      const res = await request(app)
        .post(`/form/${formId}/soft-delete`)
        .set("Cookie", sessionCookie)
        .send({});

      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(res.body.message).toContain("Validation");
    });

    it("should return 404 for non-existent form", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/form/${fakeId}/soft-delete`)
        .set("Cookie", sessionCookie)
        .send({ deletionReason: "Test reason" });

      expect(res.status).toBe(StatusCodes.NOT_FOUND);
    });

    it("should require authentication", async () => {
      const formId = formRepository.mockForms[1]._id;
      const res = await request(app)
        .post(`/form/${formId}/soft-delete`)
        .send({ deletionReason: "Test reason" });

      expect([StatusCodes.UNAUTHORIZED, StatusCodes.FORBIDDEN]).toContain(res.status);
    });
  });

  describe("POST /form/:formId/restore", () => {
    it("should restore a soft deleted form", async () => {
      const res = await request(app)
        .post(`/form/${testFormId}/restore`)
        .set("Cookie", sessionCookie);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.responseObject.deletedAt).toBeNull();
      expect(res.body.responseObject.deletionReason).toBeNull();

      // Verify form is restored in database
      const form = await FormModel.findById(testFormId).lean();
      expect(form?.deletedAt).toBeNull();
    });

    it("should return 404 for non-existent form", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/form/${fakeId}/restore`)
        .set("Cookie", sessionCookie);

      expect(res.status).toBe(StatusCodes.NOT_FOUND);
    });

    it("should require authentication", async () => {
      const res = await request(app).post(`/form/${testFormId}/restore`);

      expect([StatusCodes.UNAUTHORIZED, StatusCodes.FORBIDDEN]).toContain(res.status);
    });
  });

  describe("GET /form/deleted", () => {
    beforeAll(async () => {
      // Soft delete the test form again for this test suite
      await request(app)
        .post(`/form/${testFormId}/soft-delete`)
        .set("Cookie", sessionCookie)
        .send({ deletionReason: "For deleted list test" });
    });

    it("should get all deleted forms with pagination", async () => {
      const res = await request(app)
        .get("/form/deleted")
        .set("Cookie", sessionCookie)
        .query({ page: "1", limit: "10" });

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.responseObject).toHaveProperty("forms");
      expect(res.body.responseObject).toHaveProperty("total");
      expect(res.body.responseObject).toHaveProperty("page");
      expect(res.body.responseObject).toHaveProperty("limit");
      expect(res.body.responseObject).toHaveProperty("totalPages");
      expect(Array.isArray(res.body.responseObject.forms)).toBe(true);

      // Verify at least our test form is in the list
      const deletedForm = res.body.responseObject.forms.find(
        (f: any) => f._id === testFormId || f.id === testFormId
      );
      expect(deletedForm).toBeTruthy();
      expect(deletedForm.deletionReason).toBe("For deleted list test");
    });

    it("should handle pagination correctly", async () => {
      const res = await request(app)
        .get("/form/deleted")
        .set("Cookie", sessionCookie)
        .query({ page: "1", limit: "5" });

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.responseObject.limit).toBe(5);
      expect(res.body.responseObject.forms.length).toBeLessThanOrEqual(5);
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/form/deleted");

      expect([StatusCodes.UNAUTHORIZED, StatusCodes.FORBIDDEN]).toContain(res.status);
    });
  });

  describe("Form filtering - soft deleted forms excluded from normal queries", () => {
    it("should not return soft deleted forms in getAllForms", async () => {
      // Soft delete a form
      const formToDelete = formRepository.mockForms[2];
      await request(app)
        .post(`/form/${formToDelete._id}/soft-delete`)
        .set("Cookie", sessionCookie)
        .send({ deletionReason: "Test exclusion from list" });

      // Get all forms
      const res = await request(app).get("/forms");
      expect(res.status).toBe(StatusCodes.OK);

      // Verify soft deleted form is not in the list
      const forms = res.body.responseObject;
      const deletedFormExists = forms.some(
        (f: any) => f._id === formToDelete._id || f.id === formToDelete._id
      );
      expect(deletedFormExists).toBe(false);

      // Restore form for cleanup
      await request(app)
        .post(`/form/${formToDelete._id}/restore`)
        .set("Cookie", sessionCookie);
    });

    it("should not return soft deleted form in getFormById", async () => {
      // Soft delete a form
      const formToDelete = formRepository.mockForms[3];
      await request(app)
        .post(`/form/${formToDelete._id}/soft-delete`)
        .set("Cookie", sessionCookie)
        .send({ deletionReason: "Test getById exclusion" });

      // Try to get the form by ID
      const res = await request(app).get(`/form/${formToDelete._id}`);
      expect(res.status).toBe(StatusCodes.NOT_FOUND);

      // Restore form for cleanup
      await request(app)
        .post(`/form/${formToDelete._id}/restore`)
        .set("Cookie", sessionCookie);
    });
  });

  describe("Soft delete tracking fields", () => {
    it("should record deletedBy field when user soft deletes", async () => {
      const newForm = {
        ...formRepository.mockForms[0],
        _id: new mongoose.Types.ObjectId(),
      };

      const createRes = await request(app).post("/form").send(newForm);
      const formId = createRes.body.responseObject._id;

      // Soft delete with authenticated user
      await request(app)
        .post(`/form/${formId}/soft-delete`)
        .set("Cookie", sessionCookie)
        .send({ deletionReason: "Testing deletedBy field" });

      // Check the form in database
      const form = await FormModel.findById(formId).lean();
      expect(form?.deletedBy).toBeTruthy();
      expect(form?.deletedAt).toBeTruthy();
      expect(form?.deletionReason).toBe("Testing deletedBy field");

      // Cleanup
      await FormModel.findByIdAndDelete(formId);
    });
  });
});
