import type { CustomFormData, FormTemplate as FormTemplateModelType } from "@/api/formtemplate/formTemplateModel";
import type { FormTemplatePlugin, ScoringData, SubscaleScore } from "../types";
import * as efasJsonForm from "./EFAS_JsonForm_Export.json";

/**
 * Calculate EFAS score from form data
 * @param {Object} data - Form data with question responses (nested by section)
 * @returns {Object} ScoringData structure
 */
function calculateEfasScore(data: CustomFormData): ScoringData {
  // EFAS has two sections: standardfragebogen and sportfragebogen
  const sections = ["standardfragebogen", "sportfragebogen"];

  const subscaleScores: { [key: string]: SubscaleScore | null } = {};
  let allQuestions: string[] = [];

  sections.forEach((sectionKey) => {
    const questions = data[sectionKey] || {};
    const questionKeys = Object.keys(questions);
    allQuestions = [...allQuestions, ...questionKeys];

    const validAnswers = questionKeys
      .map((key) => {
        const value = questions[key];
        return typeof value === 'number' ? value : (typeof value === 'string' ? Number.parseFloat(value) : null);
      })
      .filter((value): value is number => value !== null && !Number.isNaN(value)); if (questionKeys.length === 0) {
      // No questions in this section, set subscale to null
      subscaleScores[sectionKey] = null;
      return;
    }

    if (validAnswers.length > 0) {
      const rawScore: number = validAnswers.reduce((sum, value) => sum + value, 0);
      const maxPossibleScore = questionKeys.length * 5; // EFAS uses 0-5 scale
      const completionRate = validAnswers.length / questionKeys.length;
      const normalizedScore = (rawScore / maxPossibleScore) * 100;

      subscaleScores[sectionKey] = {
        name: sectionKey === "standardfragebogen" ? "Standard Questions" : "Sport Questions",
        description: sectionKey === "standardfragebogen" ? "Daily activity questions" : "Sports-specific questions",
        rawScore,
        normalizedScore: Math.round(normalizedScore * 100) / 100,
        maxPossibleScore,
        answeredQuestions: validAnswers.length,
        totalQuestions: questionKeys.length,
        completionPercentage: Math.round(completionRate * 100),
        isComplete: completionRate === 1,
      };
    } else {
      // No valid answers, but questions exist: fill with null or default structure
      subscaleScores[sectionKey] = {
        name: sectionKey === "standardfragebogen" ? "Standard Questions" : "Sport Questions",
        description: sectionKey === "standardfragebogen" ? "Daily activity questions" : "Sports-specific questions",
        rawScore: null,
        normalizedScore: null,
        maxPossibleScore: questionKeys.length * 4,
        answeredQuestions: 0,
        totalQuestions: questionKeys.length,
        completionPercentage: 0,
        isComplete: false,
      };
    }
  });

  // Calculate total across all sections
  const allValidAnswers: number[] = [];
  const allQuestionsList: string[] = [];

  sections.forEach((sectionKey) => {
    const questions = data[sectionKey] || {};
    const questionKeys = Object.keys(questions);
    allQuestionsList.push(...questionKeys);

    questionKeys.forEach((key) => {
      const value = questions[key];
      if (value !== null && value !== undefined) {
        allValidAnswers.push(value);
      }
    });
  });

  let totalScore: SubscaleScore | null = null;
  if (allValidAnswers.length > 0) {
    const rawScore = allValidAnswers.reduce((sum, value) => sum + value, 0);
    const maxPossibleScore = allQuestionsList.length * 5;
    const completionRate = allValidAnswers.length / allQuestionsList.length;
    const normalizedScore = (rawScore / maxPossibleScore) * 100;

    totalScore = {
      name: "EFAS Total",
      description: "European Foot and Ankle Society Score",
      rawScore,
      normalizedScore: Math.round(normalizedScore * 100) / 100,
      maxPossibleScore,
      answeredQuestions: allValidAnswers.length,
      totalQuestions: allQuestionsList.length,
      completionPercentage: Math.round(completionRate * 100),
      isComplete: completionRate === 1,
    };
  }

  return {
    rawData: data,
    subscales: subscaleScores,
    total: totalScore,
  };
}

/**
 * Generate mock EFAS form data for testing
 */
function generateMockData(): CustomFormData {
  return ((efasJsonForm as unknown as FormTemplateModelType).formData as CustomFormData) || {};
}

/**
 * EFAS Form Template Plugin
 * European Foot and Ankle Society Score
 */
export const efasPlugin: FormTemplatePlugin = {
  templateId: "67b4e612d0feb4ad99ae2e83",
  name: "EFAS Score",
  description: "European Foot and Ankle Society patient-reported outcome measure",
  formTemplate: efasJsonForm as unknown as FormTemplateModelType,
  calculateScore: calculateEfasScore,
  generateMockData,
};
