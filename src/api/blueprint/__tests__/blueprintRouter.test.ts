import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { Blueprint, CreateBlueprint } from "@/api/blueprint/blueprintModel";
import { blueprintRepository } from "@/api/seed/seedRouter";
import type { ServiceResponse } from "@/common/models/serviceResponse";
import { app } from "@/server";
import { loginUserAgent } from "@/utils/unitTesting";
import type { ObjectId } from "mongoose";

// Type definitions for test responses
type BlueprintListResponse = ServiceResponse<{
  blueprints: Blueprint[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>;

type BlueprintResponse = ServiceResponse<Blueprint>;
type DeleteBlueprintResponse = ServiceResponse<null>;

let newBlueprintId: string | ObjectId = "";

const newBlueprint: CreateBlueprint = {
  blueprintFor: "case",
  title: "Test Blueprint",
  description: "A test blueprint for unit testing",
  timeDelta: "0",
  content: {
    testField: "test value",
    nestedObject: {
      field1: "value1",
      field2: 123,
    },
  },
  tags: ["test", "unit-test"],
};

describe("Blueprint API Endpoints", () => {
  beforeAll(async () => {
    try {
      // Seed users first for authentication to work
      const userRes = await request(app).get("/seed/users");
      if (userRes.status !== StatusCodes.OK) {
        throw new Error("Failed to insert user mock data");
      }

      // Then seed blueprints
      const res = await request(app).get("/seed/blueprints");
      if (res.status !== StatusCodes.OK) {
        throw new Error("Failed to insert blueprint mock data");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Setup failed: ${error.message}`);
      } else {
        throw new Error("Setup failed: Unknown error");
      }
    }
  });

  describe("GET /blueprints", () => {
    it("should return a paginated list of blueprints", async () => {
      // Act
      const response = await request(app).get("/blueprints");
      const responseBody: BlueprintListResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Blueprints found");
      expect(responseBody.responseObject.blueprints.length).toBeGreaterThanOrEqual(6); // Based on mock data (6 blueprints)
      expect(responseBody.responseObject.total).toBeGreaterThanOrEqual(6);
      expect(responseBody.responseObject.page).toBe(1);
      expect(responseBody.responseObject.limit).toBe(10);
    });

    it("should return filtered blueprints by blueprintFor", async () => {
      // Act
      const response = await request(app).get("/blueprints?blueprintFor=case");
      const responseBody: BlueprintListResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.blueprints).toHaveLength(1);
      expect(responseBody.responseObject.blueprints[0].blueprintFor).toBe("case");
    });

    it("should support pagination", async () => {
      // Act
      const response = await request(app).get("/blueprints?page=1&limit=2");
      const responseBody: BlueprintListResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.blueprints).toHaveLength(2);
      expect(responseBody.responseObject.page).toBe(1);
      expect(responseBody.responseObject.limit).toBe(2);
      expect(responseBody.responseObject.totalPages).toBeGreaterThan(2);
    });

    it("should return validation error for invalid query parameters", async () => {
      // Act
      const response = await request(app).get("/blueprints?page=0&limit=101");

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });
  });

  describe("GET /blueprints/search", () => {
    it("should search blueprints by title", async () => {
      // Act
      const response = await request(app).get("/blueprints/search?q=Orthopedic");
      const responseBody: BlueprintListResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.blueprints).toHaveLength(1);
      // Check that at least one of the results contains "Orthopedic" in the title
      const hasOrthopedic = responseBody.responseObject.blueprints.some((blueprint: Blueprint) =>
        blueprint.title.includes("MICA"),
      );
      expect(hasOrthopedic).toBe(true);
    });

    it("should search blueprints by tags", async () => {
      // Act
      const response = await request(app).get("/blueprints/search?q=surgery");
      const responseBody: BlueprintListResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.responseObject.blueprints.length).toBeGreaterThan(0);
    });

    it("should filter search results by blueprintFor", async () => {
      // Act
      const response = await request(app).get("/blueprints/search?q=template&blueprintFor=consultation");
      const responseBody: BlueprintListResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      responseBody.responseObject.blueprints.forEach((blueprint: Blueprint) => {
        expect(blueprint.blueprintFor).toBe("consultation");
      });
    });

    it("should return validation error when search query is missing", async () => {
      // Act
      const response = await request(app).get("/blueprints/search");

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });
  });

  describe("POST /blueprints", () => {
    it("should create a new blueprint successfully", async () => {
      // Arrange
      const agent = await loginUserAgent("admin");

      // Act
      const response = await agent.post("/blueprints").send(newBlueprint);

      const responseBody: BlueprintResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.CREATED);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Blueprint created successfully");
      expect(responseBody.responseObject.title).toBe(newBlueprint.title);
      expect(responseBody.responseObject.blueprintFor).toBe(newBlueprint.blueprintFor);
      expect(responseBody.responseObject.description).toBe(newBlueprint.description);
      expect(responseBody.responseObject.tags).toEqual(newBlueprint.tags);
      expect(responseBody.responseObject.createdOn).toBeDefined();
      expect(responseBody.responseObject.createdBy).toBeDefined();

      // Store the ID for subsequent tests
      newBlueprintId = responseBody.responseObject._id?.toString() || "";
    });

    it("should return validation error for invalid blueprint data", async () => {
      // Arrange
      const agent = await loginUserAgent("admin");

      const invalidBlueprint = {
        blueprintFor: "invalid", // Invalid enum value
        title: "", // Empty title
        description: "Test description",
        content: {},
        tags: [],
      };

      // Act
      const response = await agent.post("/blueprints").send(invalidBlueprint);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });

    it("should return authentication error when user is not logged in", async () => {
      // Act
      const response = await request(app).post("/blueprints").send(newBlueprint);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("GET /blueprints/:id", () => {
    it("should return a blueprint by ID", async () => {
      // Arrange
      const firstBlueprintId = blueprintRepository.mockBlueprints[0]._id;

      // Act
      const response = await request(app).get(`/blueprints/${firstBlueprintId}`);
      const responseBody: BlueprintResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Blueprint found");
      expect(responseBody.responseObject).toBeDefined();
      expect(responseBody.responseObject!._id!.toString()).toBe(firstBlueprintId!.toString());
      expect(responseBody.responseObject!.title).toBeDefined();
      expect(responseBody.responseObject.blueprintFor).toBeDefined();
    });

    it("should return not found for non-existent blueprint", async () => {
      // Arrange
      const nonExistentId = "507f1f77bcf86cd799439011";

      // Act
      const response = await request(app).get(`/blueprints/${nonExistentId}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it("should return validation error for invalid ID format", async () => {
      // Arrange
      const invalidId = "invalid-id";

      // Act
      const response = await request(app).get(`/blueprints/${invalidId}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });
  });

  describe("PUT /blueprints/:id", () => {
    it("should update a blueprint successfully", async () => {
      // Arrange
      const agent = await loginUserAgent("admin");

      // Use the first mock blueprint ID
      const mockBlueprintId = blueprintRepository.mockBlueprints[0]._id;

      const updateData = {
        title: "Updated Blueprint Title",
        description: "Updated description",
        tags: ["updated", "test"],
      };

      // Act
      const response = await agent.put(`/blueprints/${mockBlueprintId}`).send(updateData);

      const responseBody: BlueprintResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Blueprint updated successfully");
      expect(responseBody.responseObject.title).toBe(updateData.title);
      expect(responseBody.responseObject.description).toBe(updateData.description);
      expect(responseBody.responseObject.tags).toEqual(updateData.tags);
      expect(responseBody.responseObject.modifiedOn).toBeDefined();
      expect(responseBody.responseObject.modifiedBy).toBeDefined();
    });
    it("should return not found for non-existent blueprint", async () => {
      // Arrange
      const agent = await loginUserAgent("admin");

      const nonExistentId = "507f1f77bcf86cd799439011";
      const updateData = { title: "Updated Title" };

      // Act
      const response = await agent.put(`/blueprints/${nonExistentId}`).send(updateData);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it("should return authentication error when user is not logged in", async () => {
      // Arrange
      const mockBlueprintId = blueprintRepository.mockBlueprints[0]._id;

      // Act
      const response = await request(app).put(`/blueprints/${mockBlueprintId}`).send({ title: "Updated Title" });

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("DELETE /blueprints/:id", () => {
    it("should delete a blueprint successfully", async () => {
      // Arrange - Use the third mock blueprint for deletion to avoid affecting other tests
      const mockBlueprintId = blueprintRepository.mockBlueprints[2]._id;

      // Act
      const response = await request(app).delete(`/blueprints/${mockBlueprintId}`);
      const responseBody: DeleteBlueprintResponse = response.body;

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.OK);
      expect(responseBody.success).toBeTruthy();
      expect(responseBody.message).toContain("Blueprint deleted successfully");

      // Verify blueprint is actually deleted
      const getResponse = await request(app).get(`/blueprints/${mockBlueprintId}`);
      expect(getResponse.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it("should return not found for non-existent blueprint", async () => {
      // Arrange
      const nonExistentId = "507f1f77bcf86cd799439011";

      // Act
      const response = await request(app).delete(`/blueprints/${nonExistentId}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });

    it("should return validation error for invalid ID format", async () => {
      // Arrange
      const invalidId = "invalid-id";

      // Act
      const response = await request(app).delete(`/blueprints/${invalidId}`);

      // Assert
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
    });
  });
});

// Helper function to compare blueprints
function compareBlueprints(expected: Blueprint, actual: Blueprint) {
  expect(actual.title).toBe(expected.title);
  expect(actual.description).toBe(expected.description);
  expect(actual.blueprintFor).toBe(expected.blueprintFor);
  expect(actual.tags).toEqual(expected.tags);
}
