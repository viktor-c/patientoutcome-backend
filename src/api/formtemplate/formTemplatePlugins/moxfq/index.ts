import type { CustomFormData } from "@/api/formtemplate/formTemplateModel";
import type { FormTemplatePlugin, FormTemplateJson, ScoringData, SubscaleScore } from "../types";
import * as moxfqJsonForm from "./MOXFQ_JsonForm_Export.json";

/**
 * Calculate MOXFQ score from form data
 * @param {Object} data - Form data with question responses (may be nested in 'moxfq' section or flat)
 * @returns {Object} ScoringData structure
 */
function calculateMoxfqScore(data: CustomFormData): ScoringData {
  // Handle nested structure (e.g., { moxfq: { q1: 0, q2: 1, ... } })
  // Extract questions from 'moxfq' section if present, otherwise use data directly
  const questions = data.moxfq || data;

  // Define subscales according to MOXFQ standard
  const subscales = {
    walkingStanding: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"],
    pain: ["q9", "q11", "q12", "q15"],
    socialInteraction: ["q10", "q13", "q14", "q16"],
  };

  // Calculate subscale scores
  const calculateSubscaleScore = (
    questionKeys: string[],
    subscaleName: string,
    subscaleDescription: string,
  ): SubscaleScore | null => {
    const validAnswers = questionKeys
      .map((key) => {
        const value = questions[key];
        return typeof value === 'number' ? value : (typeof value === 'string' ? Number.parseFloat(value) : null);
      })
      .filter((value): value is number => value !== null && !Number.isNaN(value));

    if (validAnswers.length === 0) return null;

    const rawScore: number = validAnswers.reduce((sum, value) => sum + value, 0);
    const maxScore = questionKeys.length * 4;
    const completionRate = validAnswers.length / questionKeys.length;

    // Convert to 0-100 scale: (rawScore / maxScore) * 100
    const normalizedScore = (rawScore / maxScore) * 100;

    return {
      name: subscaleName,
      description: subscaleDescription,
      rawScore,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      maxScore,
      answeredQuestions: validAnswers.length,
      totalQuestions: questionKeys.length,
      completionPercentage: Math.round(completionRate * 100),
      isComplete: completionRate === 1,
    };
  };

  // Calculate individual subscale scores
  const walkingStandingScore = calculateSubscaleScore(
    subscales.walkingStanding,
    "Walking & Standing",
    "Assesses difficulties in walking and standing.",
  );
  const painScore = calculateSubscaleScore(subscales.pain, "Pain", "Evaluates pain levels and impact.");
  const socialInteractionScore = calculateSubscaleScore(
    subscales.socialInteraction,
    "Social Interaction",
    "Measures social engagement and interaction.",
  );

  // Calculate total score
  const allQuestions = [...subscales.walkingStanding, ...subscales.pain, ...subscales.socialInteraction];
  const totalScore = calculateSubscaleScore(allQuestions, "Total", "Measures overall health status.");

  return {
    rawFormData: data,
    subscales: {
      walkingStanding: walkingStandingScore,
      pain: painScore,
      socialInteraction: socialInteractionScore,
    },
    totalScore: totalScore,
  };
}

/**
 * Generate mock MOXFQ form data for testing
 */
function generateMockData(): CustomFormData {
  return ((moxfqJsonForm as unknown as FormTemplateJson).formData as CustomFormData) || {};
}

/**
 * MOXFQ Form Template Plugin
 * Manchester-Oxford Foot Questionnaire
 */
export const moxfqPlugin: FormTemplatePlugin = {
  templateId: "67b4e612d0feb4ad99ae2e85",
  name: "Manchester-Oxford Foot Questionnaire",
  description: "A standardized questionnaire to assess foot and ankle pain and its impact on daily activities",
  formTemplate: moxfqJsonForm as unknown as FormTemplateJson,
  calculateScore: calculateMoxfqScore,
  generateMockData,
};
