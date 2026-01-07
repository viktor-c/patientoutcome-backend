import dotenv from "dotenv";
import { cleanEnv, host, num, port, str, testOnly } from "envalid";

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ devDefault: testOnly("test"), choices: ["development", "production", "test"] }),
  HOST: host({ devDefault: testOnly("localhost") }),
  PORT: port({ devDefault: testOnly(3000) }),
  CORS_ORIGIN: str({ devDefault: testOnly("http://localhost:3000") }),
  COMMON_RATE_LIMIT_MAX_REQUESTS: num({ devDefault: testOnly(1000) }),
  COMMON_RATE_LIMIT_WINDOW_MS: num({ devDefault: testOnly(1000) }),
  MONGO_URI: str({
    devDefault: testOnly("mongodb://testuser:testpassword@localhost:27017/patientoutcome-test?authSource=admin"),
  }),
  SESSION_SECRET: str({
    devDefault: testOnly("test-session-secret-do-not-use-in-production-replace-with-secure-random-value"),
  }),
  // Backup configuration
  BACKUP_STORAGE_PATH: str({ devDefault: testOnly("/tmp/backups") }),
  BACKUP_MASTER_KEY: str({
    devDefault: testOnly("backup-master-key-32-chars-min!"),
    desc: "Master encryption key for backup credentials (min 32 chars)",
  }),
  BACKUP_RETENTION_DAYS: num({ devDefault: testOnly(30), desc: "Default retention period for backups in days" }),
});

//only show debug info when node env is development
if (env.NODE_ENV === "development") {
  // Use logger from server to avoid circular dependency during development
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.debug("Debug mode is ON");
    console.debug("Environment variables loaded successfully");
    console.debug("CORS_ORIGIN: ", env.CORS_ORIGIN);
    console.debug("NODE_ENV: ", env.NODE_ENV);
    console.debug("MONGO_URI: ", env.MONGO_URI);
    console.debug("PORT: ", env.PORT);
    console.debug("HOST: ", env.HOST);
  }
}
