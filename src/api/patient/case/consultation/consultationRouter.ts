import { commonValidations } from "@/common/utils/commonValidation";
import { validateRequest } from "@/common/utils/httpHandlers";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";
import { consultationController } from "./consultationController";
import { PatientCaseConsultationSchema } from "./consultationModel";

export const patientCaseConsultationRegistry = new OpenAPIRegistry();
export const consultationRouter: Router = express.Router();

patientCaseConsultationRegistry.register("PatientCaseConsultation", PatientCaseConsultationSchema);

// Register the path for creating a consultation
patientCaseConsultationRegistry.registerPath({
  method: "post",
  path: "/patient/{patientId}/cases/{caseId}/consultation",
  tags: ["patient case consultation"],
  summary: "Create a new consultation for a patient case",
  request: {
    params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }),
    body: {
      content: {
        "application/json": { schema: PatientCaseConsultationSchema.omit({ _id: true, __v: true }) },
      },
    },
  },
  responses: {
    201: {
      description: "Consultation created successfully",
      content: { "application/json": { schema: PatientCaseConsultationSchema } },
    },
  },
});

consultationRouter.post(
  "/",
  validateRequest(z.object({ body: PatientCaseConsultationSchema })),
  consultationController.createConsultation,
);

// Register the path for getting a consultation by ID
patientCaseConsultationRegistry.registerPath({
  method: "get",
  path: "/patient/{patientId}/cases/{caseId}/consultation/{consultationId}",
  tags: ["patient case consultation"],
  summary: "Retrieve a consultation by ID for a patientId and caseId",
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
      consultationId: commonValidations.id,
    }),
  },
  responses: {
    200: {
      description: "Consultation retrieved successfully",
      content: { "application/json": { schema: PatientCaseConsultationSchema } },
    },
  },
});

consultationRouter.get("/:consultationId", consultationController.getConsultationById);

// Register the path for getting all consultations for a given patientId and caseId
patientCaseConsultationRegistry.registerPath({
  method: "get",
  path: "/patient/{patientId}/cases/{caseId}/consultations",
  tags: ["patient case consultation"],
  summary: "Retrieve all consultations for a given patientId and caseId",
  request: { params: z.object({ patientId: commonValidations.id, caseId: commonValidations.id }) },
  responses: {
    200: {
      description: "Consultations retrieved successfully",
      content: { "application/json": { schema: z.array(PatientCaseConsultationSchema) } },
    },
  },
});

consultationRouter.get("/", consultationController.getAllConsultations);

// Register the path for updating a consultation by ID
patientCaseConsultationRegistry.registerPath({
  method: "put",
  path: "/patient/{patientId}/cases/{caseId}/consultation/{consultationId}",
  tags: ["patient case consultation"],
  summary: "Update a consultation by ID for a patient case",
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
      consultationId: commonValidations.id,
    }),
    body: {
      content: {
        "application/json": {
          schema: PatientCaseConsultationSchema.partial(),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Consultation updated successfully",
      content: { "application/json": { schema: PatientCaseConsultationSchema } },
    },
  },
});

consultationRouter.put(
  "/:consultationId",
  validateRequest(z.object({ body: PatientCaseConsultationSchema.partial() })),
  consultationController.updateConsultation,
);

// Register the path for deleting a consultation by ID
patientCaseConsultationRegistry.registerPath({
  method: "delete",
  path: "/patient/{patientId}/cases/{caseId}/consultation/{consultationId}",
  tags: ["patient case consultation"],
  request: {
    params: z.object({
      patientId: commonValidations.id,
      caseId: commonValidations.id,
      consultationId: commonValidations.id,
    }),
  },
  responses: {
    204: {
      description: "Consultation deleted successfully",
    },
  },
});

consultationRouter.delete("/:consultationId", consultationController.deleteConsultation);

// Default handler for all other routes
consultationRouter.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});
