import type { CustomFormData, FormTemplate as FormTemplateModelType } from "@/api/formtemplate/formTemplateModel";
import type { FormTemplatePlugin, ScoringData, SubscaleScore } from "../types";
import * as visaaJsonForm from "./VISA_A_JsonForm_Export.json";

/**
 * Calculate VISA-A score from form data
 * Standard VISA-A scoring:
 * - Questions 1-7: 0-10 points each = 70 points total
 * - Question 8: 0-30 points = 30 points (conditional: q8a, q8b, or q8c based on q8_type)
 *   - q8a (no pain): 0, 7, 14, 21, 30 points (for nil, 1-10, 11-20, 21-30, >30 mins)
 *   - q8b (pain no stop): 0, 4, 10, 14, 20 points
 *   - q8c (pain stops): 0, 2, 5, 7, 10 points
 * - Total maximum score: 100 points
 * 
 * @param {Object} data - Form data with question responses (may be nested in 'visaa' section or flat)
 * @returns {Object} ScoringData structure with subscale scores and total
 */
function calculateVisaaScore(data: CustomFormData): ScoringData {
  // Handle nested structure (e.g., { visaa: { q1: 0, q2: 1, ... } })
  // Extract questions from 'visaa' section if present, otherwise use data directly
  const questions = (data.visaa || data) as Record<string, unknown>;

  // Determine which q8 variant to use based on q8_type
  // The actual score for q8 depends on which variant (a/b/c) is answered
  // Each variant has different scoring based on training duration
  let q8Score: number | null = null;
  const q8Type = questions.q8_type as string | undefined;
  
  // Map slider values (time in minutes) to actual point values
  const mapQ8aScore = (sliderValue: number): number => {
    // q8a scoring: nil=0p, 1-10min=7p, 11-20min=14p, 21-30min=21p, >30min=30p
    if (sliderValue === 0) return 0;
    if (sliderValue >= 1 && sliderValue <= 10) return 7;
    if (sliderValue >= 11 && sliderValue <= 20) return 14;
    if (sliderValue >= 21 && sliderValue <= 30) return 21;
    if (sliderValue > 30) return 30;
    return 0;
  };
  
  const mapQ8bScore = (sliderValue: number): number => {
    // q8b scoring: nil=0p, 1-10min=4p, 11-20min=10p, 21-30min=14p, >30min=20p
    if (sliderValue === 0) return 0;
    if (sliderValue >= 1 && sliderValue <= 10) return 4;
    if (sliderValue >= 11 && sliderValue <= 20) return 10;
    if (sliderValue >= 21 && sliderValue <= 30) return 14;
    if (sliderValue > 30) return 20;
    return 0;
  };
  
  const mapQ8cScore = (sliderValue: number): number => {
    // q8c scoring: nil=0p, 1-10min=2p, 11-20min=5p, 21-30min=7p, >30min=10p
    if (sliderValue === 0) return 0;
    if (sliderValue >= 1 && sliderValue <= 10) return 2;
    if (sliderValue >= 11 && sliderValue <= 20) return 5;
    if (sliderValue >= 21 && sliderValue <= 30) return 7;
    if (sliderValue > 30) return 10;
    return 0;
  };
  
  if (q8Type === 'no_pain' && questions.q8a !== null && questions.q8a !== undefined) {
    q8Score = mapQ8aScore(questions.q8a as number);
  } else if (q8Type === 'pain_no_stop' && questions.q8b !== null && questions.q8b !== undefined) {
    q8Score = mapQ8bScore(questions.q8b as number);
  } else if (q8Type === 'pain_stop' && questions.q8c !== null && questions.q8c !== undefined) {
    q8Score = mapQ8cScore(questions.q8c as number);
  } else if (questions.q8 !== null && questions.q8 !== undefined) {
    // Backward compatibility: if old q8 field exists, use it directly
    q8Score = questions.q8 as number;
  }

  // VISA-A subscales based on symptom/function categories
  // Symptoms (pain/stiffness): Q1-Q3
  // Daily function: Q4
  // Sport-related function: Q5-Q6
  // Activity level: Q7-Q8
  
  const subscales = {
    symptoms: ["q1", "q2", "q3"],
    dailyFunction: ["q4"],
    sportFunction: ["q5", "q6"],
    activity: ["q7"], // q8 is handled separately due to conditional logic
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
        return value !== null && value !== undefined ? (value as number) : null;
      })
      .filter((value): value is number => value !== null);

    if (validAnswers.length === 0) return null;

    const rawScore = validAnswers.reduce((sum, value) => sum + value, 0);
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
  // q8 is handled conditionally based on q8_type
  const activityQuestions = subscales.activity
    .map((key) => {
      const value = questions[key];
      return value !== null && value !== undefined ? (value as number) : null;
    })
    .filter((value) => value !== null) as number[];
  
  // Add q8 score if available
  if (q8Score !== null) {
    activityQuestions.push(q8Score);
  }

  const activityScore: SubscaleScore | null = activityQuestions.length > 0 ? {
    name: "Activity",
    description: "Physical activity and sport participation",
    rawScore: activityQuestions.reduce((sum, value) => sum + value, 0),
    normalizedScore: Math.round((activityQuestions.reduce((sum, value) => sum + value, 0) / 40) * 100 * 100) / 100,
    maxPossibleScore: 40,
    answeredQuestions: activityQuestions.length,
    totalQuestions: 2, // q7 + q8 (conditional)
    completionPercentage: Math.round((activityQuestions.length / 2) * 100),
    isComplete: activityQuestions.length === 2,
  } : null;

  // Calculate total score (max 100)
  // Get all valid answers across all questions (including conditional q8)
  const allQuestionKeys = [...subscales.symptoms, ...subscales.dailyFunction, ...subscales.sportFunction, ...subscales.activity];
  const allValidAnswers = allQuestionKeys
    .map((key) => {
      const value = questions[key];
      return value !== null && value !== undefined ? value : null;
    })
    .filter((value) => value !== null) as number[];
  
  // Add q8 score if available
  if (q8Score !== null) {
    allValidAnswers.push(q8Score);
  }

  const totalQuestions = 8; // q1-q7 plus conditional q8
  const totalScore: SubscaleScore | null = allValidAnswers.length > 0 ? {
    name: "Total VISA-A Score",
    description: "Overall Achilles tendon pain and function assessment (0-100, higher is better)",
    rawScore: allValidAnswers.reduce((sum, value) => sum + value, 0),
    normalizedScore: allValidAnswers.length === totalQuestions
      ? allValidAnswers.reduce((sum, value) => sum + value, 0) // Raw score IS the normalized score for VISA-A
      : null,
    maxPossibleScore: 100,
    answeredQuestions: allValidAnswers.length,
    totalQuestions: totalQuestions,
    completionPercentage: Math.round((allValidAnswers.length / totalQuestions) * 100),
    isComplete: allValidAnswers.length === totalQuestions,
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
      q8_type: "pain_no_stop" as const, // Type of pain during sport
      q8a: null, // Not applicable for this mock
      q8b: 14, // Training duration with pain but no stop (0-20)
      q8c: null, // Not applicable for this mock
    },
  };
}

// VISA-A Form Template Plugin
export const visaaPlugin: FormTemplatePlugin = {
  templateId: visaaJsonForm._id as string,
  name: "VISA-A Questionnaire",
  description: "Victorian Institute of Sports Assessment - Achilles (VISA-A): Assessment of Achilles tendon pain and functional limitations",
  formTemplate: visaaJsonForm as unknown as FormTemplateModelType,
  calculateScore: calculateVisaaScore,
  generateMockData: generateMockVisaaData,
};
