import { app } from "@/server";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

describe("Code validation", () => {
  beforeAll(async () => {
    const seedEndpoints = [
      "/seed/consultation",
      "/seed/form-access-codes",
      "/seed/forms",
    ];

    for (const endpoint of seedEndpoints) {
      const response = await request(app).get(endpoint);
      if (response.status !== StatusCodes.OK) {
        throw new Error(`Failed to seed test data via ${endpoint}`);
      }
    }
  });

  it("should validate a case-level code when the case only has already-filled forms", async () => {
    const response = await request(app).get("/form-access-code/validate/SJM13");

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.responseObject).toBe(true);
  });
});