/**
 * Form Template Plugins Registry
 *
 * This file exports all available form template plugins and provides
 * a registry for accessing them by template ID.
 */

import { aofasPlugin } from "./aofas";
import { efasPlugin } from "./efas";
import { moxfqPlugin } from "./moxfq";
import type { FormTemplatePlugin } from "./types";
import { vasPlugin } from "./vas";

/**
 * Export individual plugins
 */
export { moxfqPlugin, aofasPlugin, efasPlugin, vasPlugin };

/**
 * Export types
 */
export type { FormTemplatePlugin, ScoringData, SubscaleScore, FormTemplateJson } from "./types";

/**
 * Array of all registered form template plugins
 */
export const allFormPlugins: FormTemplatePlugin[] = [moxfqPlugin, aofasPlugin, efasPlugin, vasPlugin];

/**
 * Plugin registry map for quick lookup by template ID
 */
export const pluginRegistry: Map<string, FormTemplatePlugin> = new Map(
  allFormPlugins.map((plugin) => [plugin.templateId, plugin]),
);

/**
 * Get a form template plugin by its template ID
 * @param templateId - The unique template ID
 * @returns The matching plugin or undefined if not found
 */
export function getPluginByTemplateId(templateId: string): FormTemplatePlugin | undefined {
  return pluginRegistry.get(templateId);
}

/**
 * Get all registered form template plugins
 * @returns Array of all plugins
 */
export function getAllPlugins(): FormTemplatePlugin[] {
  return allFormPlugins;
}

/**
 * Calculate score for a form using the appropriate plugin
 * @param templateId - The template ID to identify which plugin to use
 * @param formData - The form data to calculate score for
 * @returns ScoringData or null if plugin not found
 */
export function calculateFormScore(templateId: string, formData: any): any {
  const plugin = getPluginByTemplateId(templateId);
  if (!plugin) {
    throw new Error(`No plugin found for template ID: ${templateId}`);
  }
  return plugin.calculateScore(formData);
}
