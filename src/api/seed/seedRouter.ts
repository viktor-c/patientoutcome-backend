import { ConsultationRepository } from "@/api/patient/case/consultation/consultationRepository";
import { PatientCaseRepository } from "@/api/patient/case/patientCaseRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { env } from "@/common/utils/envConfig";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import express, { type Router, type Request, type Response, type NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

const seedRouter: Router = express.Router();
const patientCaseRepository = new PatientCaseRepository();
const consultationRepository = new ConsultationRepository();

// Middleware to check if the environment is testing, if not we cannot use this route
const checkTestingEnv = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "test") {
    const serviceResponse = ServiceResponse.failure("Access denied", null, StatusCodes.FORBIDDEN);
    return handleServiceResponse(serviceResponse, res);
  }
  next();
};

seedRouter.use(checkTestingEnv);

seedRouter.get("/patientCase", async (_req: Request, res: Response) => {
  try {
    await patientCaseRepository.createMockData();
    const serviceResponse = ServiceResponse.success("Mock data inserted successfully", null);
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

seedRouter.get("/consultation", async (_req: Request, res: Response) => {
  try {
    await consultationRepository.createMockData();
    const serviceResponse = ServiceResponse.success("Mock data inserted successfully", null);
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

export { seedRouter, patientCaseRepository, consultationRepository };
