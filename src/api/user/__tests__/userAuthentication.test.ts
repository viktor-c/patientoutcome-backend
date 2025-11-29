import { userRepository } from "@/api/user/userRepository";
import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
describe("User Authentication", () => {
  let userSessions: Array<{ TestAgent: any; sessionKey: string }> = [];
  let testUsers: typeof userRepository.mockUsers;

  beforeAll(async () => {
    userSessions = [];
    // setup first users
    try {
      const res = await request(app).get("/seed/users");
      if (res.status !== StatusCodes.OK) {
        throw new Error("Failed to insert user data");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Setup failed for user data: ${error.message}`);
      } else {
        throw new Error("Setup failed for user data: Unknown error");
      }
    }

    try {
      const res = await request(app).get("/seed/clear-all-sessions");
      if (res.status !== StatusCodes.OK) {
        throw new Error("Failed to clear user sessions");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Setup failed for clearing sessions: ${error.message}`);
      } else {
        throw new Error("Setup failed for clearing sessions: Unknown error");
      }
    }

    // Capture the user data at test start to avoid race conditions
    testUsers = [...userRepository.mockUsers];
  });

  it("should login all users in userRepository.mockUsers, then log them out", async () => {
    // Clear sessions before this specific test to ensure clean state
    const clearSessionsRes = await request(app).get("/seed/clear-all-sessions");
    expect(clearSessionsRes.status).toBe(200);

    // Reset userSessions array
    userSessions = [];

    // Login each user sequentially to avoid race conditions
    for (const user of testUsers) {
      const agent = request.agent(app);

      // Add a small delay to prevent overwhelming the session store
      if (userSessions.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const loginResponse = await agent
        .post("/user/login")
        .send({ username: user.username, password: "password123#124" });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.responseObject.username).toBe(user.username);

      // Store the agent (which maintains the session automatically)
      userSessions.push({ TestAgent: agent, sessionKey: "" });
    }

    expect(userSessions.length).toBe(testUsers.length);

    // Log out all users sequentially
    expect(userSessions.length).toBeGreaterThan(0);

    for (const { TestAgent } of userSessions) {
      // Add a small delay between logouts
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Use the agent directly - it maintains session cookies automatically
      const res = await TestAgent.get("/user/logout");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message");
    }
  });

  afterAll(async () => {
    // Clear all user sessions after tests
    const res = await request(app).get("/seed/clear-all-sessions");
    if (res.status !== StatusCodes.OK) {
      throw new Error("Failed to clear user sessions after tests");
    }
  });
});
