import type { CustomFormData } from "@/api/formtemplate/formTemplateModel";
import type { FormTemplatePlugin, FormTemplateJson, ScoringData, SubscaleScore } from "../types";
import * as aofasHindfootJsonForm from "./AOFAS_Hindfoot_JsonForm_Export.json";

/**
 * Calculate AOFAS Hindfoot score from form data
 * @param {Object} data - Form data with question responses (nested by section)
 * @returns {Object} ScoringData structure
 */
function calculateAofasHindfootScore(data: CustomFormData): ScoringData {
  // AOFAS Hindfoot has a single section with 10 questions
  const sectionKey = Object.keys(data)[0]; // e.g., 'hindfoot'
  const questions = data[sectionKey] || {};
  const TOTAL_QUESTIONS = 10; // Fixed number of questions in AOFAS Hindfoot

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
        "aofas-hindfoot": {
          name: "AOFAS Hindfoot",
          description: "American Orthopedic Foot & Ankle Society Ankle-Hindfoot Score",
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
        name: "AOFAS Hindfoot Total",
        description: "American Orthopedic Foot & Ankle Society Ankle-Hindfoot Score",
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

  // AOFAS Hindfoot max score is 100 (based on clinical standard)
  const maxScore = 100;
  const completionRate = validAnswers.length / TOTAL_QUESTIONS;
  const normalizedScore = (rawScore / maxScore) * 100;

  const totalScore: SubscaleScore = {
    name: "AOFAS Hindfoot Total",
    description: "American Orthopedic Foot & Ankle Society Ankle-Hindfoot Score",
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
    subscales: { "aofas-hindfoot": totalScore },
    totalScore: totalScore,
  };
}

/**
 * Generate mock AOFAS Hindfoot form data for testing
 */
function generateMockData(): CustomFormData {
  return ((aofasHindfootJsonForm as unknown as FormTemplateJson).formData as CustomFormData) || {};
}

/**
 * AOFAS Hindfoot Form Template Plugin
 * American Orthopedic Foot & Ankle Society Ankle-Hindfoot Score
 */
export const aofasHindfootPlugin: FormTemplatePlugin = {
  templateId: "67b4e612d0feb4ad99ae2e85",
  name: "AOFAS Ankle-Hindfoot Score",
  description: "American Orthopedic Foot & Ankle Society clinical rating system for ankle and hindfoot",
  formTemplate: aofasHindfootJsonForm as unknown as FormTemplateJson,
  calculateScore: calculateAofasHindfootScore,
  generateMockData,
};
