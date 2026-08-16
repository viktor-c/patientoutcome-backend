import { logger } from "@/common/utils/logger";

/** Default case access code validity: 10 years from now */
export const DEFAULT_CASE_CODE_VALIDITY = "10y";

/**
 * Parse a validity string to a Date object.
 * Supports:
 * - Relative format: "10y", "5y", etc. (years from now)
 * - Fixed date format: "2030-12-31" (YYYY-MM-DD)
 * 
 * Returns a date 10 years from now if:
 * - The input is invalid
 * - A fixed date is in the past
 * 
 * @param validityString - The validity configuration string
 * @param fromDate - The base date for relative calculations (defaults to now)
 * @returns Date object representing the expiration date
 */
export function parseCaseCodeValidity(validityString: string | undefined, fromDate: Date = new Date()): Date {
  if (!validityString) {
    return addYears(fromDate, 10);
  }

  // Try to parse as relative format (e.g., "10y")
  const relativeMatch = validityString.match(/^(\d+)y$/);
  if (relativeMatch) {
    const years = Number.parseInt(relativeMatch[1], 10);
    if (!Number.isNaN(years) && years > 0) {
      return addYears(fromDate, years);
    }
  }

  // Try to parse as fixed date (YYYY-MM-DD)
  const fixedDateMatch = validityString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (fixedDateMatch) {
    const [, year, month, day] = fixedDateMatch;
    const fixedDate = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
    
    // Validate the date
    if (!Number.isNaN(fixedDate.getTime())) {
      // If the fixed date is in the past, return 10 years from now
      if (fixedDate < fromDate) {
        logger.warn(
          { validityString, fixedDate: fixedDate.toISOString(), fromDate: fromDate.toISOString() },
          "Fixed case code validity date is in the past, using default 10 years"
        );
        return addYears(fromDate, 10);
      }
      return fixedDate;
    }
  }

  // Invalid format - return default 10 years
  logger.warn({ validityString }, "Invalid case code validity format, using default 10 years");
  return addYears(fromDate, 10);
}

/**
 * Add years to a date
 */
function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Get the configured case code validity for a department.
 * Falls back to environment variable or default (10 years) if not configured.
 */
export async function getDepartmentCaseCodeValidity(
  departmentId: string | undefined,
  fromDate: Date = new Date()
): Promise<Date> {
  let validityString: string | undefined;

  // Try to get department-specific configuration
  if (departmentId) {
    try {
      const { userDepartmentService } = await import("@/api/userDepartment/userDepartmentService.js");
      const result = await userDepartmentService.findById(departmentId);
      if (result.success && result.responseObject?.patientCaseAccessCodeValidUntil) {
        validityString = result.responseObject.patientCaseAccessCodeValidUntil;
      }
    } catch (error) {
      logger.error({ error, departmentId }, "Error fetching department case code validity");
    }
  }

  // Fall back to environment variable
  if (!validityString) {
    validityString = process.env.DEFAULT_CASE_ACCESS_CODE_VALID_UNTIL || DEFAULT_CASE_CODE_VALIDITY;
  }

  return parseCaseCodeValidity(validityString, fromDate);
}

/**
 * Check if a date is within the specified months from now
 */
export function isExpiringWithinMonths(expiryDate: Date | string, months: number): boolean {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() + months);
  
  return expiry <= threshold && expiry > now;
}
