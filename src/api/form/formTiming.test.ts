import { describe, expect, it } from "vitest";
import { Form } from "./formModel";
import { FormAccessLevel } from "@/api/formtemplate/formTemplateModel";

describe("Form Model Timing Fields", () => {
  it("should validate form model with timing fields", () => {
    const formData = {
      _id: "507f1f77bcf86cd799439011",
      caseId: "507f1f77bcf86cd799439012",
      consultationId: "507f1f77bcf86cd799439013",
      formTemplateId: "507f1f77bcf86cd799439014",
      title: "Test Form",
      description: "Test Description",
      accessLevel: FormAccessLevel.PATIENT,
      patientFormData: {
        rawFormData: {},
        fillStatus: "complete" as const,
        completedAt: new Date("2023-01-01T10:02:00Z"),
        beginFill: new Date("2023-01-01T10:00:00Z"),
      },
      createdAt: new Date("2023-01-01T10:00:00Z"),
      updatedAt: new Date("2023-01-01T10:02:00Z"),
      // New timing fields
      formStartTime: new Date("2023-01-01T10:00:00Z"),
      formEndTime: new Date("2023-01-01T10:02:00Z"),
      completionTimeSeconds: 120,
    };

    const result = Form.safeParse(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.formStartTime).toEqual(new Date("2023-01-01T10:00:00Z"));
      expect(result.data.formEndTime).toEqual(new Date("2023-01-01T10:02:00Z"));
      expect(result.data.completionTimeSeconds).toBe(120);
    }
  });

  it("should allow optional timing fields", () => {
    const formData = {
      _id: "507f1f77bcf86cd799439011",
      caseId: "507f1f77bcf86cd799439012",
      consultationId: "507f1f77bcf86cd799439013",
      formTemplateId: "507f1f77bcf86cd799439014",
      title: "Test Form",
      description: "Test Description",
      accessLevel: FormAccessLevel.PATIENT,
      patientFormData: null,
      // Timing fields are optional
    };

    const result = Form.safeParse(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.formStartTime).toBeUndefined();
      expect(result.data.formEndTime).toBeUndefined();
      expect(result.data.completionTimeSeconds).toBeUndefined();
    }
  });

  it("should reject negative completion time", () => {
    const formData = {
      _id: "507f1f77bcf86cd799439011",
      caseId: "507f1f77bcf86cd799439012",
      consultationId: "507f1f77bcf86cd799439013",
      formTemplateId: "507f1f77bcf86cd799439014",
      title: "Test Form",
      description: "Test Description",
      accessLevel: FormAccessLevel.PATIENT,
      patientFormData: null,
      completionTimeSeconds: -120, // Invalid negative value
    };

    const result = Form.safeParse(formData);

    expect(result.success).toBe(false);
  });
});
