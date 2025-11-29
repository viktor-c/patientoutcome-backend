// Shared scoring types between frontend and backend
// This file should be the single source of truth for scoring-related types

/**
 * Represents a single question answer
 */
export interface QuestionAnswer {
  [key: string]: string | number | null;
}

/**
 * Represents form data with questions grouped by sections
 */
export interface FormQuestions {
  [sectionKey: string]: QuestionAnswer;
}

/**
 * Represents a subscale score (e.g., Walking & Standing, Pain, Social Interaction)
 */
export interface SubscaleScore {
  name: string;
  description?: string | null;
  rawScore: number;
  normalizedScore: number;
  maxPossibleScore: number;
  answeredQuestions: number;
  totalQuestions: number;
  completionPercentage: number;
  isComplete: boolean;
}

/**
 * Main scoring data structure used for all forms
 * This structure allows forms to have multiple subscales and a total score
 */
export interface ScoringData {
  rawData: FormQuestions | null;
  subscales: {
    [key: string]: SubscaleScore | null;
  };
  total: SubscaleScore | null;
}
