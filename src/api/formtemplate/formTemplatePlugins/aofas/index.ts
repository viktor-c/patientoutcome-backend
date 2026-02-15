import type { CustomFormData } from "@/api/formtemplate/formTemplateModel";
import type { FormTemplatePlugin, FormTemplateJson, ScoringData, SubscaleScore } from "../types";
import * as aofasJsonForm from "./AOFAS_JsonForm_Export.json";

/**
 * Calculate AOFAS score from form data
 * @param {Object} data - Form data with question responses (nested by section)
 * @returns {Object} ScoringData structure
 */
function calculateAofasScore(data: CustomFormData): ScoringData {
  // AOFAS has a single section but we need to handle nested structure
  const sectionKey = Object.keys(data)[0]; // e.g., 'vorfußfragebogen'
  const questions = data[sectionKey] || {};

  const questionKeys = Object.keys(questions);
  const validAnswers = questionKeys
    .map((key) => {
      const value = questions[key];
      return typeof value === 'number' ? value : (typeof value === 'string' ? Number.parseFloat(value) : null);
    })
    .filter((value): value is number => value !== null && !Number.isNaN(value));

  if (questionKeys.length === 0) {
    // No questions at all
    return {
      rawFormData: data,
      subscales: {},
      totalScore: null,
    };
  }

  if (validAnswers.length === 0) {
    // Questions exist, but no valid answers
    return {
      rawFormData: data,
      subscales: {
        "aofas-forefoot": {
          name: "AOFAS Forefoot",
          description: "American Orthopedic Foot & Ankle Society Forefoot Score",
          rawScore: 0,
          normalizedScore: 0,
          maxScore: 100,
          answeredQuestions: 0,
          totalQuestions: questionKeys.length,
          completionPercentage: 0,
          isComplete: false,
        },
      },
      totalScore: {
        name: "AOFAS Total",
        description: "American Orthopedic Foot & Ankle Society Score",
        rawScore: 0,
        normalizedScore: 0,
        maxScore: 100,
        answeredQuestions: 0,
        totalQuestions: questionKeys.length,
        completionPercentage: 0,
        isComplete: false,
      },
    };
  }

  const rawScore: number = validAnswers.reduce((sum, value) => sum + value, 0);

  // AOFAS max score is 100 (based on clinical standard)
  // Each question has different max values, but total is always 100
  const maxScore = 100;
  const completionRate = validAnswers.length / questionKeys.length;
  const normalizedScore = (rawScore / maxScore) * 100;

  const totalScore: SubscaleScore = {
    name: "AOFAS Total",
    description: "American Orthopedic Foot & Ankle Society Score",
    rawScore,
    normalizedScore: Math.round(normalizedScore * 100) / 100,
    maxScore,
    answeredQuestions: validAnswers.length,
    totalQuestions: questionKeys.length,
    completionPercentage: Math.round(completionRate * 100),
    isComplete: completionRate === 1,
  };

  return {
    rawFormData: data,
    subscales: { "aofas-forefoot": totalScore }, // aofas does not have subscales, but the frontend expects at least one, so put the whole score
    totalScore: totalScore,
  };
}

/**
 * Generate mock AOFAS form data for testing
 */
function generateMockData(): CustomFormData {
  return ((aofasJsonForm as unknown as FormTemplateJson).formData as CustomFormData) || {};
}

/**
 * AOFAS Form Template Plugin
 * American Orthopedic Foot & Ankle Society Score
 */
export const aofasPlugin: FormTemplatePlugin = {
  templateId: "67b4e612d0feb4ad99ae2e84",
  name: "AOFAS Forefoot Score",
  description: "American Orthopedic Foot & Ankle Society clinical rating system for forefoot",
  formTemplate: aofasJsonForm as unknown as FormTemplateJson,
  calculateScore: calculateAofasScore,
  generateMockData,
};
