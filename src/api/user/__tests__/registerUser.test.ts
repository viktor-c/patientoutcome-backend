import { app } from "@/server";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RegistrationCodeModel } from "../registrationCodeModel";
import { userModel } from "../userModel";

const validCode = "ABC-123-XYZ";

describe("POST /user/register", () => {
  beforeAll(async () => {
    await RegistrationCodeModel.create({
      code: validCode,
      creationDate: new Date(),
      activationDate: new Date(),
      validUntil: new Date(Date.now() + 1000 * 60 * 60),
      userCreatedWith: null,
      userRole: "user",
      active: true,
    });
  });
  afterAll(async () => {
    await RegistrationCodeModel.deleteMany({});
    await userModel.deleteMany({});
  });

  it("registers a new user with valid data and code", async () => {
    const res = await request(app).post("/user/register").send({
      username: "testuser",
      email: "test@example.com",
      password: "Test123",
      confirmPassword: "Test123",
      registrationCode: validCode,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("username", "testuser");
  });

  it("rejects registration with duplicate email", async () => {
    await userModel.create({
      username: "otheruser",
      email: "dupe@example.com",
      password: "Test123",
      role: "user",
    });
    const res = await request(app).post("/user/register").send({
      username: "newuser",
      email: "dupe@example.com",
      password: "Test123",
      confirmPassword: "Test123",
      registrationCode: validCode,
    });
    expect(res.status).toBe(409);
  });

  it("rejects registration with invalid password", async () => {
    const res = await request(app).post("/user/register").send({
      username: "badpass",
      email: "badpass@example.com",
      password: "short",
      confirmPassword: "short",
      registrationCode: validCode,
    });
    expect(res.status).toBe(400);
  });

  it("rejects registration with expired code", async () => {
    const expiredCode = "ZZZ-999-YYY";
    await RegistrationCodeModel.create({
      code: expiredCode,
      creationDate: new Date(),
      activationDate: new Date(),
      validUntil: new Date(Date.now() - 1000),
      userCreatedWith: null,
      userRole: "user",
      active: true,
    });
    const res = await request(app).post("/user/register").send({
      username: "expired",
      email: "expired@example.com",
      password: "Test123",
      confirmPassword: "Test123",
      registrationCode: expiredCode,
    });
    expect(res.status).toBe(400);
  });
});
