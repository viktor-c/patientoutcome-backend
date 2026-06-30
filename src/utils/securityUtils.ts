/**
 * Security utilities for input sanitization and validation
 */

/**
 * Escapes special regex characters to prevent ReDoS and regex injection
 * @param str - The string to escape
 * @returns Escaped string safe for use in RegExp
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validates and sanitizes search query input
 * @param query - The search query to validate
 * @param maxLength - Maximum allowed length (default 100)
 * @returns Sanitized query or null if invalid
 */
export function sanitizeSearchQuery(query: string, maxLength = 100): string | null {
  if (!query || typeof query !== "string") {
    return null;
  }

  // Trim whitespace
  const trimmed = query.trim();

  // Check length
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return null;
  }

  // Escape special regex characters
  return escapeRegex(trimmed);
}

/**
 * Validates session strength (minimum entropy requirements)
 * @param secret - The session secret to validate
 * @returns Object with validation result and message
 */
export function validateSessionSecret(secret: string): { valid: boolean; message?: string } {
  if (!secret || secret.length < 32) {
    return { valid: false, message: "Session secret must be at least 32 characters" };
  }

  // Check for sufficient entropy (mix of character types)
  const hasLower = /[a-z]/.test(secret);
  const hasUpper = /[A-Z]/.test(secret);
  const hasNumber = /[0-9]/.test(secret);
  const hasSpecial = /[^a-zA-Z0-9]/.test(secret);

  const entropy = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  if (entropy < 3) {
    return {
      valid: false,
      message: "Session secret should contain at least 3 of: lowercase, uppercase, numbers, special characters",
    };
  }

  return { valid: true };
}

/**
 * Sanitizes HTML content to prevent XSS
 * @param str - The string to sanitize
 * @returns Sanitized string with HTML tags escaped
 */
export function sanitizeHtml(str: string): string {
  if (!str) return "";

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Removes script tags and event handlers from strings
 * @param str - The string to clean
 * @returns Cleaned string without scripts
 */
export function removeScripts(str: string): string {
  if (!str) return "";

  // Remove script tags
  let cleaned = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers (onclick, onerror, etc.)
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  cleaned = cleaned.replace(/on\w+\s*=\s*[^\s>]*/gi, "");

  return cleaned;
}
