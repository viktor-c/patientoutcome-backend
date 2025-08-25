import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "@/server";

import { generateOpenAPIDocument } from "../openAPIDocumentGenerator";

describe("OpenAPI Router", () => {
  describe("Swagger JSON route", () => {
    it("should return Swagger JSON content", async () => {
      // Arrange
      const expectedResponse = generateOpenAPIDocument();

      // Act
      const response = await request(app).get("/openapi/v1/swagger.json");

      // Assert
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.type).toBe("application/json");
      expect(response.body).toEqual(expectedResponse);
    });

    it("should serve the Swagger UIopenapi", async () => {
      // Act
      const response = await request(app).get("/openapi/v1/");

      // Assert
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.text).toContain("Swagger UI");
    });
  });
});
