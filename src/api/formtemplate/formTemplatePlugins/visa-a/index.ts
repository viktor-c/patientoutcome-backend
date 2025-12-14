import type { CustomFormData, FormTemplate as FormTemplateModelType } from "@/api/formtemplate/formTemplateModel";
import type { FormTemplatePlugin, ScoringData, SubscaleScore } from "../types";
import * as visaaJsonForm from "./VISA_A_JsonForm_Export.json";

/**
 * Calculate VISA-A score from form data
 * Standard VISA-A scoring:
 * - Questions 1-7: 0-10 points each = 70 points total
 * - Question 8: 0-30 points = 30 points
 * - Total maximum score: 100 points
 * 
 * @param {Object} data - Form data with question responses (may be nested in 'visaa' section or flat)
 * @returns {Object} ScoringData structure with subscale scores and total
 */
function calculateVisaaScore(data: CustomFormData): ScoringData {
  // Handle nested structure (e.g., { visaa: { q1: 0, q2: 1, ... } })
  // Extract questions from 'visaa' section if present, otherwise use data directly
  const questions = data.visaa || data;

  // VISA-A subscales based on symptom/function categories
  // Symptoms (pain/stiffness): Q1-Q3
  // Daily function: Q4
  // Sport-related function: Q5-Q6
  // Activity level: Q7-Q8
  
  const subscales = {
    symptoms: ["q1", "q2", "q3"],
    dailyFunction: ["q4"],
    sportFunction: ["q5", "q6"],
    activity: ["q7", "q8"],
  };

  // Calculate subscale scores
  const calculateSubscaleScore = (
    questionKeys: string[],
    subscaleName: string,
    subscaleDescription: string,
    maxScore: number,
  ): SubscaleScore | null => {
    const validAnswers = questionKeys
      .map((key) => {
        const value = questions[key];
        return value !== null && value !== undefined ? value : null;
      })
      .filter((value) => value !== null);

    if (validAnswers.length === 0) return null;

    const rawScore = validAnswers.reduce((sum, value) => sum + (value as number), 0);
    const completionRate = validAnswers.length / questionKeys.length;

    // Normalize score to 0-100 scale
    const normalizedScore = (rawScore / maxScore) * 100;

    return {
      name: subscaleName,
      description: subscaleDescription,
      rawScore,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      maxPossibleScore: maxScore,
      answeredQuestions: validAnswers.length,
      totalQuestions: questionKeys.length,
      completionPercentage: Math.round(completionRate * 100),
      isComplete: completionRate === 1,
    };
  };

  // Symptoms subscale: q1 + q2 + q3 (max 30)
  const symptomsScore = calculateSubscaleScore(
    subscales.symptoms,
    "Symptoms",
    "Achilles tendon pain and stiffness",
    30,
  );

  // Daily function subscale: q4 (max 10)
  const dailyFunctionScore = calculateSubscaleScore(
    subscales.dailyFunction,
    "Daily Function",
    "Walking downstairs with normal gait",
    10,
  );

  // Sport function subscale: q5 + q6 (max 40, since q5 goes to 30)
  const sportFunctionScore = calculateSubscaleScore(
    subscales.sportFunction,
    "Sport Function",
    "Sport-specific functional tests",
    40,
  );

  // Activity subscale: q7 + q8 (max 40, q7 is 0-10, q8 is 0-30)
  const activityScore = calculateSubscaleScore(
    subscales.activity,
    "Activity",
    "Physical activity and sport participation",
    40,
  );

  // Calculate total score (max 100)
  // Get all valid answers across all questions
  const allQuestionKeys = [...subscales.symptoms, ...subscales.dailyFunction, ...subscales.sportFunction, ...subscales.activity];
  const allValidAnswers = allQuestionKeys
    .map((key) => {
      const value = questions[key];
      return value !== null && value !== undefined ? value : null;
    })
    .filter((value) => value !== null) as number[];

  const totalScore: SubscaleScore | null = allValidAnswers.length > 0 ? {
    name: "Total VISA-A Score",
    description: "Overall Achilles tendon pain and function assessment (0-100, higher is better)",
    rawScore: allValidAnswers.reduce((sum, value) => sum + value, 0),
    normalizedScore: allValidAnswers.length === allQuestionKeys.length
      ? allValidAnswers.reduce((sum, value) => sum + value, 0) // Raw score IS the normalized score for VISA-A
      : null,
    maxPossibleScore: 100,
    answeredQuestions: allValidAnswers.length,
    totalQuestions: allQuestionKeys.length,
    completionPercentage: Math.round((allValidAnswers.length / allQuestionKeys.length) * 100),
    isComplete: allValidAnswers.length === allQuestionKeys.length,
  } : null;

  return {
    rawData: data,
    subscales: {
      symptoms: symptomsScore,
      dailyFunction: dailyFunctionScore,
      sportFunction: sportFunctionScore,
      activity: activityScore,
    },
    total: totalScore,
  };
}

/**
 * Generate mock data for testing
 */
function generateMockVisaaData(): CustomFormData {
  return {
    visaa: {
      q1: 7,  // Stiffness in morning (0-10)
      q2: 6,  // Pain when walking warmed up (0-10)
      q3: 5,  // Pain after 30min walk (0-10)
      q4: 7,  // Pain descending stairs (0-10)
      q5: 15, // Heel raises (0-30)
      q6: 8,  // Single leg hops (0-10)
      q7: 6,  // Currently doing sport (0-10)
      q8: 20, // Training duration (0-30)
    },
  };
}

// VISA-A Form Template Plugin
export const visaaPlugin: FormTemplatePlugin = {
  templateId: visaaJsonForm._id,
  name: "VISA-A Questionnaire",
  description: "Victorian Institute of Sports Assessment - Achilles (VISA-A): Assessment of Achilles tendon pain and functional limitations",
  formTemplate: visaaJsonForm as unknown as FormTemplateModelType,
  calculateScore: calculateVisaaScore,
  generateMockData: generateMockVisaaData,
};
