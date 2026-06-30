import { rateLimit } from "express-rate-limit";

import { env } from "@/common/utils/envConfig";

/**
 * Rate limiter for authentication endpoints (login, etc.)
 * Uses stricter limits to prevent brute force attacks
 */
export const authRateLimiter = rateLimit({
  legacyHeaders: true,
  limit: env.COMMON_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  windowMs: env.COMMON_RATE_LIMIT_WINDOW_MS,
  validate: { trustProxy: false },
});

/**
 * Rate limiter for sensitive operations (role switching, etc.)
 * Uses stricter limits to prevent abuse of privileged actions
 */
export const sensitiveOperationRateLimiter = rateLimit({
  legacyHeaders: true,
  limit: env.COMMON_RATE_LIMIT_MAX_REQUESTS,
  message: "Too many requests for this sensitive operation, please try again later.",
  standardHeaders: true,
  windowMs: env.COMMON_RATE_LIMIT_WINDOW_MS,
  validate: { trustProxy: false },
});
