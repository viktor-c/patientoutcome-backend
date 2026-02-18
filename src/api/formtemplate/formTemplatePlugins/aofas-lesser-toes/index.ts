import type { CustomFormData } from "@/api/formtemplate/formTemplateModel";
import type { FormTemplatePlugin, FormTemplateJson, ScoringData, SubscaleScore } from "../types";
import * as aofasLesserToesJsonForm from "./AOFAS_LesserToes_JsonForm_Export.json";

/**
 * Calculate AOFAS Lesser Toes score from form data
 * @param {Object} data - Form data with question responses (nested by section)
 * @returns {Object} ScoringData structure
 */
function calculateAofasLesserToesScore(data: CustomFormData): ScoringData {
  // AOFAS Lesser Toes has a single section with 8 questions
  const sectionKey = Object.keys(data)[0]; // e.g., 'lesserToes'
  const questions = data[sectionKey] || {};
  const TOTAL_QUESTIONS = 8; // Fixed number of questions in AOFAS Lesser Toes

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
        "aofas-lesser-toes": {
          name: "AOFAS Lesser Toes",
          description: "American Orthopedic Foot & Ankle Society Lesser Toes (MTP-IP) Score",
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
        name: "AOFAS Lesser Toes Total",
        description: "American Orthopedic Foot & Ankle Society Lesser Toes (MTP-IP) Score",
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

  // AOFAS Lesser Toes max score is 100 (based on clinical standard)
  const maxScore = 100;
  const completionRate = validAnswers.length / TOTAL_QUESTIONS;
  const normalizedScore = (rawScore / maxScore) * 100;

  const totalScore: SubscaleScore = {
    name: "AOFAS Lesser Toes Total",
    description: "American Orthopedic Foot & Ankle Society Lesser Toes (MTP-IP) Score",
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
    subscales: { "aofas-lesser-toes": totalScore },
    totalScore: totalScore,
  };
}

/**
 * Generate mock AOFAS Lesser Toes form data for testing
 */
function generateMockData(): CustomFormData {
  return ((aofasLesserToesJsonForm as unknown as FormTemplateJson).formData as CustomFormData) || {};
}

/**
 * AOFAS Lesser Toes Form Template Plugin
 * American Orthopedic Foot & Ankle Society Lesser Toes (MTP-IP) Score
 */
export const aofasLesserToesPlugin: FormTemplatePlugin = {
  templateId: "67b4e612d0feb4ad99ae2e87",
  name: "AOFAS Lesser Toes (MTP-IP) Score",
  description: "American Orthopedic Foot & Ankle Society clinical rating system for lesser toes (rays 2-5)",
  formTemplate: aofasLesserToesJsonForm as unknown as FormTemplateJson,
  calculateScore: calculateAofasLesserToesScore,
  generateMockData,
};
