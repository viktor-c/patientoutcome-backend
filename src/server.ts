// Initialize OpenAPI extension first before any other imports that use zod
import { z } from "@/common/utils/zodInit";

import { logger } from "@/common/utils/logger";
import MongoStore from "connect-mongo";
import cors from "cors";
import express, { type Express } from "express";
import session from "express-session";
import helmet from "helmet";

//****************** Routers import ****************************** */
import { activityLogRouter } from "@/api/activitylog/activityLogRouter";
import { blueprintRouter } from "@/api/blueprint/blueprintRouter";
import { clinicalStudyRouter } from "@/api/clinicalStudy/clinicalStudyRouter";
import { formAccessCodeRouter } from "@/api/code/codeRouter";
import { feedbackRouter } from "@/api/feedback/feedbackRouter";
import { formRouter } from "@/api/form/formRouter";
import { formTemplateRouter } from "@/api/formtemplate/formTemplateRouter";
import { healthCheckRouter } from "@/api/healthCheck/healthCheckRouter";
import { kioskRouter } from "@/api/kiosk/kioskRouter";
import { seedRouter } from "@/api/seed/seedRouter";
import { setupRouter } from "@/api/setup/setupRouter";
import { statisticsRouter } from "@/api/statistics/statisticsRouter";
import { surgeryRouter } from "@/api/surgery/surgeryRouter";
import { userRouter } from "@/api/user/userRouter";
import { userDepartmentRouter } from "@/api/userDepartment/userDepartmentRouter";

/*******************  Middleware import **************************/ 
import errorHandler from "@/common/middleware/errorHandler";
import rateLimiter from "@/common/middleware/rateLimiter";
import requestLogger from "@/common/middleware/requestLogger";
import { env } from "@/common/utils/envConfig";
import { patientRouter } from "./api/patient/patientRouter";

import { extendZod as extendZodMongoose } from "@zodyac/zod-mongoose";

// Use the patientCaseRouter
import { caseRouter } from "@/api/case/patientCaseRouter"; // Import the patientCaseRouter
import { consultationRouter } from "@/api/consultation/consultationRouter";
import connectMongooseDB from "./common/database";

// Extend zod with Mongoose support
logger.debug("server.ts: Extending Zod with Mongoose support");
extendZodMongoose(z);

const app: Express = express();

//initialize the database connection
connectMongooseDB()
  .then(() => logger.info("server.ts: Mongoose connected successfully"))
  .catch((error) => logger.error({ error }, "server.ts: Mongoose failed to connect"));

// Set the application to trust the reverse proxy
app.set("trust proxy", true);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Support a single origin or a comma-separated list in the CORS_ORIGIN env var
const corsOriginValue = env.CORS_ORIGIN ?? "";
logger.info(`server.ts: CORS Origin: ${corsOriginValue}`);
const corsOrigins = corsOriginValue.includes(",") ? corsOriginValue.split(",").map((s) => s.trim()) : corsOriginValue;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(helmet());
app.use(rateLimiter);

// Configure session middleware
app.use(
  session({
    secret: env.SESSION_SECRET, // Add SESSION_SECRET to your environment variables

    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: env.MONGO_URI, // Use the existing MongoDB connection URI
      collectionName: "sessions",
    }),
    cookie: {
      // For localhost development, use "lax" since both frontend and backend are on localhost (same-site)
      // For production with different domains (cross-origin), use "none" with secure: true
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      // secure: true is required when sameSite is "none" (production)
      // For development with HTTP localhost, use secure: false with sameSite: "lax"
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  }),
);

// Request logging
app.use(requestLogger);

// Routes
app.use("/activitylog", activityLogRouter);
app.use("/blueprints", blueprintRouter);
app.use("/patient", patientRouter);
app.use("/health-check", healthCheckRouter);
app.use("", caseRouter);
app.use("", surgeryRouter);
app.use("/user", userRouter);
app.use("/userDepartment", userDepartmentRouter);
app.use("", consultationRouter);
app.use("/clinicalstudy", clinicalStudyRouter);
app.use("/seed", seedRouter);
app.use("/setup", setupRouter);
app.use("/statistics", statisticsRouter);
app.use("/formtemplate", formTemplateRouter);
app.use("", formRouter);
app.use("/form-access-code", formAccessCodeRouter);
app.use("/kiosk", kioskRouter);
app.use("/feedback", feedbackRouter);

// Swagger UI - only load in non-test environments to avoid schema loading issues
if (env.NODE_ENV !== "test") {
  const { openAPIRouter } = require("@/api-docs/openAPIRouter");
  app.use("/openapi", openAPIRouter);
}

// Error handlers
app.use(errorHandler());

// Default handler for all other routes
// seems that openApiRouter catches all routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

logger.debug({ NODE_ENV: env.NODE_ENV }, "Node environment configuration");

export { app, logger };
