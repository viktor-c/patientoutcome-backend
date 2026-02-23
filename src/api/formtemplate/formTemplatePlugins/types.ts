/**
 * Form Template Plugin Types
 * 
 * These types define the interface that all form template plugins must implement.
 * A plugin represents a specific form template (e.g., MOXFQ, AOFAS, EFAS) and provides
 * all the necessary functions and data for that form.
 */

import type { 
  PatientFormData, 
  FormQuestions,
  SubscaleScore as ModelSubscaleScore,
  CustomFormData 
} from "@/api/formtemplate/formTemplateModel";

/**
 * Represents a subscale score within a form
 * Re-export from model for backward compatibility
 */
export type SubscaleScore = ModelSubscaleScore;

/**
 * Complete scoring data structure for a form
 * This is the structure used by plugins and stored in patientFormData
 */
export interface ScoringData {
  rawFormData: FormQuestions;
  subscales?: {
    [key: string]: SubscaleScore | null;
  };
  totalScore?: SubscaleScore | null;
}

/**
 * Form template JSON structure for plugins
 * This is the structure plugins export - includes sample data for testing
 * Note: This differs from the database FormTemplate model which only stores metadata
 */
export interface FormTemplateJson {
  _id?: string | { toString(): string };
  title: string;
  description: string;
  formData?: CustomFormData | Record<string, unknown>; // Sample data for plugin rendering
}

/**
 * Form Template Plugin Interface
 * 
 * Every form template plugin must implement this interface to be compatible
 * with the patient outcome management system.
 * 
 * Note: Plugins export FormTemplateJson (with sample formData), but the database
 * FormTemplate model only stores metadata (_id, title, description).
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
   * This includes metadata and sample formData for plugin rendering
   */
  formTemplate: FormTemplateJson;

  /**
   * Calculate the score for this form based on submitted data
   * 
   * @param formData - The raw form data submitted by the user (legacy CustomFormData format)
   * @returns ScoringData structure with calculated scores
   */
  calculateScore: (formData: CustomFormData) => ScoringData;

  /**
   * Generate mock/sample form data for testing purposes
   * 
   * @returns Sample form data in legacy CustomFormData format
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
