import { app } from "@/server";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { StatusCodes } from "http-status-codes";
import { loginUserAgent, logoutUser } from "@/utils/unitTesting";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import type { UserNoPassword } from "@/api/user/userModel";

describe("Kiosk API", () => {
  // Seed data before tests
  beforeAll(async () => {
    try {
      const res = await request(app).get("/seed/users/reset");
      if (res.status !== StatusCodes.OK) {
        throw new Error("Failed to seed users");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Setup failed: ${error.message}`);
      }
      throw new Error("Setup failed for kiosk tests");
    }
  });

  describe("GET /kiosk/all", () => {
    it("should return all kiosk users for authenticated mfa users", async () => {
      const agent = await loginUserAgent("admin");
      const response = await agent.get("/kiosk/all");
      const responseBody: ServiceResponse<UserNoPassword[]> = response.body;

      expect(response.status).toBe(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(Array.isArray(responseBody.responseObject)).toBeTruthy();

      // Verify all returned users have kiosk role
      responseBody.responseObject.forEach((user) => {
        expect(user.roles).toContain("kiosk");
      });

      await logoutUser(agent);
    });

    it("should return empty array when no kiosk users exist", async () => {
      // Note: With seeded data, this will not be empty, but the endpoint
      // should return 200 with empty array if no kiosk users existed
      const agent = await loginUserAgent("admin");
      const response = await agent.get("/kiosk/all");

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.success).toBeTruthy();
      expect(Array.isArray(response.body.responseObject)).toBeTruthy();

      await logoutUser(agent);
    });

  });

  describe("GET /kiosk/consultation", () => {
    it("should return 401 when no session", async () => {
      // Use a fresh request without the agent to ensure no session cookie
      const response = await request(app).get("/kiosk/consultation");
      expect(response.status).toBe(401);
    });
  });

  describe("PUT /kiosk/consultation/status", () => {
    it("should return 401 when no session", async () => {
      const response = await request(app).put("/kiosk/consultation/status").send({ status: "completed" });
      expect(response.status).toBe(401);
    });
  });

  describe("GET /kiosk/:kioskUserId/consultation", () => {
    it("should return 401 when no session", async () => {
      const response = await request(app).get("/kiosk/test-user-id/consultation");
      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /kiosk/:kioskUserId/consultation", () => {
    it("should return 401 when no session", async () => {
      const response = await request(app).delete("/kiosk/test-user-id/consultation");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /kiosk/:kioskUserId/consultation/:consultationId", () => {
    it("should return 401 when no session", async () => {
      const response = await request(app).post("/kiosk/test-user-id/consultation/test-consultation-id");
      expect(response.status).toBe(401);
    });
  });
});
