import { userRepository } from "@/api/user/userRepository";
import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
describe("User Authentication", () => {
  let userSessions: Array<{ TestAgent: any; sessionKey: string }> = [];

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
  });

  it("should login all users in userRepository.mockUsers, then log them out", async () => {
    for (const user of userRepository.mockUsers) {
      const agent = request.agent(app);
      const loginResponse = await agent
        .post("/user/login")
        .send({ username: user.username, password: "password123#124" });
      expect(loginResponse.status).toBe(200);

      // Store the agent (which maintains the session automatically)
      userSessions.push({ TestAgent: agent, sessionKey: "" });
    }
    expect(userSessions.length).toBe(userRepository.mockUsers.length);
  });

  it("should logout all users", async () => {
    expect(userSessions.length).toBeGreaterThan(0);
    // Iterate through each user session and log them out
    for (const { TestAgent } of userSessions) {
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
