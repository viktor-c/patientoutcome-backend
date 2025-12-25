import { userModel } from "@/api/user/userModel";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { env } from "@/common/utils/envConfig";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { logger } from "@/common/utils/logger";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

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
 * - forceSeeding is true AND user has admin role
 *
 * @param forceSeeding - If true, allows seeding when user has admin role
 * @param userRoles - Array of user roles (required when forceSeeding is true)
 * @returns Promise<{allowed: boolean, reason?: string}>
 */
export async function isSeedingAllowed(
  forceSeeding = false,
  userRoles?: string[],
): Promise<{ allowed: boolean; reason?: string }> {
  // Always allow in development or test environments
  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
    return { allowed: true };
  }

  // Allow if ALLOW_SEED is explicitly set
  if (process.env.ALLOW_SEED === "true") {
    logger.warn("Seeding allowed via ALLOW_SEED environment variable in production");
    return { allowed: true };
  }

  // Allow if forceSeeding is true and user has admin role
  if (forceSeeding && userRoles && userRoles.includes("admin")) {
    logger.warn("Seeding forced by admin user");
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
 * @param forceSeeding - If true, allows seeding when user has admin role
 * @param userRoles - Array of user roles (required when forceSeeding is true)
 * @throws Error if seeding is not allowed in current environment
 */
export async function assertSeedingAllowed(forceSeeding = false, userRoles?: string[]): Promise<void> {
  const { allowed, reason } = await isSeedingAllowed(forceSeeding, userRoles);

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

/**
 * Express middleware that checks if seeding is allowed.
 * Use this on seed routers to protect all seeding endpoints at once.
 * Supports forceSeeding query parameter for admin users.
 *
 * @example
 * seedRouter.use(seedingMiddleware);
 */
export const seedingMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const forceSeeding = req.query.forceSeeding === "true";
  const userRoles = req.session?.roles || [];

  const { allowed, reason } = await isSeedingAllowed(forceSeeding, userRoles);

  if (!allowed) {
    const serviceResponse = ServiceResponse.failure(
      reason || "Seeding is not allowed in production environment",
      null,
      StatusCodes.FORBIDDEN,
    );
    return handleServiceResponse(serviceResponse, res);
  }

  next();
};
