import type { CustomFormData, FormTemplate as FormTemplateModelType, Questionnaire } from "@/api/formtemplate/formTemplateModel";
import type { FormTemplatePlugin, ScoringData, SubscaleScore } from "../types";
import * as vasJsonForm from "./VAS_JsonForm_Export.json";

/**
 * Calculate and fill data for VAS number scale
 * @param {Object} data - Form data with question responses (may be nested in 'vas' section or flat)
 * @returns {Object} ScoringData structure
 */
function calculateVAS(data: CustomFormData): ScoringData {
  // Support both shapes: data.vas?.pain or a direct questionnaire section like { pain: number }
  const dataRecord: Record<string, Questionnaire> = data as Record<string, Questionnaire>;
  const vasSection: Questionnaire | undefined = dataRecord.vas ?? Object.values(dataRecord)[0];
  const painValue = vasSection?.pain;
  const rawScore: number | null = typeof painValue === 'number' ? painValue : (typeof painValue === 'string' ? Number.parseFloat(painValue) : null);
  const totalScore: SubscaleScore = {
    name: "VAS Total",
    description: "Visual Analog Scale",
    rawScore: rawScore ?? null,
    normalizedScore: rawScore ?? null, // VAS is already 0-10 scale
    maxPossibleScore: 10,
    answeredQuestions: rawScore !== null ? 1 : 0,
    totalQuestions: 1,
    completionPercentage: rawScore !== null ? 100 : 0,
    isComplete: rawScore !== null,
  };

  return {
    rawData: data,
    subscales: { vas: totalScore },
    total: totalScore,
  };
}

/**
 * Generate mock VAS form data for testing
 */
function generateMockData(): CustomFormData {
  return ((vasJsonForm as unknown as FormTemplateModelType).formData as CustomFormData) || {};
}

/**
 * VAS Form Template Plugin
 * Visual Analog Scale for Pain Assessment
 */
export const vasPlugin: FormTemplatePlugin = {
  templateId: "67b4e612d0feb4ad99ae2e86",
  name: "Visual Analog Scale",
  description: "A simple 0-10 scale for pain assessment",
  formTemplate: vasJsonForm as unknown as FormTemplateModelType,
  calculateScore: calculateVAS,
  generateMockData,
};
