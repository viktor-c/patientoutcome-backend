/**
 * Type definitions for form scoring calculation utilities
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

export interface ScoringData {
  rawData: any;
  subscales: {
    [key: string]: SubscaleScore | null;
  };
  total: SubscaleScore | null;
}

export function calculateMoxfqScore(data: any): ScoringData;
export function calculateAofasScore(data: any): ScoringData;
export function calculateEfasScore(data: any): ScoringData;
