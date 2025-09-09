import { BlueprintRepository } from "@/api/blueprint/blueprintRepository";
import { describe, expect, it, vi } from "vitest";

describe("Blueprint Environment Protection", () => {
  it("should allow mock data access in test environment (current)", () => {
    const blueprintRepository = new BlueprintRepository();

    // Should not throw an error in test environment
    expect(() => {
      const mockData = blueprintRepository.mockBlueprints;
      expect(mockData).toBeDefined();
      expect(Array.isArray(mockData)).toBe(true);
      expect(mockData.length).toBe(5); // We have 5 mock blueprints
    }).not.toThrow();
  });

  it("should allow createMockData in test environment (current)", async () => {
    const blueprintRepository = new BlueprintRepository();

    // Should not throw an error in test environment
    // We won't actually call createMockData here as it requires database connection
    // But we can verify the method exists and is callable
    expect(typeof blueprintRepository.createMockData).toBe("function");
  });

  it("should have properly structured mock data", () => {
    const blueprintRepository = new BlueprintRepository();
    const mockData = blueprintRepository.mockBlueprints;

    expect(mockData).toHaveLength(5);

    // Check first blueprint structure
    const firstBlueprint = mockData[0];
    expect(firstBlueprint.blueprintFor).toBe("case");
    expect(firstBlueprint.title).toBe("Standard Orthopedic Case Template");
    expect(firstBlueprint.tags).toContain("case");
    expect(firstBlueprint.tags).toContain("patient-care");

    // Check second blueprint structure
    const secondBlueprint = mockData[1];
    expect(secondBlueprint.blueprintFor).toBe("consultation");
    expect(secondBlueprint.title).toBe("Patient Consultation Template");
    expect(secondBlueprint.tags).toContain("consultation");
    expect(secondBlueprint.tags).toContain("clinical");

    // Check third blueprint structure
    const thirdBlueprint = mockData[2];
    expect(thirdBlueprint.blueprintFor).toBe("surgery");
    expect(thirdBlueprint.title).toBe("Surgery Documentation Template");
    expect(thirdBlueprint.tags).toContain("surgery");
    expect(thirdBlueprint.tags).toContain("procedure");

    // Check fourth blueprint structure (Hallux Valgus Patient Case)
    const fourthBlueprint = mockData[3];
    expect(fourthBlueprint.blueprintFor).toBe("case");
    expect(fourthBlueprint.title).toBe("Hallux Valgus Patient Case Template");
    expect(fourthBlueprint.tags).toContain("case");
    expect(fourthBlueprint.tags).toContain("hallux-valgus");
    expect(fourthBlueprint.tags).toContain("orthopedic");

    // Check fifth blueprint structure (Comprehensive Consultation Template)
    const fifthBlueprint = mockData[4];
    expect(fifthBlueprint.blueprintFor).toBe("consultation");
    expect(fifthBlueprint.title).toBe("Comprehensive Consultation Workflow Template");
    expect(fifthBlueprint.tags).toContain("consultation");
    expect(fifthBlueprint.tags).toContain("workflow");
    expect(JSON.stringify(fifthBlueprint.content)).toContain("reasonForConsultation");
  });

  it("should use faker to generate dates in the past", () => {
    const blueprintRepository = new BlueprintRepository();
    const mockData = blueprintRepository.mockBlueprints;
    const currentDate = new Date();

    // Check that all mock blueprints have createdOn dates in the past
    mockData.forEach((blueprint, index) => {
      expect(blueprint.createdOn).toBeDefined();
      expect(blueprint.createdOn).toBeInstanceOf(Date);

      // Verify the date is in the past (before current date)
      expect(blueprint.createdOn!.getTime()).toBeLessThan(currentDate.getTime());

      // Verify the date is within the past year (not too old)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      expect(blueprint.createdOn!.getTime()).toBeGreaterThan(oneYearAgo.getTime());
    });
  });
});
