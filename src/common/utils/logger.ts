import pino from "pino";

// Logger interface with multiple overloads
interface Logger {
  debug(msg: string): void;
  debug(data: object, msg: string): void;
  info(msg: string): void;
  info(data: object, msg: string): void;
  warn(msg: string): void;
  warn(data: object, msg: string): void;
  error(msg: string): void;
  error(msg: string, error: Error | unknown): void;
  error(data: object | Error, msg?: string): void;
}

// In development, use console directly (outputs to stdout in VS Code)
// In production, use pino for structured logging
export const logger: Logger =
  process.env.NODE_ENV === "development"
    ? {
        debug: (data: string | object, msg?: string) => {
          if (typeof data === 'string') {
            console.debug(`[DEBUG] ${data}`);
          } else {
            console.debug(`[DEBUG] ${msg || ""}`, data);
          }
        },
        info: (data: string | object, msg?: string) => {
          if (typeof data === 'string') {
            console.info(`[INFO] ${data}`);
          } else {
            console.info(`[INFO] ${msg || ""}`, data);
          }
        },
        warn: (data: string | object, msg?: string) => {
          if (typeof data === 'string') {
            console.warn(`[WARN] ${data}`);
          } else {
            console.warn(`[WARN] ${msg || ""}`, data);
          }
        },
        error: (msgOrData: string | object | Error, errorOrMsg?: string | Error | unknown) => {
          if (typeof msgOrData === 'string') {
            if (errorOrMsg !== undefined) {
              // Pattern: logger.error("message", error)
              console.error(`[ERROR] ${msgOrData}`, errorOrMsg);
            } else {
              // Pattern: logger.error("message")
              console.error(`[ERROR] ${msgOrData}`);
            }
          } else {
            // Pattern: logger.error(error, "message") or logger.error(data, "message")
            console.error(`[ERROR] ${errorOrMsg || ""}`, msgOrData);
          }
        },
      } as Logger
    : (pino({
        level: "info",
      }) as unknown as Logger);
