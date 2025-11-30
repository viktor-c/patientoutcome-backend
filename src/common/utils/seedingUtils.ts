import { userModel } from "@/api/user/userModel";
import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";

/**
 * Checks if the system is in setup mode (no admin user exists yet).
 * This is used to allow seeding during initial setup even in production.
 */
async function isSetupMode(): Promise<boolean> {
  try {
    const adminUser = await userModel.findOne({ roles: "admin" }).lean();
    return !adminUser;
  } catch (error) {
    logger.error({ error }, "Error checking setup mode");
    return false;
  }
}

/**
 * Checks if seeding/mock data operations are allowed.
 *
 * Seeding is allowed when:
 * - NODE_ENV is "development" or "test"
 * - ALLOW_SEED environment variable is set to "true"
 * - System is in setup mode (no admin user exists) - even in production
 *
 * @returns Promise<{allowed: boolean, reason?: string}>
 */
export async function isSeedingAllowed(): Promise<{ allowed: boolean; reason?: string }> {
  // Always allow in development or test environments
  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
    return { allowed: true };
  }

  // Allow if ALLOW_SEED is explicitly set
  if (process.env.ALLOW_SEED === "true") {
    logger.warn("Seeding allowed via ALLOW_SEED environment variable in production");
    return { allowed: true };
  }

  // Check if in setup mode (no admin user exists)
  const setupMode = await isSetupMode();
  if (setupMode) {
    logger.warn("Seeding allowed during initial setup mode in production - this will insert fictive data");
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Mock data is not allowed in production environment",
  };
}

/**
 * Throws an error if seeding is not allowed.
 * Use this at the beginning of mock data creation methods.
 *
 * @throws Error if seeding is not allowed in current environment
 */
export async function assertSeedingAllowed(): Promise<void> {
  const { allowed, reason } = await isSeedingAllowed();

  if (!allowed) {
    const error = new Error(reason || "Mock data is not allowed in production environment");
    logger.error({ error }, "Attempted to create mock data when not allowed");
    throw error;
  }
}

/**
 * Synchronous check for accessing mock data getters.
 * This only checks NODE_ENV and ALLOW_SEED, not setup mode.
 * For async operations, use isSeedingAllowed() or assertSeedingAllowed().
 */
export function isMockDataAccessAllowed(): boolean {
  return env.NODE_ENV === "development" || env.NODE_ENV === "test" || process.env.ALLOW_SEED === "true";
}
