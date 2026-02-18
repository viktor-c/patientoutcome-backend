import type { CustomFormData } from "@/api/formtemplate/formTemplateModel";
import type { FormTemplatePlugin, FormTemplateJson, ScoringData, SubscaleScore } from "../types";
import * as aofasMidfootJsonForm from "./AOFAS_Midfoot_JsonForm_Export.json";

/**
 * Calculate AOFAS Midfoot score from form data
 * @param {Object} data - Form data with question responses (nested by section)
 * @returns {Object} ScoringData structure
 */
function calculateAofasMidfootScore(data: CustomFormData): ScoringData {
  // AOFAS Midfoot has a single section with 10 questions
  const sectionKey = Object.keys(data)[0]; // e.g., 'midfoot'
  const questions = data[sectionKey] || {};
  const TOTAL_QUESTIONS = 10; // Fixed number of questions in AOFAS Midfoot

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
        "aofas-midfoot": {
          name: "AOFAS Midfoot",
          description: "American Orthopedic Foot & Ankle Society Midfoot Score",
          rawScore: 0,
          normalizedScore: 0,
          maxScore: 100,
          answeredQuestions: 0,
          totalQuestions: TOTAL_QUESTIONS,
          completionPercentage: 0,
          isComplete: false,
        },
      },
      totalScore: {
        name: "AOFAS Midfoot Total",
        description: "American Orthopedic Foot & Ankle Society Midfoot Score",
        rawScore: 0,
        normalizedScore: 0,
        maxScore: 100,
        answeredQuestions: 0,
        totalQuestions: TOTAL_QUESTIONS,
        completionPercentage: 0,
        isComplete: false,
      },
    };
  }

  const rawScore: number = validAnswers.reduce((sum, value) => sum + value, 0);

  // AOFAS Midfoot max score is 100 (based on clinical standard)
  const maxScore = 100;
  const completionRate = validAnswers.length / TOTAL_QUESTIONS;
  const normalizedScore = (rawScore / maxScore) * 100;

  const totalScore: SubscaleScore = {
    name: "AOFAS Midfoot Total",
    description: "American Orthopedic Foot & Ankle Society Midfoot Score",
    rawScore,
    normalizedScore: Math.round(normalizedScore * 100) / 100,
    maxScore,
    answeredQuestions: validAnswers.length,
    totalQuestions: TOTAL_QUESTIONS,
    completionPercentage: Math.round(completionRate * 100),
    isComplete: completionRate === 1,
  };

  return {
    rawFormData: data,
    subscales: { "aofas-midfoot": totalScore },
    totalScore: totalScore,
  };
}

/**
 * Generate mock AOFAS Midfoot form data for testing
 */
function generateMockData(): CustomFormData {
  return ((aofasMidfootJsonForm as unknown as FormTemplateJson).formData as CustomFormData) || {};
}

/**
 * AOFAS Midfoot Form Template Plugin
 * American Orthopedic Foot & Ankle Society Midfoot Score
 */
export const aofasMidfootPlugin: FormTemplatePlugin = {
  templateId: "67b4e612d0feb4ad99ae2e86",
  name: "AOFAS Midfoot Score",
  description: "American Orthopedic Foot & Ankle Society clinical rating system for midfoot",
  formTemplate: aofasMidfootJsonForm as unknown as FormTemplateJson,
  calculateScore: calculateAofasMidfootScore,
  generateMockData,
};
