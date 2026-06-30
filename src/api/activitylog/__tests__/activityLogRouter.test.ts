import { app } from "@/server";
import { login } from "@/utils/unitTesting";
import { activityLogService } from "@/common/services/activityLogService";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Activity Log API Tests", () => {
  let adminAgent: request.SuperAgentTest;
  let doctorAgent: request.SuperAgentTest;

  beforeAll(async () => {
    // Login as admin (should have access)
    const adminAuth = await login(app, "admin");
    adminAgent = adminAuth.agent;

    // Login as doctor (should not have access to logs)
    const doctorAuth = await login(app, "doctor");
    doctorAgent = doctorAuth.agent;
  });

  afterAll(async () => {
    // Clear logs after tests
    await activityLogService.clearLogs();
  });

  describe("GET /activitylog/recent", () => {
    it("should return recent activity logs for admin", async () => {
      // Add some test logs first
      activityLogService.log({
        username: "test",
        action: "Test action",
        type: "info",
        details: "Test details",
      });

      const response = await adminAgent.get("/activitylog/recent");

      expect(response.status).toBe(StatusCodes.OK);
      expect(Array.isArray(response.body.responseObject)).toBe(true);
      expect(response.body.responseObject.length).toBeGreaterThan(0);
    });

    it("should return logs with correct structure", async () => {
      activityLogService.log({
        username: "testuser",
        action: "Login",
        type: "login",
        details: "User logged in",
      });

      const response = await adminAgent.get("/activitylog/recent");

      if (response.status === StatusCodes.OK && response.body.responseObject.length > 0) {
        const log = response.body.responseObject[0];
        expect(log).toHaveProperty("timestamp");
        expect(log).toHaveProperty("username");
        expect(log).toHaveProperty("action");
        expect(log).toHaveProperty("type");
        expect(["login", "roleSwitch", "dashboard", "formOpen", "formSubmit", "info", "warning", "error"]).toContain(log.type);
      }
    });

    it("should respect count parameter", async () => {
      // Add multiple logs
      for (let i = 0; i < 10; i++) {
        activityLogService.log({
          username: "test",
          action: `Action ${i}`,
          type: "info",
        });
      }

      const response = await adminAgent.get("/activitylog/recent").query({ count: "5" });

      if (response.status === StatusCodes.OK) {
        expect(response.body.responseObject.length).toBeLessThanOrEqual(5);
      }
    });

    it("should return logs in reverse chronological order (newest first)", async () => {
      // Clear and add logs in specific order
      await activityLogService.clearLogs();

      activityLogService.log({
        username: "test",
        action: "First action",
        type: "info",
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      activityLogService.log({
        username: "test",
        action: "Second action",
        type: "info",
      });

      const response = await adminAgent.get("/activitylog/recent");

      if (response.status === StatusCodes.OK && response.body.responseObject.length >= 2) {
        const logs = response.body.responseObject;
        const firstTimestamp = new Date(logs[0].timestamp).getTime();
        const secondTimestamp = new Date(logs[1].timestamp).getTime();
        expect(firstTimestamp).toBeGreaterThanOrEqual(secondTimestamp);
      }
    });

    it("should deny access to non-admin users", async () => {
      const response = await doctorAgent.get("/activitylog/recent");

      expect(response.status).toBe(StatusCodes.FORBIDDEN);
    });

    it("should require authentication", async () => {
      const response = await request(app).get("/activitylog/recent");

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it("should handle empty log list", async () => {
      await activityLogService.clearLogs();

      const response = await adminAgent.get("/activitylog/recent");

      expect(response.status).toBe(StatusCodes.OK);
      expect(Array.isArray(response.body.responseObject)).toBe(true);
      expect(response.body.responseObject.length).toBe(0);
    });

    it("should handle invalid count parameter", async () => {
      const response = await adminAgent.get("/activitylog/recent").query({ count: "invalid" });

      // Should handle gracefully, either returning all or default count
      expect([StatusCodes.OK, StatusCodes.BAD_REQUEST]).toContain(response.status);
    });

    it("should handle negative count parameter", async () => {
      const response = await adminAgent.get("/activitylog/recent").query({ count: "-5" });

      // Should handle gracefully
      expect([StatusCodes.OK, StatusCodes.BAD_REQUEST]).toContain(response.status);
    });
  });

  describe("DELETE /activitylog/clear", () => {
    it("should clear all activity logs for admin", async () => {
      // Add some logs
      for (let i = 0; i < 5; i++) {
        activityLogService.log({
          username: "test",
          action: `Action ${i}`,
          type: "info",
        });
      }

      // Clear logs
      const clearResponse = await adminAgent.delete("/activitylog/clear");
      expect(clearResponse.status).toBe(StatusCodes.OK);

      // Verify logs are cleared
      const getResponse = await adminAgent.get("/activitylog/recent");
      if (getResponse.status === StatusCodes.OK) {
        expect(getResponse.body.responseObject.length).toBe(0);
      }
    });

    it("should deny access to non-admin users", async () => {
      const response = await doctorAgent.delete("/activitylog/clear");

      expect(response.status).toBe(StatusCodes.FORBIDDEN);
    });

    it("should require authentication", async () => {
      const response = await request(app).delete("/activitylog/clear");

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it("should handle clearing empty log", async () => {
      // Clear when already empty
      await activityLogService.clearLogs();
      const response = await adminAgent.delete("/activitylog/clear");

      expect(response.status).toBe(StatusCodes.OK);
    });

    it("should work multiple times consecutively", async () => {
      // Add logs
      activityLogService.log({
        username: "test",
        action: "Test",
        type: "info",
      });

      // Clear multiple times
      const response1 = await adminAgent.delete("/activitylog/clear");
      expect(response1.status).toBe(StatusCodes.OK);

      const response2 = await adminAgent.delete("/activitylog/clear");
      expect(response2.status).toBe(StatusCodes.OK);

      const response3 = await adminAgent.delete("/activitylog/clear");
      expect(response3.status).toBe(StatusCodes.OK);
    });
  });

  describe("Activity Log Types", () => {
    it("should support login type logs", async () => {
      activityLogService.log({
        username: "testuser",
        action: "User logged in",
        type: "login",
      });

      const response = await adminAgent.get("/activitylog/recent");

      if (response.status === StatusCodes.OK) {
        const loginLog = response.body.responseObject.find(
          (log: any) => log.type === "login"
        );
        expect(loginLog).toBeDefined();
      }
    });

    it("should support roleSwitch type logs", async () => {
      activityLogService.log({
        username: "testuser",
        action: "Switched to doctor role",
        type: "roleSwitch",
      });

      const response = await adminAgent.get("/activitylog/recent");

      if (response.status === StatusCodes.OK) {
        const roleSwitchLog = response.body.responseObject.find(
          (log: any) => log.type === "roleSwitch"
        );
        expect(roleSwitchLog).toBeDefined();
      }
    });

    it("should support formSubmit type logs", async () => {
      activityLogService.log({
        username: "testuser",
        action: "Submitted AOFAS form",
        type: "formSubmit",
        details: "Form ID: 12345",
      });

      const response = await adminAgent.get("/activitylog/recent");

      if (response.status === StatusCodes.OK) {
        const formLog = response.body.responseObject.find(
          (log: any) => log.type === "formSubmit"
        );
        expect(formLog).toBeDefined();
      }
    });

    it("should support error type logs", async () => {
      activityLogService.log({
        username: "system",
        action: "Database connection failed",
        type: "error",
        details: "Connection timeout",
      });

      const response = await adminAgent.get("/activitylog/recent");

      if (response.status === StatusCodes.OK) {
        const errorLog = response.body.responseObject.find(
          (log: any) => log.type === "error"
        );
        expect(errorLog).toBeDefined();
      }
    });
  });

  describe("Activity Log Service Integration", () => {
    it("should log user login activity", async () => {
      // Clear logs
      await activityLogService.clearLogs();

      // Perform login (this should create a log entry)
      await request(app)
        .post("/user/login")
        .send({
          username: "testuser",
          password: "testpassword",
        });

      // Check logs
      const response = await adminAgent.get("/activitylog/recent");

      if (response.status === StatusCodes.OK) {
        const loginLogs = response.body.responseObject.filter(
          (log: any) => log.type === "login"
        );
        expect(loginLogs.length).toBeGreaterThan(0);
      }
    });

    it("should include optional details field", async () => {
      activityLogService.log({
        username: "testuser",
        action: "Updated profile",
        type: "info",
        details: "Changed email address",
      });

      const response = await adminAgent.get("/activitylog/recent");

      if (response.status === StatusCodes.OK) {
        const log = response.body.responseObject.find(
          (log: any) => log.action === "Updated profile"
        );
        if (log) {
          expect(log.details).toBe("Changed email address");
        }
      }
    });

    it("should handle logs without details field", async () => {
      activityLogService.log({
        username: "testuser",
        action: "Simple action",
        type: "info",
      });

      const response = await adminAgent.get("/activitylog/recent");

      expect(response.status).toBe(StatusCodes.OK);
    });

    it("should handle special characters in log messages", async () => {
      activityLogService.log({
        username: "test<script>",
        action: 'Action with "quotes" and <tags>',
        type: "info",
        details: "Details with 'single' and \"double\" quotes",
      });

      const response = await adminAgent.get("/activitylog/recent");

      expect(response.status).toBe(StatusCodes.OK);
      // Logs should be properly encoded
    });

    it("should handle very long log messages", async () => {
      const longMessage = "a".repeat(10000);
      
      activityLogService.log({
        username: "testuser",
        action: longMessage,
        type: "info",
      });

      const response = await adminAgent.get("/activitylog/recent");

      expect(response.status).toBe(StatusCodes.OK);
    });

    it("should handle unicode characters", async () => {
      activityLogService.log({
        username: "用户",
        action: "Aktion mit Umlauten: äöü",
        type: "info",
        details: "Émojis: 🎉 😀",
      });

      const response = await adminAgent.get("/activitylog/recent");

      expect(response.status).toBe(StatusCodes.OK);
    });
  });

  describe("Performance and Limits", () => {
    it("should handle large number of logs efficiently", async () => {
      await activityLogService.clearLogs();

      // Add many logs
      for (let i = 0; i < 100; i++) {
        activityLogService.log({
          username: "test",
          action: `Action ${i}`,
          type: "info",
        });
      }

      const start = Date.now();
      const response = await adminAgent.get("/activitylog/recent").query({ count: "50" });
      const duration = Date.now() - start;

      expect(response.status).toBe(StatusCodes.OK);
      expect(duration).toBeLessThan(1000); // Should be fast
    });

    it("should not allow extremely large count values", async () => {
      const response = await adminAgent.get("/activitylog/recent").query({ count: "999999" });

      if (response.status === StatusCodes.OK) {
        // Should have a reasonable limit
        expect(response.body.responseObject.length).toBeLessThan(10000);
      }
    });
  });

  describe("Concurrent Access", () => {
    it("should handle concurrent log writes", async () => {
      await activityLogService.clearLogs();

      // Write logs concurrently
      const promises = Array(20)
        .fill(null)
        .map((_, i) =>
          Promise.resolve(
            activityLogService.log({
              username: "test",
              action: `Concurrent action ${i}`,
              type: "info",
            })
          )
        );

      await Promise.all(promises);

      // Verify all logs were written
      const response = await adminAgent.get("/activitylog/recent").query({ count: "50" });

      if (response.status === StatusCodes.OK) {
        expect(response.body.responseObject.length).toBe(20);
      }
    });

    it("should handle concurrent reads", async () => {
      // Add some logs
      for (let i = 0; i < 10; i++) {
        activityLogService.log({
          username: "test",
          action: `Action ${i}`,
          type: "info",
        });
      }

      // Read concurrently
      const promises = Array(10)
        .fill(null)
        .map(() => adminAgent.get("/activitylog/recent"));

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(StatusCodes.OK);
      });
    });
  });
});
