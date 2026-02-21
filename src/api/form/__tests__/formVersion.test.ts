import { app } from "@/server";
import { loginUserAgent, logoutUser } from "@/utils/unitTesting";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import request, { type SuperAgentTest } from "supertest";
import type TestAgent from "supertest/lib/agent";
import { beforeAll, describe, expect, it } from "vitest";
import { FormModel } from "../formModel";
import { formRepository } from "../formRepository";
import { FormVersionModel } from "../formVersionModel";

describe("Form Versioning API", () => {
  let adminAgent: TestAgent;
  let doctorAgent: TestAgent;
  let studentAgent: TestAgent;
  let testFormId: string | undefined;

  beforeAll(async () => {
    try {
      // Login as different roles
      adminAgent = await loginUserAgent("admin");
      doctorAgent = await loginUserAgent("doctor");
      studentAgent = await loginUserAgent("student");

      // Seed forms
      const seedRes = await adminAgent.get("/seed/forms");
      if (seedRes.status !== 200) {
        throw new Error("Failed to seed forms");
      }

      // Use the first mock form for testing
      testFormId = formRepository.mockForms[0]._id?.toString();
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Setup form version test has failed: ${error.message}`);
      } else {
        console.error("Setup form version test has failed");
      }
      throw error;
    }
  });

  describe("Automatic Version Creation", () => {
    it("should create a version backup when updating form data", async () => {
      // Get the form before update
      const beforeRes = await adminAgent.get(`/form/${testFormId}`);
      expect(beforeRes.status).toBe(StatusCodes.OK);
      const currentVersion = beforeRes.body.responseObject.currentVersion || 1;

      // Update the form with new patient data
      const newPatientFormData = {
        rawFormData: {
          standardfragebogen: { q1: 3, q2: 4, q3: 2, q4: 1, q5: 5, q6: 3 },
          sportfragebogen: { s1: 2, s2: 3, s3: 4, s4: 5 },
        },
        subscales: {},
        totalScore: null,
        fillStatus: "complete" as const,
        completedAt: new Date(),
        beginFill: new Date(),
      };

      const updateRes = await adminAgent
        .put(`/form/${testFormId}`)
        .send({
          patientFormData: newPatientFormData,
          changeNotes: "Test update for versioning",
        });

      expect(updateRes.status).toBe(StatusCodes.OK);
      expect(updateRes.body.responseObject.currentVersion).toBe(currentVersion + 1);

      // Verify version was created
      const versionHistoryRes = await adminAgent.get(`/form/${testFormId}/versions`);
      expect(versionHistoryRes.status).toBe(StatusCodes.OK);
      expect(versionHistoryRes.body.responseObject.length).toBeGreaterThan(0);
    });

    it("should increment version number with each update", async () => {
      // Create a new form for this test
      const newForm = {
        ...formRepository.mockForms[0],
        _id: new mongoose.Types.ObjectId(),
      };

      const createRes = await adminAgent.post("/form").send(newForm);
      expect(createRes.status).toBe(StatusCodes.CREATED);
      const formId = createRes.body.responseObject._id;

      // First update
      const update1 = await adminAgent.put(`/form/${formId}`).send({
        patientFormData: {
          rawFormData: {
            standardfragebogen: { q1: 1 },
          },
          subscales: {},
          totalScore: null,
          fillStatus: "incomplete" as const,
          completedAt: null,
          beginFill: new Date(),
        },
        changeNotes: "First update",
      });
      expect(update1.body.responseObject.currentVersion).toBe(2);

      // Second update
      const update2 = await adminAgent.put(`/form/${formId}`).send({
        patientFormData: {
          rawFormData: {
            standardfragebogen: { q1: 2 },
          },
          subscales: {},
          totalScore: null,
          fillStatus: "incomplete" as const,
          completedAt: null,
          beginFill: new Date(),
        },
        changeNotes: "Second update",
      });
      expect(update2.body.responseObject.currentVersion).toBe(3);

      // Clean up
      await adminAgent.delete(`/form/${formId}`);
    });
  });

  describe("Version History", () => {
    it("should retrieve version history for a form (admin)", async () => {
      const res = await adminAgent.get(`/form/${testFormId}/versions`);
      expect(res.status).toBe(StatusCodes.OK);
      expect(Array.isArray(res.body.responseObject)).toBe(true);
      
      // Check version structure
      if (res.body.responseObject.length > 0) {
        const version = res.body.responseObject[0];
        expect(version).toHaveProperty("formId");
        expect(version).toHaveProperty("version");
        expect(version).toHaveProperty("changedBy");
        expect(version).toHaveProperty("changedAt");
        expect(version).toHaveProperty("changeNotes");
      }
    });

    it("should retrieve version history for a form (doctor)", async () => {
      const res = await doctorAgent.get(`/form/${testFormId}/versions`);
      expect(res.status).toBe(StatusCodes.OK);
      expect(Array.isArray(res.body.responseObject)).toBe(true);
    });

    it("should deny version history access to student", async () => {
      const res = await studentAgent.get(`/form/${testFormId}/versions`);
      expect(res.status).toBe(StatusCodes.FORBIDDEN);
    });

    it("should return empty array for form with no versions", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await adminAgent.get(`/form/${fakeId}/versions`);
      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.responseObject).toEqual([]);
    });
  });

  describe("Get Specific Version", () => {
    it("should retrieve a specific version with full data (admin)", async () => {
      // First ensure the form has versions
      await adminAgent.put(`/form/${testFormId}`).send({
        patientFormData: {
          rawFormData: {
            standardfragebogen: { test: "data" },
          },
          subscales: {},
          totalScore: null,
          fillStatus: "incomplete" as const,
          completedAt: null,
          beginFill: new Date(),
        },
        changeNotes: "Creating version for test",
      });

      // Get version history to find a version number
      const historyRes = await adminAgent.get(`/form/${testFormId}/versions`);
      expect(historyRes.status).toBe(StatusCodes.OK);
      
      if (historyRes.body.responseObject.length > 0) {
        const versionNumber = historyRes.body.responseObject[0].version;

        // Get specific version
        const versionRes = await adminAgent.get(`/form/${testFormId}/version/${versionNumber}`);
        expect(versionRes.status).toBe(StatusCodes.OK);
        expect(versionRes.body.responseObject).toHaveProperty("formId");
        expect(versionRes.body.responseObject).toHaveProperty("version", versionNumber);
        expect(versionRes.body.responseObject).toHaveProperty("rawData");
      }
    });

    it("should retrieve a specific version (doctor)", async () => {
      const historyRes = await doctorAgent.get(`/form/${testFormId}/versions`);
      
      if (historyRes.body.responseObject.length > 0) {
        const versionNumber = historyRes.body.responseObject[0].version;
        const versionRes = await doctorAgent.get(`/form/${testFormId}/version/${versionNumber}`);
        expect(versionRes.status).toBe(StatusCodes.OK);
      }
    });

    it("should deny specific version access to student", async () => {
      const res = await studentAgent.get(`/form/${testFormId}/version/1`);
      expect(res.status).toBe(StatusCodes.FORBIDDEN);
    });

    it("should return 404 for non-existent version", async () => {
      const res = await adminAgent.get(`/form/${testFormId}/version/9999`);
      expect(res.status).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe("Version Comparison (Diff)", () => {
    it("should compare two versions", async () => {
      // Create a fresh form for consistent versioning
      const newForm = {
        ...formRepository.mockForms[0],
        _id: new mongoose.Types.ObjectId(),
      };

      const createRes = await adminAgent.post("/form").send(newForm);
      expect(createRes.status).toBe(StatusCodes.CREATED);
      const formId = createRes.body.responseObject._id;
      
      // First update - creates version 1 backup, form becomes version 2
      await adminAgent.put(`/form/${formId}`).send({
        patientFormData: {
          rawFormData: {
            standardfragebogen: { q1: 1, q2: 2 },
          },
          subscales: {},
          totalScore: null,
          fillStatus: "incomplete" as const,
          completedAt: null,
          beginFill: new Date(),
        },
        changeNotes: "Version for diff test 1",
      });

      // Second update - creates version 2 backup, form becomes version 3
      await adminAgent.put(`/form/${formId}`).send({
        patientFormData: {
          rawFormData: {
            standardfragebogen: { q1: 3, q2: 4 },
          },
          subscales: {},
          totalScore: null,
          fillStatus: "incomplete" as const,
          completedAt: null,
          beginFill: new Date(),
        },
        changeNotes: "Version for diff test 2",
      });

      // Get version history to find version numbers
      const historyRes = await adminAgent.get(`/form/${formId}/versions`);
      
      if (historyRes.body.responseObject.length >= 2) {
        const versions = historyRes.body.responseObject;
        const v1 = versions[versions.length - 1].version; // older (version 1)
        const v2 = versions[versions.length - 2].version; // newer (version 2)

        const diffRes = await adminAgent.get(`/form/${formId}/diff?v1=${v1}&v2=${v2}`);
        expect(diffRes.status).toBe(StatusCodes.OK);
        expect(diffRes.body.responseObject).toHaveProperty("v1");
        expect(diffRes.body.responseObject).toHaveProperty("v2");
        expect(diffRes.body.responseObject.v1).toHaveProperty("rawData");
        expect(diffRes.body.responseObject.v2).toHaveProperty("rawData");
      }

      // Clean up
      await adminAgent.delete(`/form/${formId}`);
    });

    it("should require both v1 and v2 query parameters", async () => {
      const res = await adminAgent.get(`/form/${testFormId}/diff?v1=1`);
      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it("should deny diff access to student", async () => {
      const res = await studentAgent.get(`/form/${testFormId}/diff?v1=1&v2=2`);
      expect(res.status).toBe(StatusCodes.FORBIDDEN);
    });
  });

  describe("Change List", () => {
    it("should get change list between two versions", async () => {
      // Get version history
      const historyRes = await adminAgent.get(`/form/${testFormId}/versions`);
      
      if (historyRes.body.responseObject.length >= 2) {
        const versions = historyRes.body.responseObject;
        const v1 = versions[versions.length - 1].version;
        const v2 = versions[0].version; // Latest version

        const changesRes = await adminAgent.get(`/form/${testFormId}/changes?v1=${v1}&v2=${v2}`);
        expect(changesRes.status).toBe(StatusCodes.OK);
        expect(Array.isArray(changesRes.body.responseObject)).toBe(true);
        
        if (changesRes.body.responseObject.length > 0) {
          const change = changesRes.body.responseObject[0];
          expect(change).toHaveProperty("version");
          expect(change).toHaveProperty("changedBy");
          expect(change).toHaveProperty("changedAt");
          expect(change).toHaveProperty("changeNotes");
        }
      }
    });

    it("should require both v1 and v2 query parameters", async () => {
      const res = await adminAgent.get(`/form/${testFormId}/changes?v1=1`);
      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it("should deny change list access to student", async () => {
      const res = await studentAgent.get(`/form/${testFormId}/changes?v1=1&v2=2`);
      expect(res.status).toBe(StatusCodes.FORBIDDEN);
    });
  });

  describe("Version Restoration", () => {
    it("should restore a previous version (admin)", async () => {
      // Create a version to restore
      const updateRes1 = await adminAgent.put(`/form/${testFormId}`).send({
        patientFormData: {
          rawFormData: {
            standardfragebogen: { restore: "test", value: 123 },
          },
          subscales: {},
          totalScore: null,
          fillStatus: "incomplete" as const,
          completedAt: null,
          beginFill: new Date(),
        },
        changeNotes: "Version to be restored",
      });
      const versionToRestore = updateRes1.body.responseObject.currentVersion;

      // Make another update
      await adminAgent.put(`/form/${testFormId}`).send({
        patientFormData: {
          rawFormData: {
            standardfragebogen: { restore: "newer", value: 456 },
          },
          subscales: {},
          totalScore: null,
          fillStatus: "incomplete" as const,
          completedAt: null,
          beginFill: new Date(),
        },
        changeNotes: "Newer version",
      });

      // Restore the previous version
      const restoreRes = await adminAgent
        .post(`/form/${testFormId}/restore-version/${versionToRestore}`)
        .send({
          changeNotes: "Restoring version for test",
        });

      expect(restoreRes.status).toBe(StatusCodes.OK);
      expect(restoreRes.body.responseObject).toHaveProperty("currentVersion");
      
      // Verify restoration created a new version
      const newVersion = restoreRes.body.responseObject.currentVersion;
      expect(newVersion).toBeGreaterThan(versionToRestore);

      // Verify the data was restored
      const formRes = await adminAgent.get(`/form/${testFormId}`);
      expect(formRes.body.responseObject.patientFormData.rawFormData.standardfragebogen.restore).toBe("test");
      expect(formRes.body.responseObject.patientFormData.rawFormData.standardfragebogen.value).toBe(123);
    });

    it("should restore a previous version (doctor)", async () => {
      // Get version history
      const historyRes = await doctorAgent.get(`/form/${testFormId}/versions`);
      
      if (historyRes.body.responseObject.length > 0) {
        const versionNumber = historyRes.body.responseObject[historyRes.body.responseObject.length - 1].version;
        
        const restoreRes = await doctorAgent
          .post(`/form/${testFormId}/restore-version/${versionNumber}`)
          .send({
            changeNotes: "Doctor restoring version",
          });

        expect(restoreRes.status).toBe(StatusCodes.OK);
      }
    });

    it("should deny version restoration to student", async () => {
      const res = await studentAgent
        .post(`/form/${testFormId}/restore-version/1`)
        .send({
          changeNotes: "Student attempt",
        });
      
      expect(res.status).toBe(StatusCodes.FORBIDDEN);
    });

    it("should return 404 for non-existent version to restore", async () => {
      const res = await adminAgent
        .post(`/form/${testFormId}/restore-version/9999`)
        .send({
          changeNotes: "Attempting to restore non-existent version",
        });

      expect(res.status).toBe(StatusCodes.NOT_FOUND);
    });

    it("should mark restored versions with isRestoration flag", async () => {
      // Get version history
      const historyRes = await adminAgent.get(`/form/${testFormId}/versions`);
      
      if (historyRes.body.responseObject.length > 0) {
        const versionToRestore = historyRes.body.responseObject[historyRes.body.responseObject.length - 1].version;
        
        // Restore it
        await adminAgent
          .post(`/form/${testFormId}/restore-version/${versionToRestore}`)
          .send({
            changeNotes: "Testing restoration flag",
          });

        // Get version history again
        const newHistoryRes = await adminAgent.get(`/form/${testFormId}/versions`);
        const latestVersion = newHistoryRes.body.responseObject[0];
        
        // Get full version data to check isRestoration
        const versionRes = await adminAgent.get(`/form/${testFormId}/version/${latestVersion.version}`);
        expect(versionRes.body.responseObject.isRestoration).toBe(true);
        expect(versionRes.body.responseObject.restoredFromVersion).toBe(versionToRestore);
      }
    });
  });

  describe("Version Access Control", () => {
    it("should allow admin to access all version endpoints", async () => {
      const endpoints = [
        `/form/${testFormId}/versions`,
        `/form/${testFormId}/version/1`,
        `/form/${testFormId}/diff?v1=1&v2=2`,
        `/form/${testFormId}/changes?v1=1&v2=2`,
      ];

      for (const endpoint of endpoints) {
        const res = await adminAgent.get(endpoint);
        // Should not be forbidden (404 or other errors are ok for invalid data)
        expect(res.status).not.toBe(StatusCodes.FORBIDDEN);
      }
    });

    it("should allow doctor to access all version endpoints", async () => {
      const endpoints = [
        `/form/${testFormId}/versions`,
        `/form/${testFormId}/version/1`,
        `/form/${testFormId}/diff?v1=1&v2=2`,
        `/form/${testFormId}/changes?v1=1&v2=2`,
      ];

      for (const endpoint of endpoints) {
        const res = await doctorAgent.get(endpoint);
        // Should not be forbidden (404 or other errors are ok for invalid data)
        expect(res.status).not.toBe(StatusCodes.FORBIDDEN);
      }
    });

    it("should deny student access to all version endpoints", async () => {
      const endpoints = [
        `/form/${testFormId}/versions`,
        `/form/${testFormId}/version/1`,
        `/form/${testFormId}/diff?v1=1&v2=2`,
        `/form/${testFormId}/changes?v1=1&v2=2`,
      ];

      for (const endpoint of endpoints) {
        const res = await studentAgent.get(endpoint);
        expect(res.status).toBe(StatusCodes.FORBIDDEN);
      }
    });

    it("should deny unauthenticated access to version endpoints", async () => {
      const endpoints = [
        `/form/${testFormId}/versions`,
        `/form/${testFormId}/version/1`,
        `/form/${testFormId}/diff?v1=1&v2=2`,
        `/form/${testFormId}/changes?v1=1&v2=2`,
      ];

      for (const endpoint of endpoints) {
        const res = await request(app).get(endpoint);
        // Auth middleware returns 403 for unauthenticated users
        expect(res.status).toBe(StatusCodes.FORBIDDEN);
      }
    });
  });
});
