import { app } from "@/server";
import { loginUserAgent, logoutUser } from "@/utils/unitTesting";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { describe, expect, it } from "vitest";

/**
 * Test suite to verify proper distinction between:
 * - 401 (Authentication Required) - No session
 * - 403 (Access Denied) - Valid session but insufficient permissions
 */
describe("ACL Authorization Tests", () => {
  describe("Authentication vs Authorization - 401 vs 403", () => {
    describe("User Delete Endpoint (requires admin level)", () => {
      it("should return 401 when not logged in", async () => {
        const response = await request(app).delete("/user/username/testuser");

        expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
        expect(response.body.message).toContain("Authentication required");
      });

      it("should return 403 when logged in as student (insufficient permissions)", async () => {
        const agent = await loginUserAgent("student");
        const response = await agent.delete("/user/username/testuser");

        expect(response.status).toBe(StatusCodes.FORBIDDEN);
        expect(response.body.message).toContain("Access denied");

        await logoutUser(agent);
      });

      it("should return 403 when logged in as mfa (insufficient authentication level)", async () => {
        const agent = await loginUserAgent("mfa");
        const response = await agent.delete("/user/username/testuser");

        expect(response.status).toBe(StatusCodes.FORBIDDEN);
        expect(response.body.message).toContain("Access denied");

        await logoutUser(agent);
      });

      it("should allow admin to delete user", async () => {
        const agent = await loginUserAgent("admin");
        const response = await agent.delete("/user/username/nonexistentuser");

        // Should not return 403, might return 404 if user doesn't exist
        expect(response.status).not.toBe(StatusCodes.FORBIDDEN);
        expect(response.status).not.toBe(StatusCodes.UNAUTHORIZED);

        await logoutUser(agent);
      });
    });

    describe("Kiosk Get Endpoint (requires kiosk role)", () => {
      it("should return 401 when not logged in", async () => {
        const response = await request(app).get("/kiosk/consultation");

        expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
        expect(response.body.message).toContain("Authentication required");
      });

      it("should return 403 when logged in as student (wrong role)", async () => {
        const agent = await loginUserAgent("student");
        const response = await agent.get("/kiosk/consultation");

        expect(response.status).toBe(StatusCodes.FORBIDDEN);
        expect(response.body.message).toContain("Access denied");

        await logoutUser(agent);
      });

      it("should return 403 when logged in as admin (kiosk role required, not just high level)", async () => {
        const agent = await loginUserAgent("admin");
        const response = await agent.get("/kiosk/consultation");

        expect(response.status).toBe(StatusCodes.FORBIDDEN);
        expect(response.body.message).toContain("Access denied");

        await logoutUser(agent);
      });
    });

    describe("Kiosk Admin Endpoint (requires at least mfa level)", () => {
      it("should return 401 when not logged in", async () => {
        const response = await request(app).get("/kiosk/testuser123/consultation");

        expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
        expect(response.body.message).toContain("Authentication required");
      });

      it("should return 403 when logged in as student (insufficient authentication level)", async () => {
        const agent = await loginUserAgent("student");
        const response = await agent.get("/kiosk/testuser123/consultation");

        expect(response.status).toBe(StatusCodes.FORBIDDEN);
        expect(response.body.message).toContain("Access denied");

        await logoutUser(agent);
      });

      it("should allow mfa user to access kiosk admin endpoint", async () => {
        const agent = await loginUserAgent("mfa");
        const response = await agent.get("/kiosk/testuser123/consultation");

        // Should not return 403 or 401, might return 404 if kiosk not found
        expect(response.status).not.toBe(StatusCodes.FORBIDDEN);
        expect(response.status).not.toBe(StatusCodes.UNAUTHORIZED);

        await logoutUser(agent);
      });

      it("should allow admin user to access kiosk admin endpoint", async () => {
        const agent = await loginUserAgent("admin");
        const response = await agent.get("/kiosk/testuser123/consultation");

        // Should not return 403 or 401, might return 404 if kiosk not found
        expect(response.status).not.toBe(StatusCodes.FORBIDDEN);
        expect(response.status).not.toBe(StatusCodes.UNAUTHORIZED);

        await logoutUser(agent);
      });
    });

    describe("General User Endpoints (requires authenticated)", () => {
      it("should return 401 when not logged in", async () => {
        const response = await request(app).get("/user");

        expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
        expect(response.body.message).toContain("Authentication required");
      });

      it("should allow any authenticated user (student)", async () => {
        const agent = await loginUserAgent("student");
        const response = await agent.get("/user");

        // Should not return 403 or 401
        expect(response.status).not.toBe(StatusCodes.FORBIDDEN);
        expect(response.status).not.toBe(StatusCodes.UNAUTHORIZED);

        await logoutUser(agent);
      });

      it("should allow any authenticated user (mfa)", async () => {
        const agent = await loginUserAgent("mfa");
        const response = await agent.get("/user");

        // Should not return 403 or 401
        expect(response.status).not.toBe(StatusCodes.FORBIDDEN);
        expect(response.status).not.toBe(StatusCodes.UNAUTHORIZED);

        await logoutUser(agent);
      });
    });
  });

  describe("Error Message Consistency", () => {
    it("should use consistent 401 message pattern for authentication failures", async () => {
      // Test GET /user
      const response1 = await request(app).get("/user");
      if (response1.status === StatusCodes.UNAUTHORIZED) {
        expect(response1.body.message).toMatch(/Authentication required/i);
      }

      // Test GET /user/kiosk-users
      const response2 = await request(app).get("/user/kiosk-users");
      if (response2.status === StatusCodes.UNAUTHORIZED) {
        expect(response2.body.message).toMatch(/Authentication required/i);
      }

      // Test PUT /user/change-password
      const response3 = await request(app).put("/user/change-password");
      if (response3.status === StatusCodes.UNAUTHORIZED) {
        expect(response3.body.message).toMatch(/Authentication required/i);
      }

      // Test GET /kiosk/consultation
      const response4 = await request(app).get("/kiosk/consultation");
      if (response4.status === StatusCodes.UNAUTHORIZED) {
        expect(response4.body.message).toMatch(/Authentication required/i);
      }
    });

    it("should use consistent 403 message pattern for authorization failures", async () => {
      const agent = await loginUserAgent("student");

      // Test DELETE /user (requires admin)
      const response = await agent.delete("/user/username/testuser");

      if (response.status === StatusCodes.FORBIDDEN) {
        expect(response.body.message).toMatch(/Access denied/i);
      }

      await logoutUser(agent);
    });
  });
});
