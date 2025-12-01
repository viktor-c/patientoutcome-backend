import fs from "node:fs";
import path from "node:path";
import { logger } from "@/common/utils/logger";

export type SupportedLocale = "en" | "de";

interface EmailTemplate {
  html: string;
  text: string;
}

interface TemplateVariables {
  [key: string]: string | number;
}

class EmailTemplateService {
  private templateCache: Map<string, EmailTemplate> = new Map();
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, "..", "..", "templates", "email");
  }

  /**
   * Load a template for a specific locale
   * Falls back to German if the requested locale is not available
   */
  private loadTemplate(templateName: string, locale: SupportedLocale): EmailTemplate {
    const cacheKey = `${templateName}.${locale}`;

    // Check cache first
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    // Try to load the template for the requested locale
    let htmlPath = path.join(this.templatesDir, `${templateName}.${locale}.html`);
    let textPath = path.join(this.templatesDir, `${templateName}.${locale}.txt`);

    // Fall back to German if the locale template doesn't exist
    if (!fs.existsSync(htmlPath)) {
      logger.warn(
        { templateName, locale, fallback: "de" },
        "emailTemplateService: Template not found for locale, falling back to German",
      );
      htmlPath = path.join(this.templatesDir, `${templateName}.de.html`);
      textPath = path.join(this.templatesDir, `${templateName}.de.txt`);
    }

    try {
      const html = fs.readFileSync(htmlPath, "utf-8");
      const text = fs.readFileSync(textPath, "utf-8");

      const template = { html, text };
      this.templateCache.set(cacheKey, template);

      logger.debug({ templateName, locale }, "emailTemplateService: Template loaded successfully");

      return template;
    } catch (error) {
      logger.error({ error, templateName, locale }, "emailTemplateService: Failed to load template");
      throw new Error(`Failed to load email template: ${templateName}`);
    }
  }

  /**
   * Replace template variables with actual values
   * Variables in templates are in the format {{variableName}}
   */
  private replaceVariables(template: string, variables: TemplateVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Get the email subject for a template and locale
   */
  getSubject(templateName: string, locale: SupportedLocale): string {
    const subjects: Record<string, Record<SupportedLocale, string>> = {
      "feedback-confirmation": {
        en: "Thank you for your feedback - Patient Outcome",
        de: "Vielen Dank für Ihr Feedback - Patient Outcome",
      },
    };

    return subjects[templateName]?.[locale] || subjects[templateName]?.en || "Patient Outcome";
  }

  /**
   * Render an email template with the given variables
   */
  render(
    templateName: string,
    locale: SupportedLocale,
    variables: TemplateVariables,
  ): { html: string; text: string; subject: string } {
    const template = this.loadTemplate(templateName, locale);

    return {
      html: this.replaceVariables(template.html, variables),
      text: this.replaceVariables(template.text, variables),
      subject: this.getSubject(templateName, locale),
    };
  }

  /**
   * Clear the template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear();
    logger.debug("emailTemplateService: Template cache cleared");
  }

  /**
   * Normalize a locale string to a supported locale
   * Accepts formats like 'en', 'en-US', 'de', 'de-DE', etc.
   */
  normalizeLocale(locale: string | undefined): SupportedLocale {
    if (!locale) {
      return "de";
    }

    // Extract the primary language code (e.g., 'en' from 'en-US')
    const primaryLang = locale.toLowerCase().split("-")[0].split("_")[0];

    // Map to supported locales
    if (primaryLang === "en") {
      return "en";
    }

    // Default to German for all other locales
    return "de";
  }
}

export const emailTemplateService = new EmailTemplateService();
