/**
 * Form Template Plugins Registry - DEPRECATED
 *
 * Backend plugins have been removed to eliminate code duplication.
 * Form templates, scoring logic, and validation now live exclusively in the frontend.
 * 
 * Backend only stores:
 * - Form template metadata (in database)
 * - Patient form submissions (raw data + scores calculated by frontend)
 * 
 * This file is kept for backward compatibility with existing imports.
 */

/**
 * Export types for backward compatibility
 */
export type { FormTemplatePlugin, ScoringData, SubscaleScore, FormTemplateJson } from "./types";

/**
 * @deprecated Backend plugins have been removed. Forms are managed entirely by frontend plugins.
 */
export const allFormPlugins: never[] = [];

/**
 * @deprecated Backend plugins have been removed. Forms are managed entirely by frontend plugins.
 */
export const pluginRegistry: Map<string, never> = new Map() as Map<string, never>;

/**
 * @deprecated Backend plugins have been removed. Use frontend plugins for form operations.
 * @throws {Error} Always throws - backend plugins no longer exist
 */
export function getPluginByTemplateId(templateId: string): never {
  throw new Error(
    `Backend plugins have been removed. Template ID: ${templateId}. ` +
    "Form structure and scoring logic now live exclusively in frontend plugins."
  );
}

/**
 * @deprecated Backend plugins have been removed. Use frontend plugins for form operations.
 * @throws {Error} Always throws - backend plugins no longer exist
 */
export function getAllPlugins(): never[] {
  throw new Error(
    "Backend plugins have been removed. " +
    "Form structure and scoring logic now live exclusively in frontend plugins."
  );
}

/**
 * @deprecated Backend plugins have been removed. Use frontend plugins for form operations.
 * @throws {Error} Always throws - backend scoring no longer exists
 */
export function calculateFormScore(templateId: string, formData: any): never {
  throw new Error(
    `Backend scoring has been removed. Template ID: ${templateId}. ` +
    "All scoring is calculated by frontend plugins before submission."
  );
}

