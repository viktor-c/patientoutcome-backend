import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "node:path";

// Logger interface with multiple overloads
interface Logger {
  debug(msg: string): void;
  debug(data: object, msg: string): void;
  info(msg: string): void;
  info(data: object, msg: string): void;
  warn(msg: string): void;
  warn(data: object, msg: string): void;
  error(msg: string): void;
  error(data: unknown, msg: string): void;
}

// Get log configuration from environment variables
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === "development" ? "debug" : "info");
const LOG_DIR = process.env.LOG_DIR || "/var/log/patientoutcome";
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || "20m";
const LOG_MAX_FILES = process.env.LOG_MAX_FILES || "14d";
const LOG_TO_FILE = process.env.LOG_TO_FILE === "true" || process.env.NODE_ENV === "production";

// Service identifier for logs
const SERVICE_NAME = process.env.SERVICE_NAME || "patientoutcome-backend";

// Custom format for console output: structured JSON for easier parsing by log collectors
const structuredConsoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const base: any = {
      timestamp,
      level,
      message,
      service: SERVICE_NAME,
      environment: process.env.NODE_ENV,
    };
    // Merge meta fields into the JSON object
    const merged = Object.assign(base, meta);
    try {
      return JSON.stringify(merged);
    } catch (err) {
      return JSON.stringify({ ...base, meta: String(err) });
    }
  }),
);

// Custom format for file output (JSON for easier parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create transports array
const transports: winston.transport[] = [
  // Console transport (always enabled) - emit structured JSON for container logs
  new winston.transports.Console({
    format: structuredConsoleFormat,
  }),
];

// Add file transports if logging to file is enabled
if (LOG_TO_FILE) {
  // Combined log (all levels)
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      format: fileFormat,
      level: LOG_LEVEL,
    }),
  );

  // Error log (errors only)
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      format: fileFormat,
      level: "error",
    }),
  );
}

// Create Winston logger instance
const winstonLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports,
  exitOnError: false,
});

// Create adapter that matches our Logger interface
const createLoggerAdapter = (): Logger => {
  return {
    debug: (data: string | object, msg?: string) => {
      if (typeof data === "string") {
        winstonLogger.debug(data);
      } else {
        winstonLogger.debug(msg || "", data);
      }
    },
    info: (data: string | object, msg?: string) => {
      if (typeof data === "string") {
        winstonLogger.info(data);
      } else {
        winstonLogger.info(msg || "", data);
      }
    },
    warn: (data: string | object, msg?: string) => {
      if (typeof data === "string") {
        winstonLogger.warn(data);
      } else {
        winstonLogger.warn(msg || "", data);
      }
    },
    error: (msgOrData: string | object | Error, errorOrMsg?: string | unknown) => {
      if (typeof msgOrData === "string") {
        if (errorOrMsg !== undefined) {
          // Pattern: logger.error("message", error)
          winstonLogger.error(msgOrData, { error: errorOrMsg });
        } else {
          // Pattern: logger.error("message")
          winstonLogger.error(msgOrData);
        }
      } else {
        // Pattern: logger.error(error, "message") or logger.error(data, "message")
        const message = typeof errorOrMsg === "string" ? errorOrMsg : "";
        if (msgOrData instanceof Error) {
          winstonLogger.error(message, { error: msgOrData.message, stack: msgOrData.stack });
        } else {
          winstonLogger.error(message, msgOrData);
        }
      }
    },
  } as Logger;
};

export const logger: Logger = createLoggerAdapter();

// Log the logger configuration on startup
winstonLogger.info("Logger initialized", {
  level: LOG_LEVEL,
  logToFile: LOG_TO_FILE,
  logDir: LOG_DIR,
  environment: process.env.NODE_ENV,
});
