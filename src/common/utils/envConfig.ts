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
    devDefault: testOnly("mongodb://patientmanager:1234Test@localhost:27017/clinical-patientoutcome?authSource=admin"),
  }),
  SESSION_SECRET: str({
    devDefault: testOnly(
      "b07cb0c05d9f3d0a9a0e72daa52e6fcd37f50cc3bc370c1898aa16b5d5e2ba930546a04b32ad57970a820b9e6fdfe6e4",
    ),
  }),
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
