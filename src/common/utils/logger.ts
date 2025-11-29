import pino from "pino";

// In development, use console directly (outputs to stdout in VS Code)
// In production, use pino for structured logging
export const logger =
  process.env.NODE_ENV === "development"
    ? {
        debug: (data: any, msg?: string) => console.debug(`[DEBUG] ${msg || ""}`, data),
        info: (data: any, msg?: string) => console.info(`[INFO] ${msg || ""}`, data),
        warn: (data: any, msg?: string) => console.warn(`[WARN] ${msg || ""}`, data),
        error: (data: any, msg?: string) => console.error(`[ERROR] ${msg || ""}`, data),
      }
    : pino({
        level: "info",
      });
