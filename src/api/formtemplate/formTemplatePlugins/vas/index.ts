import * as vasJsonForm from "../../JsonFormTemplates/VAS_JsonForm_Export.json";
import type { FormTemplatePlugin, ScoringData, SubscaleScore } from "../types";

/**
 * Calculate and fill data for VAS number scale
 * @param {Object} data - Form data with question responses (may be nested in 'vas' section or flat)
 * @returns {Object} ScoringData structure
 */
function calculateVAS(data: any): ScoringData {
  const rawScore: number = data.vas?.pain ?? data.pain;
  const totalScore: SubscaleScore = {
    name: "VAS Total",
    description: "Visual Analog Scale",
    rawScore,
    normalizedScore: rawScore, // VAS is already 0-10 scale
    maxPossibleScore: 10,
    answeredQuestions: rawScore !== null && rawScore !== undefined ? 1 : 0,
    totalQuestions: 1,
    completionPercentage: rawScore !== null && rawScore !== undefined ? 100 : 0,
    isComplete: rawScore !== null && rawScore !== undefined,
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
function generateMockData(): any {
  return (vasJsonForm as any).formData || {};
}

/**
 * VAS Form Template Plugin
 * Visual Analog Scale for Pain Assessment
 */
export const vasPlugin: FormTemplatePlugin = {
  templateId: "67b4e612d0feb4ad99ae2e86",
  name: "Visual Analog Scale",
  description: "A simple 0-10 scale for pain assessment",
  formTemplate: vasJsonForm as any,
  calculateScore: calculateVAS,
  generateMockData,
};
