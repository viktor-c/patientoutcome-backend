/**
 * Form Template Plugin Types
 * 
 * These types define the interface that all form template plugins must implement.
 * A plugin represents a specific form template (e.g., MOXFQ, AOFAS, EFAS) and provides
 * all the necessary functions and data for that form.
 */

/**
 * Represents a subscale score within a form
 */
export interface SubscaleScore {
  name: string;
  description?: string | null;
  rawScore: number | null;
  normalizedScore: number | null;
  maxPossibleScore: number;
  answeredQuestions: number;
  totalQuestions: number;
  completionPercentage: number;
  isComplete: boolean;
}

/**
 * Complete scoring data structure for a form
 */
import type { CustomFormData } from "@/api/formtemplate/formTemplateModel";

export interface ScoringData {
  rawData: CustomFormData | Record<string, unknown>;
  subscales: {
    [key: string]: SubscaleScore | null;
  };
  total: SubscaleScore | null;
}

/**
 * Form template JSON structure
 * This should match the structure exported from your form builder
 */
export interface FormTemplateJson {
  _id?: string | { toString(): string };
  title: string;
  description: string;
  formData?: CustomFormData | Record<string, unknown>;
}

/**
 * Form Template Plugin Interface
 * 
 * Every form template plugin must implement this interface to be compatible
 * with the patient outcome management system.
 */
export interface FormTemplatePlugin {
  /**
   * Unique identifier for the form template (must match MongoDB _id)
   */
  templateId: string;

  /**
   * Human-readable name of the form template
   */
  name: string;

  /**
   * Short description of what this form measures
   */
  description: string;

  /**
   * The complete JSON form template definition
   * This includes schema, UI schema, and all configuration
   */
  formTemplate: FormTemplateJson;

  /**
   * Calculate the score for this form based on submitted data
   * 
   * @param formData - The raw form data submitted by the user
   * @returns ScoringData structure with calculated scores
   */
  calculateScore: (formData: CustomFormData) => ScoringData;

  /**
   * Generate mock/sample form data for testing purposes
   * 
   * @returns Sample form data that can be used for testing
   */
  generateMockData?: () => CustomFormData;

  /**
   * Validate form data before scoring
   * Optional - if not provided, basic validation is assumed
   * 
   * @param formData - The form data to validate
   * @returns true if valid, false otherwise
   */
  validateFormData?: (formData: CustomFormData) => boolean;
}
