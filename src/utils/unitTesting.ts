import request from "supertest";
import type TestAgent from "supertest/lib/agent";
import { userRepository } from "../api/user/userRepository";
import { app } from "../server";

// Map roles to mockUsers index based on the mockUsers array
const roleToUserIndex: Record<string, string> = {
  student: "676336bea497301f6eff8c8d",
  mfa: "676336bea497301f6eff8c8e",
  doctor: "676336bea497301f6eff8c8f",
  "study-nurse": "676336bea497301f6eff8c90",
  "project-manager": "676336bea497301f6eff8c91",
  admin: "676336bea497301f6eff8c92",
  developer: "676336bea497301f6eff8c94",
};

/**
 * Logs in a user by role and returns a supertest agent with the session.
 * @param role - The user role to login as (e.g., 'admin', 'doctor', 'mfa')
 * @returns {Promise<{ agent: request.SuperAgentTest, sessionCookie: string }>} The authenticated agent and session cookie
 */
export async function loginUserWithRole(role: keyof typeof roleToUserIndex) {
  // only allow this function if we are testing
  if (process.env.NODE_ENV !== "test") {
    throw new Error("unitTesting.ts: login function can only be used in test environment");
  }
  const userIndex = roleToUserIndex[role];
  if (userIndex === undefined) {
    throw new Error(`Unknown role: ${role}`);
  }
  const user = userRepository.mockUsers.find((u) => u._id?.toString() === userIndex);
  if (!user) {
    throw new Error(`User with id ${userIndex} not found in mockUsers`);
  }
  const agent = request.agent(app);
  const loginResponse = await agent
    .post("/user/login")
    .send({ username: user.username, password: "password123#124" }) // passwords are identical for all mock users
    .expect(200);

  // Extract just the session cookie name=value, without attributes like HttpOnly, Secure, etc.
  const setCookieHeader = loginResponse.headers["set-cookie"]?.[0] || "";
  const sessionCookie = setCookieHeader.split(";")[0] || "";

  return { agent, sessionCookie };
}

/**
 * Alternative login function that returns only the agent (recommended approach).
 * The agent automatically handles session cookies, no need for manual cookie management.
 * @param role - The user role to login as (e.g., 'admin', 'doctor', 'mfa')
 * @returns {Promise<TestAgent>} The authenticated agent
 */
export async function loginUserAgent(role: keyof typeof roleToUserIndex): Promise<TestAgent> {
  // only allow this function if we are testing
  if (process.env.NODE_ENV !== "test") {
    throw new Error("unitTesting.ts: login function can only be used in test environment");
  }
  const userIndex = roleToUserIndex[role];
  if (userIndex === undefined) {
    throw new Error(`Unknown role: ${role}`);
  }
  const user = userRepository.mockUsers.find((u) => u._id?.toString() === userIndex);
  if (!user) {
    throw new Error(`User with id ${userIndex} not found in mockUsers`);
  }
  const agent = request.agent(app);
  await agent
    .post("/user/login")
    .send({ username: user.username, password: "password123#124" }) // passwords are identical for all mock users
    .expect(200);

  return agent;
}

/**
 * Logs out a user using the provided agent and session cookie.
 * @param agent - The supertest agent with the session.
 * @param sessionCookie - The session cookie string.
 * @returns {Promise<void>}
 * @deprecated Use logoutUser instead for cleaner session management
 */
export async function logoutUserWithCookie(agent: TestAgent, sessionCookie: string): Promise<void> {
  await agent.get("/user/logout").set("Cookie", sessionCookie).expect(200);
}

/**
 * Logs out a user using the provided agent (recommended approach).
 * The agent automatically handles session cookies.
 * @param agent - The supertest agent with the session.
 * @returns {Promise<void>}
 */
export async function logoutUser(agent: TestAgent): Promise<void> {
  await agent.get("/user/logout").expect(200);
}
