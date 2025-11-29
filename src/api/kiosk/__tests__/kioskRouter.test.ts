import { app } from "@/server";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("Kiosk API", () => {
  describe("GET /kiosk/consultation", () => {
    it("should return 401 when no session", async () => {
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
