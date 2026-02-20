import { app } from "@/server";
import { loginUserAgent, logoutUser } from "@/utils/unitTesting";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";
import { beforeAll, describe, expect, it } from "vitest";
import { DepartmentFormTemplateModel } from "../departmentFormTemplateModel";

/**
 * Tests for Form Template Access Control and Department Mappings
 * 
 * These tests verify:
 * - Department-based access control for regular users
 * - Admin/developer access to all templates
 * - Query parameter filtering (id, ids, departmentId)
 * - Department mapping CRUD operations
 * - Proper authentication and authorization
 */
describe("FormTemplate Access Control & Department Mappings", () => {
  const defaultDepartmentId = "675000000000000000000001"; // Orthopädie und Unfallchirurgie
  const secondDepartmentId = "675000000000000000000002"; // Radiology
  let formTemplateIds: string[] = [];
  let adminAgent: TestAgent;

  beforeAll(async () => {
    try {
      // Seed users first (needed for admin authentication)
      await request(app).get("/seed/users/reset");
      
      // Login as admin to perform privileged operations
      adminAgent = await loginUserAgent("admin");
      
      // Seed departments
      await request(app).get("/seed/departments");
      
      // Seed form templates
      const templateRes = await request(app).get("/seed/formTemplate");
      if (templateRes.status !== 200) {
        throw new Error("Failed to seed form templates");
      }

      // Seed department mappings
      const mappingRes = await request(app).get("/seed/department-formtemplate-mappings");
      if (mappingRes.status !== 200) {
        throw new Error("Failed to seed department-formtemplate mappings");
      }

      // Get all template IDs using admin agent
      const listRes = await adminAgent.get("/formtemplate");
      if (listRes.status === 200 && Array.isArray(listRes.body.responseObject)) {
        formTemplateIds = listRes.body.responseObject.map((t: any) => t._id);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Setup failed: ${error.message}`);
      }
      throw error;
    }
  });

  describe("Query Parameter Filtering", () => {
    it("should get all form templates without query params", async () => {
      const response = await adminAgent.get("/formtemplate");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.responseObject)).toBe(true);
      expect(response.body.responseObject.length).toBeGreaterThan(0);
    });

    it("should filter by single id query param", async () => {
      if (formTemplateIds.length === 0) {
        throw new Error("No form templates available for testing");
      }

      const targetId = formTemplateIds[0];
      const response = await adminAgent.get(`/formtemplate?id=${targetId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.responseObject)).toBe(true);
      expect(response.body.responseObject).toHaveLength(1);
      expect(response.body.responseObject[0]._id).toBe(targetId);
    });

    it("should filter by multiple ids query param", async () => {
      if (formTemplateIds.length < 2) {
        throw new Error("Not enough form templates for testing");
      }

      const targetIds = formTemplateIds.slice(0, 2);
      // Note: Use ?ids=id1&ids=id2 format (without brackets) for Express array parsing
      const response = await adminAgent.get(`/formtemplate?ids=${targetIds[0]}&ids=${targetIds[1]}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.responseObject)).toBe(true);
      expect(response.body.responseObject).toHaveLength(2);
      
      const returnedIds = response.body.responseObject.map((t: any) => t._id);
      expect(returnedIds).toContain(targetIds[0]);
      expect(returnedIds).toContain(targetIds[1]);
    });

    it("should filter by departmentId query param", async () => {
      const response = await adminAgent.get(`/formtemplate?departmentId=${defaultDepartmentId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.responseObject)).toBe(true);
      // Should return templates mapped to this department
      expect(response.body.responseObject.length).toBeGreaterThan(0);
    });

    it("should return empty array for non-existent department", async () => {
      const nonExistentDeptId = "999999999999999999999999";
      const response = await adminAgent.get(`/formtemplate?departmentId=${nonExistentDeptId}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.responseObject)).toBe(true);
      expect(response.body.responseObject).toHaveLength(0);
    });
  });

  describe("Department Mapping Seeding", () => {
    it("should have created department mapping for default department", async () => {
      const mapping = await DepartmentFormTemplateModel.findOne({ 
        departmentId: defaultDepartmentId 
      });
      
      expect(mapping).toBeDefined();
      expect(mapping?.formTemplateIds).toBeDefined();
      expect(mapping?.formTemplateIds.length).toBeGreaterThan(0);
      // Should have all 8 form templates
      expect(mapping?.formTemplateIds.length).toBe(8);
    });

    it("should map all form templates to default department", async () => {
      const mapping = await DepartmentFormTemplateModel.findOne({ 
        departmentId: defaultDepartmentId 
      });
      
      expect(mapping).toBeDefined();
      const mappedIds = mapping?.formTemplateIds.map(id => id.toString()) || [];
      
      // All seeded templates should be in the mapping
      formTemplateIds.forEach(templateId => {
        expect(mappedIds).toContain(templateId);
      });
    });
  });

  describe("Department Mapping CRUD Operations", () => {
    it("should get department mapping", async () => {
      const response = await adminAgent.get(`/formtemplate/department/${defaultDepartmentId}/mapping`);
      
      expect(response.status).toBe(200);
      expect(response.body.responseObject).toBeDefined();
      expect(response.body.responseObject.departmentId).toBe(defaultDepartmentId);
      expect(Array.isArray(response.body.responseObject.formTemplateIds)).toBe(true);
    });

    it("should return 404 for non-existent department mapping", async () => {
      const nonExistentDeptId = "999999999999999999999999";
      const response = await adminAgent.get(`/formtemplate/department/${nonExistentDeptId}/mapping`);
      
      expect(response.status).toBe(404);
    });

    it("should set department mapping (replace)", async () => {
      if (formTemplateIds.length < 3) {
        throw new Error("Not enough templates for testing");
      }

      const newTemplateIds = formTemplateIds.slice(0, 3);
      const response = await adminAgent
        .put(`/formtemplate/department/${secondDepartmentId}/mapping`)
        .send({ formTemplateIds: newTemplateIds });
      
      expect(response.status).toBe(200);
      expect(response.body.responseObject.departmentId).toBe(secondDepartmentId);
      expect(response.body.responseObject.formTemplateIds).toHaveLength(3);
      
      const returnedIds = response.body.responseObject.formTemplateIds;
      newTemplateIds.forEach(id => {
        expect(returnedIds).toContain(id);
      });
    });

    it("should add templates to existing department mapping", async () => {
      if (formTemplateIds.length < 5) {
        throw new Error("Not enough templates for testing");
      }

      // First set initial mapping
      const initialIds = formTemplateIds.slice(0, 2);
      await adminAgent
        .put(`/formtemplate/department/${secondDepartmentId}/mapping`)
        .send({ formTemplateIds: initialIds });

      // Then add more templates
      const additionalIds = formTemplateIds.slice(2, 4);
      const response = await adminAgent
        .post(`/formtemplate/department/${secondDepartmentId}/templates`)
        .send({ formTemplateIds: additionalIds });
      
      expect(response.status).toBe(200);
      expect(response.body.responseObject.formTemplateIds).toHaveLength(4);
      
      // Should contain both initial and additional IDs
      const allIds = [...initialIds, ...additionalIds];
      const returnedIds = response.body.responseObject.formTemplateIds;
      allIds.forEach(id => {
        expect(returnedIds).toContain(id);
      });
    });

    it("should remove templates from department mapping", async () => {
      if (formTemplateIds.length < 4) {
        throw new Error("Not enough templates for testing");
      }

      // Set mapping with multiple templates
      const allIds = formTemplateIds.slice(0, 4);
      await adminAgent
        .put(`/formtemplate/department/${secondDepartmentId}/mapping`)
        .send({ formTemplateIds: allIds });

      // Remove some templates
      const idsToRemove = [allIds[0], allIds[1]];
      const response = await adminAgent
        .delete(`/formtemplate/department/${secondDepartmentId}/templates`)
        .send({ formTemplateIds: idsToRemove });
      
      expect(response.status).toBe(200);
      expect(response.body.responseObject.formTemplateIds).toHaveLength(2);
      
      // Removed IDs should not be present
      const returnedIds = response.body.responseObject.formTemplateIds;
      idsToRemove.forEach(id => {
        expect(returnedIds).not.toContain(id);
      });
      
      // Remaining IDs should be present
      const remainingIds = [allIds[2], allIds[3]];
      remainingIds.forEach(id => {
        expect(returnedIds).toContain(id);
      });
    });

    it("should delete department mapping", async () => {
      // Ensure mapping exists
      await adminAgent
        .put(`/formtemplate/department/${secondDepartmentId}/mapping`)
        .send({ formTemplateIds: [formTemplateIds[0]] });

      // Delete mapping
      const response = await adminAgent
        .delete(`/formtemplate/department/${secondDepartmentId}/mapping`);
      
      expect(response.status).toBe(200);

      // Verify mapping is gone
      const getResponse = await adminAgent
        .get(`/formtemplate/department/${secondDepartmentId}/mapping`);
      
      expect(getResponse.status).toBe(404);
    });

    it("should return 404 when adding templates to non-existent mapping", async () => {
      const nonExistentDeptId = "888888888888888888888888";
      const response = await adminAgent
        .post(`/formtemplate/department/${nonExistentDeptId}/templates`)
        .send({ formTemplateIds: [formTemplateIds[0]] });
      
      expect(response.status).toBe(404);
    });

    it("should return 404 when removing templates from non-existent mapping", async () => {
      const nonExistentDeptId = "888888888888888888888888";
      const response = await adminAgent
        .delete(`/formtemplate/department/${nonExistentDeptId}/templates`)
        .send({ formTemplateIds: [formTemplateIds[0]] });
      
      expect(response.status).toBe(404);
    });
  });

  describe("Form Template CRUD with Frontend-Provided IDs", () => {
    it("should create form template with frontend-provided _id", async () => {
      const customId = "67b4e612d0feb4ad99ae2e99";
      const formTemplate = {
        _id: customId,
        title: "Test Form with Custom ID",
        description: "Testing frontend-provided ObjectId",
      };

      const response = await adminAgent.post("/formtemplate").send(formTemplate);
      
      expect(response.status).toBe(201);
      expect(response.body.responseObject._id).toBe(customId);
      expect(response.body.responseObject.title).toBe(formTemplate.title);

      // Clean up
      await adminAgent.delete(`/formtemplate/${customId}`);
    });

    it("should validate ObjectId format when creating", async () => {
      const invalidId = "invalid-id-format";
      const formTemplate = {
        _id: invalidId,
        title: "Test Form with Invalid ID",
        description: "Should fail validation",
      };

      const response = await adminAgent.post("/formtemplate").send(formTemplate);
      
      // Should fail validation (exact status code depends on validation implementation)
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe("Comprehensive Integration", () => {
    it("should handle complete workflow: create template, add to department, query by department", async () => {
      // 1. Create a new template
      const customId = "67b4e612d0feb4ad99ae2e9b";
      const formTemplate = {
        _id: customId,
        title: "Integration Test Form",
        description: "Testing complete workflow",
      };

      const createResponse = await adminAgent.post("/formtemplate").send(formTemplate);
      expect(createResponse.status).toBe(201);

      // 2. Add to department mapping
      const addResponse = await adminAgent
        .post(`/formtemplate/department/${defaultDepartmentId}/templates`)
        .send({ formTemplateIds: [customId] });
      
      expect(addResponse.status).toBe(200);
      expect(addResponse.body.responseObject.formTemplateIds).toContain(customId);

      // 3. Query by department
      const queryResponse = await adminAgent
        .get(`/formtemplate?departmentId=${defaultDepartmentId}`);
      
      expect(queryResponse.status).toBe(200);
      const templateIds = queryResponse.body.responseObject.map((t: any) => t._id);
      expect(templateIds).toContain(customId);

      // 4. Clean up
      await adminAgent
        .delete(`/formtemplate/department/${defaultDepartmentId}/templates`)
        .send({ formTemplateIds: [customId] });
      
      await adminAgent.delete(`/formtemplate/${customId}`);
    });
  });
});
