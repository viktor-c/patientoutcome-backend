import * as aofasJsonForm from "../../JsonFormTemplates/AOFAS_JsonForm_Export.json";
import type { FormTemplatePlugin, ScoringData, SubscaleScore } from "../types";

/**
 * Calculate AOFAS score from form data
 * @param {Object} data - Form data with question responses (nested by section)
 * @returns {Object} ScoringData structure
 */
function calculateAofasScore(data: any): ScoringData {
  // AOFAS has a single section but we need to handle nested structure
  const sectionKey = Object.keys(data)[0]; // e.g., 'vorfußfragebogen'
  const questions = data[sectionKey] || {};

  const questionKeys = Object.keys(questions);
  const validAnswers = questionKeys
    .map((key) => questions[key])
    .filter((value) => value !== null && value !== undefined);

  if (questionKeys.length === 0) {
    // No questions at all
    return {
      rawData: data,
      subscales: {},
      total: null,
    };
  }

  if (validAnswers.length === 0) {
    // Questions exist, but no valid answers
    return {
      rawData: data,
      subscales: {
        "aofas-forefoot": {
          name: "AOFAS Forefoot",
          description: "American Orthopedic Foot & Ankle Society Forefoot Score",
          rawScore: null,
          normalizedScore: null,
          maxPossibleScore: 100,
          answeredQuestions: 0,
          totalQuestions: questionKeys.length,
          completionPercentage: 0,
          isComplete: false,
        },
      },
      total: {
        name: "AOFAS Total",
        description: "American Orthopedic Foot & Ankle Society Score",
        rawScore: null,
        normalizedScore: null,
        maxPossibleScore: 100,
        answeredQuestions: 0,
        totalQuestions: questionKeys.length,
        completionPercentage: 0,
        isComplete: false,
      },
    };
  }

  const rawScore = validAnswers.reduce((sum, value) => sum + value, 0);

  // AOFAS max score is 100 (based on clinical standard)
  // Each question has different max values, but total is always 100
  const maxPossibleScore = 100;
  const completionRate = validAnswers.length / questionKeys.length;
  const normalizedScore = (rawScore / maxPossibleScore) * 100;

  const totalScore: SubscaleScore = {
    name: "AOFAS Total",
    description: "American Orthopedic Foot & Ankle Society Score",
    rawScore,
    normalizedScore: Math.round(normalizedScore * 100) / 100,
    maxPossibleScore,
    answeredQuestions: validAnswers.length,
    totalQuestions: questionKeys.length,
    completionPercentage: Math.round(completionRate * 100),
    isComplete: completionRate === 1,
  };

  return {
    rawData: data,
    subscales: { "aofas-forefoot": totalScore }, // aofas does not have subscales, but the frontend expects at least one, so put the whole score
    total: totalScore,
  };
}

/**
 * Generate mock AOFAS form data for testing
 */
function generateMockData(): any {
  return (aofasJsonForm as any).formData || {};
}

/**
 * AOFAS Form Template Plugin
 * American Orthopedic Foot & Ankle Society Score
 */
export const aofasPlugin: FormTemplatePlugin = {
  templateId: "67b4e612d0feb4ad99ae2e84",
  name: "AOFAS Forefoot Score",
  description: "American Orthopedic Foot & Ankle Society clinical rating system for forefoot",
  formTemplate: aofasJsonForm as any,
  calculateScore: calculateAofasScore,
  generateMockData,
};
