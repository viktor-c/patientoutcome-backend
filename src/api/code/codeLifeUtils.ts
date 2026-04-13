/** Default code expiry: 4 hours in milliseconds. */
export const DEFAULT_CODE_LIFE_MS = 4 * 60 * 60 * 1000;

/**
 * Parse a human-readable code life string (e.g. "4h", "2d", "3w") to milliseconds.
 * Returns DEFAULT_CODE_LIFE_MS when the string is invalid.
 */
export function parseCodeLifeToMs(codeLife: string): number {
  const match = codeLife.match(/^(\d+)([hdw])$/);
  if (!match) return DEFAULT_CODE_LIFE_MS;
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "h") return amount * 60 * 60 * 1000;
  if (unit === "d") return amount * 24 * 60 * 60 * 1000;
  if (unit === "w") return amount * 7 * 24 * 60 * 60 * 1000;
  return DEFAULT_CODE_LIFE_MS;
}

/**
 * Look up the configured code life for a department and convert it to milliseconds.
 * Falls back to DEFAULT_CODE_LIFE_MS when the department has no setting or is not found.
 */
export async function getDepartmentCodeLifeMs(departmentId: string | undefined): Promise<number> {
  if (!departmentId) return DEFAULT_CODE_LIFE_MS;
  try {
    const { userDepartmentService } = await import("@/api/userDepartment/userDepartmentService.js");
    const result = await userDepartmentService.findById(departmentId);
    if (result.success && result.responseObject?.externalAccessCodeLife) {
      return parseCodeLifeToMs(result.responseObject.externalAccessCodeLife);
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_CODE_LIFE_MS;
}