import { PatientCaseRepository } from "@/api/case/patientCaseRepository";
import { ClinicalStudyRepository } from "@/api/clinicalStudy/clinicalStudyRepository";
import { CodeRepository } from "@/api/code/codeRepository";
import { type ConsultationRepository, consultationRepository } from "@/api/consultation/consultationRepository";
import { FormRepository } from "@/api/form/formRepository";
import { FormTemplateRepository } from "@/api/formtemplate/formTemplateRepository";
import { KioskRepository } from "@/api/kiosk/kioskRepository";
import { userRepository } from "@/api/user/userRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
// import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import express, { type Router, type Request, type Response, type NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { PatientRepository } from "../patient/patientRepository";
import { UserRegistrationRepository } from "../user/userRegistrationRepository";

const seedRouter: Router = express.Router();
const patientRepository = new PatientRepository();
const patientCaseRepository = new PatientCaseRepository();
const formTemplateRepository = new FormTemplateRepository();
const formRepository = new FormRepository();
// const userRepository = new UserRepository();
const codeRepository = new CodeRepository();
const userRegistrationRepository = new UserRegistrationRepository();
// const consultationRepository = new ConsultationRepository();
const clinicalStudyRepository = new ClinicalStudyRepository();
const kioskRepository = new KioskRepository();

// Middleware to check if the environment is testing, if not we cannot use this route
const checkTestingEnv = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "development") {
    const serviceResponse = ServiceResponse.failure("Access denied", null, StatusCodes.FORBIDDEN);
    return handleServiceResponse(serviceResponse, res);
  }
  next();
};

seedRouter.use(checkTestingEnv);

/**
 * seed database with mock data for patients
 * @route GET /seed/patients
 */
seedRouter.get("/patients", async (_req: Request, res: Response) => {
  try {
    await patientRepository.createMockData();
    const serviceResponse = ServiceResponse.success("Patient mock data inserted successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to insert mock data",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

/**
 * seed database with mock data for patient cases
 * @route GET /seed/patientCase
 */
seedRouter.get("/patientCase", async (_req: Request, res: Response) => {
  try {
    await patientCaseRepository.createMockPatientCaseData();
    const serviceResponse = ServiceResponse.success("Patient case mock data inserted successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to insert mock data",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

/**
 * seed database with mock data for consultations
 * @route GET /seed/consultation
 */
seedRouter.get("/consultation", async (_req: Request, res: Response) => {
  try {
    await consultationRepository.createMockData();
    const serviceResponse = ServiceResponse.success("Consultation Mock data inserted successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to insert mock data",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

/**
 * seed database with mock data for form templates
 * @route GET /seed/formTemplate
 */
seedRouter.get("/formTemplate", async (_req: Request, res: Response) => {
  try {
    await formTemplateRepository.createMockDataFormTemplate();
    logger.debug({ mockTemplates: formTemplateRepository.mockFormTemplateData }, "Form template mock data");
    const serviceResponse = ServiceResponse.success("Form Mock templates inserted successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to insert mock form templates",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

/**
 * seed database with mock data for forms
 * @route GET /seed/form
 */
seedRouter.get("/forms", async (_req: Request, res: Response) => {
  try {
    await formRepository.createFormMockData();
    const serviceResponse = ServiceResponse.success("Form Mock data inserted successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to insert mock data",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

/**
 * seed database with mock data for users
 * @route GET /seed/users
 */
seedRouter.get("/users", async (_req: Request, res: Response) => {
  try {
    await userRepository.createMockUserData();
    const serviceResponse = ServiceResponse.success("User mock data inserted successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to insert mock user data",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

/**
 * seed database with mock data for clinical study
 * @route GET /seed/clinicalStudy
 */
seedRouter.get("/clinicalStudy", async (_req: Request, res: Response) => {
  try {
    await clinicalStudyRepository.createMockDataClinicalStudies();
    const serviceResponse = ServiceResponse.success("Clinical Study mock data inserted successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to insert mock clinical study data",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

/**
 * Seed database with mock data for codes
 * @route GET /seed/form-access-codes
 */
seedRouter.get("/form-access-codes", async (_req: Request, res: Response) => {
  try {
    // Insert mock data into the database
    await codeRepository.createMockDataFormAccessCodes();
    const serviceResponse = ServiceResponse.success("Code mock data inserted successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to insert code mock data",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

/**
 * Seed database with mock data for kiosks
 * @route GET /seed/kiosks
 */
seedRouter.get("/kiosks", async (_req: Request, res: Response) => {
  try {
    await kioskRepository.createMockData();
    const serviceResponse = ServiceResponse.success("Kiosk mock data inserted successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to insert kiosk mock data",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

seedRouter.get("/user-registration-codes", async (req, res) => {
  try {
    await userRegistrationRepository.createMockUserRegistrationCodes();
    const serviceResponse = ServiceResponse.success("User registration codes mock data inserted successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to insert user registration codes mock data",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

seedRouter.get("/clear-all-sessions", async (_req, res) => {
  try {
    // Remove all documents from the MongoDB 'sessions' collection
    await mongoose.connection.collection("sessions").deleteMany({});
    const serviceResponse = ServiceResponse.success("All session data cleared successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to clear all session data",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

seedRouter.get("/reset-all", async (_req: Request, res: Response) => {
  try {
    await patientRepository.createMockData();
    await patientCaseRepository.createMockPatientCaseData();
    await consultationRepository.createMockData();
    await formTemplateRepository.createMockDataFormTemplate();
    await formRepository.createFormMockData();
    await userRepository.createMockUserData();
    await clinicalStudyRepository.createMockDataClinicalStudies();
    await codeRepository.createMockDataFormAccessCodes();
    await kioskRepository.createMockData();

    const serviceResponse = ServiceResponse.success("All mock data reset successfully", null);
    return handleServiceResponse(serviceResponse, res);
  } catch (error) {
    const serviceResponse = ServiceResponse.failure(
      "Failed to reset mock data",
      null,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

export {
  seedRouter,
  patientRepository,
  patientCaseRepository,
  // consultationRepository,
  formTemplateRepository,
  formRepository,
  userRepository,
  clinicalStudyRepository,
  codeRepository,
  kioskRepository,
};
