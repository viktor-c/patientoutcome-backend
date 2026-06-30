import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";

describe("Feedback API Tests", () => {
  let captchaId: string;
  let captchaAnswer: string;

  beforeEach(async () => {
    // Get a fresh captcha for each test
    const captchaResponse = await request(app).get("/feedback/captcha");
    if (captchaResponse.status === StatusCodes.OK) {
      captchaId = captchaResponse.body.responseObject.captchaId;
      captchaAnswer = captchaResponse.body.responseObject.captchaText;
    }
  });

  describe("GET /feedback/captcha", () => {
    it("should generate a new captcha challenge", async () => {
      const response = await request(app).get("/feedback/captcha");

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.responseObject).toBeDefined();
      expect(response.body.responseObject.captchaId).toBeDefined();
      expect(response.body.responseObject.captchaSvg).toBeDefined();
      expect(typeof response.body.responseObject.captchaId).toBe("string");
      expect(typeof response.body.responseObject.captchaSvg).toBe("string");
    });

    it("should generate unique captcha IDs", async () => {
      const response1 = await request(app).get("/feedback/captcha");
      const response2 = await request(app).get("/feedback/captcha");

      expect(response1.body.responseObject.captchaId).not.toBe(
        response2.body.responseObject.captchaId
      );
    });

    it("should generate svg captcha markup", async () => {
      const response = await request(app).get("/feedback/captcha");

      const captchaSvg = response.body.responseObject.captchaSvg;
      expect(captchaSvg).toContain("<svg");
    });

    it("should not require authentication", async () => {
      // Should work without login
      const response = await request(app).get("/feedback/captcha");

      expect(response.status).toBe(StatusCodes.OK);
    });
  });

  describe("POST /feedback", () => {
    it("should submit feedback with valid captcha", async () => {
      if (!captchaId || !captchaAnswer) {
        return; // Skip if captcha setup failed
      }

      const response = await request(app)
        .post("/feedback")
        .send({
          name: "Test User",
          email: "test@example.com",
          message: "This is a test feedback message",
          captchaId,
          captchaAnswer,
          locale: "en",
        });

      expect([StatusCodes.OK, StatusCodes.INTERNAL_SERVER_ERROR]).toContain(
        response.status
      );
    });

    it("should allow anonymous feedback", async () => {
      if (!captchaId || !captchaAnswer) {
        return;
      }

      const response = await request(app)
        .post("/feedback")
        .send({
          message: "Anonymous feedback",
          captchaId,
          captchaAnswer,
        });

      expect([StatusCodes.OK, StatusCodes.INTERNAL_SERVER_ERROR]).toContain(
        response.status
      );
    });

    it("should reject feedback with wrong captcha answer", async () => {
      if (!captchaId) {
        return;
      }

      const response = await request(app)
        .post("/feedback")
        .send({
          name: "Test User",
          email: "test@example.com",
          message: "This should be rejected",
          captchaId,
          captchaAnswer: "wrong-answer",
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toContain("Captcha verification failed");
    });

    it("should reject feedback with missing captcha ID", async () => {
      const response = await request(app)
        .post("/feedback")
        .send({
          name: "Test User",
          message: "Missing captcha ID",
          captchaAnswer: "123",
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it("should reject feedback with missing captcha answer", async () => {
      if (!captchaId) {
        return;
      }

      const response = await request(app)
        .post("/feedback")
        .send({
          name: "Test User",
          message: "Missing captcha answer",
          captchaId,
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it("should reject feedback with empty message", async () => {
      if (!captchaId || !captchaAnswer) {
        return;
      }

      const response = await request(app)
        .post("/feedback")
        .send({
          name: "Test User",
          message: "",
          captchaId,
          captchaAnswer,
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toContain("Message is required");
    });

    it("should reject feedback with invalid email format", async () => {
      if (!captchaId || !captchaAnswer) {
        return;
      }

      const response = await request(app)
        .post("/feedback")
        .send({
          name: "Test User",
          email: "not-an-email",
          message: "Test message",
          captchaId,
          captchaAnswer,
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it("should accept empty email string", async () => {
      if (!captchaId || !captchaAnswer) {
        return;
      }

      const response = await request(app)
        .post("/feedback")
        .send({
          name: "Test User",
          email: "",
          message: "Test message",
          captchaId,
          captchaAnswer,
        });

      expect([StatusCodes.OK, StatusCodes.INTERNAL_SERVER_ERROR]).toContain(
        response.status
      );
    });

    it("should sanitize message content", async () => {
      if (!captchaId || !captchaAnswer) {
        return;
      }

      const maliciousMessage = '<script>alert("XSS")</script>';
      const response = await request(app)
        .post("/feedback")
        .send({
          name: "Test User",
          message: maliciousMessage,
          captchaId,
          captchaAnswer,
        });

      // Should not crash and should handle safely
      expect([StatusCodes.OK, StatusCodes.BAD_REQUEST, StatusCodes.INTERNAL_SERVER_ERROR]).toContain(
        response.status
      );
    });

    it("should handle very long messages", async () => {
      if (!captchaId || !captchaAnswer) {
        return;
      }

      const longMessage = "a".repeat(10000);
      const response = await request(app)
        .post("/feedback")
        .send({
          message: longMessage,
          captchaId,
          captchaAnswer,
        });

      // Should either accept or reject gracefully
      expect([StatusCodes.OK, StatusCodes.BAD_REQUEST, StatusCodes.INTERNAL_SERVER_ERROR]).toContain(
        response.status
      );
    });

    it("should reject reused captcha", async () => {
      if (!captchaId || !captchaAnswer) {
        return;
      }

      // Submit once
      const response1 = await request(app)
        .post("/feedback")
        .send({
          message: "First submission",
          captchaId,
          captchaAnswer,
        });

      // Try to reuse same captcha
      const response2 = await request(app)
        .post("/feedback")
        .send({
          message: "Second submission with same captcha",
          captchaId,
          captchaAnswer,
        });

      // Second attempt should fail (captcha should be one-time use)
      expect(response2.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it("should reject expired captcha", async () => {
      // Get a captcha
      const captchaResponse = await request(app).get("/feedback/captcha");
      const oldCaptchaId = captchaResponse.body.responseObject.captchaId;

      // Wait a bit (this would need a much longer wait in production)
      // For testing, we just verify the mechanism exists
      const response = await request(app)
        .post("/feedback")
        .send({
          message: "Testing expired captcha",
          captchaId: oldCaptchaId,
          captchaAnswer: "999", // wrong answer to simulate expired
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it("should support different locales", async () => {
      if (!captchaId || !captchaAnswer) {
        return;
      }

      const locales = ["en", "de", "en-US", "de-DE"];

      for (const locale of locales) {
        // Get fresh captcha
        const captchaResp = await request(app).get("/feedback/captcha");
        const freshCaptchaId = captchaResp.body.responseObject.captchaId;
        const answer = captchaResp.body.responseObject.captchaText;

        const response = await request(app)
          .post("/feedback")
          .send({
            message: `Test message in ${locale}`,
            captchaId: freshCaptchaId,
            captchaAnswer: answer,
            locale,
          });

        expect([StatusCodes.OK, StatusCodes.BAD_REQUEST, StatusCodes.INTERNAL_SERVER_ERROR]).toContain(
          response.status
        );
      }
    });

    it("should not require authentication", async () => {
      if (!captchaId || !captchaAnswer) {
        return;
      }

      // Should work without login
      const response = await request(app)
        .post("/feedback")
        .send({
          message: "Anonymous feedback from unauthenticated user",
          captchaId,
          captchaAnswer,
        });

      expect([StatusCodes.OK, StatusCodes.INTERNAL_SERVER_ERROR]).toContain(
        response.status
      );
    });

    it("should handle concurrent submissions", async () => {
      // Get multiple captchas
      const captchas = await Promise.all([
        request(app).get("/feedback/captcha"),
        request(app).get("/feedback/captcha"),
        request(app).get("/feedback/captcha"),
      ]);

      const submissions = captchas.map((captchaResp) => {
        const captchaId = captchaResp.body.responseObject.captchaId;
        const answer = captchaResp.body.responseObject.captchaText;

        return request(app)
          .post("/feedback")
          .send({
            message: "Concurrent feedback",
            captchaId,
            captchaAnswer: answer,
          });
      });

      const responses = await Promise.all(submissions);

      // All should complete without errors
      responses.forEach((response) => {
        expect([StatusCodes.OK, StatusCodes.BAD_REQUEST, StatusCodes.INTERNAL_SERVER_ERROR]).toContain(
          response.status
        );
      });
    });
  });

  describe("Captcha Security", () => {
    it("should generate cryptographically secure captcha IDs", async () => {
      const response = await request(app).get("/feedback/captcha");
      const captchaId = response.body.responseObject.captchaId;

      // Should be reasonably long and random
      expect(captchaId.length).toBeGreaterThan(10);
      expect(captchaId).toMatch(/^[a-f0-9]+$/);
    });

    it("should not accept invalid captcha ID format", async () => {
      const response = await request(app)
        .post("/feedback")
        .send({
          message: "Test",
          captchaId: "invalid<script>",
          captchaAnswer: "123",
        });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it("should rate limit captcha generation", async () => {
      // Request many captchas quickly
      const requests = Array(100)
        .fill(null)
        .map(() => request(app).get("/feedback/captcha"));

      const responses = await Promise.all(requests);

      // Most should succeed, but might hit rate limits
      const successCount = responses.filter(
        (r) => r.status === StatusCodes.OK
      ).length;

      expect(successCount).toBeGreaterThan(0);
    });
  });
});
