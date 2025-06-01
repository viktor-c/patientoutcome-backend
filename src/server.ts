import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";

//****************** Routers import ****************************** */
import { openAPIRouter } from "@/api-docs/openAPIRouter";
import { clinicalStudyRouter } from "@/api/clinicalStudy/clinicalStudyRouter";
import { formAccessCodeRouter } from "@/api/code/codeRouter";
import { formRouter } from "@/api/form/formRouter";
import { formTemplateRouter } from "@/api/formtemplate/formTemplateRouter";
import { healthCheckRouter } from "@/api/healthCheck/healthCheckRouter";
import { seedRouter } from "@/api/seed/seedRouter";
import { userRouter } from "@/api/user/userRouter";

/*******************  Middleware import **************************/
import errorHandler from "@/common/middleware/errorHandler";
import rateLimiter from "@/common/middleware/rateLimiter";
import requestLogger from "@/common/middleware/requestLogger";
import { env } from "@/common/utils/envConfig";
import { patientRouter } from "./api/patient/patientRouter";

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { extendZod as extendZodMongoose } from "@zodyac/zod-mongoose";

// Use the patientCaseRouter
import { caseRouter } from "@/api/case/patientCaseRouter"; // Import the patientCaseRouter
import { consultationRouter } from "@/api/consultation/consultationRouter";
import { z } from "zod";
import connectMongooseDB from "./common/database";

extendZodMongoose(z);
// Extend zod with OpenAPI support
extendZodWithOpenApi(z);

const logger = pino({ name: "server start" });
const app: Express = express();

//initialize the database connection
connectMongooseDB()
  .then(() => console.log("server.ts: Mongoose connected successfully"))
  .catch((error) => console.log("server.ts: Mongoose failed to connect", error));

// Set the application to trust the reverse proxy
app.set("trust proxy", true);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(rateLimiter);

// Request logging
app.use(requestLogger);

// Routes
app.use("/patient", patientRouter);
app.use("/health-check", healthCheckRouter);
app.use("", caseRouter);
app.use("/user", userRouter);
app.use("", consultationRouter);
app.use("/clinicalstudy", clinicalStudyRouter);
app.use("/seed", seedRouter);
app.use("/formtemplate", formTemplateRouter);
app.use("", formRouter);
app.use("/form-access-code", formAccessCodeRouter);

// Swagger UI
app.use(openAPIRouter);

// Error handlers
app.use(errorHandler());

// Default handler for all other routes
// seems that openApiRouter catches all routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

console.debug("Node env is ", env.NODE_ENV);

export { app, logger };
