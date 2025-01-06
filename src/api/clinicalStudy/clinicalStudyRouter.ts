import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import { clinicalStudyController } from "./clinicalStudyController";
// ********************** specific imports for clinicalstudy ************************
import {
  ClinicalStudySchema,
  GetClinicalStudyByDiagnosisSchema,
  GetClinicalStudyByNurseIdSchema,
  GetClinicalStudyBySupervisorIdSchema,
  GetClinicalStudySchema,
  UpdateClinicalStudySchema,
} from "./clinicalStudyModel";

// initialize the openapi registry
export const clinicalStudyRegistry = new OpenAPIRegistry();
// create an express router
export const clinicalStudyRouter: Router = express.Router();

/* Define schemas and paths to create openapi */
clinicalStudyRegistry.register("ClinicalStudy", ClinicalStudySchema);

// Register the path for creating a clinical study
clinicalStudyRegistry.registerPath({
  method: "post",
  path: "/clinicalstudy",
  tags: ["ClinicalStudy"],
  request: {
    body: {
      content: {
        "application/json": { schema: ClinicalStudySchema },
      },
    },
  },
  responses: createApiResponse(ClinicalStudySchema, "Success"),
});

clinicalStudyRouter.post("/", validateRequest(ClinicalStudySchema), clinicalStudyController.createClinicalStudy);

// Register the path for getting all clinical studies
clinicalStudyRegistry.registerPath({
  method: "get",
  path: "/clinicalstudy",
  tags: ["ClinicalStudy"],
  responses: createApiResponse(z.array(ClinicalStudySchema), "Success"),
});

clinicalStudyRouter.get("/", clinicalStudyController.getClinicalStudies);

// Register the path for getting a clinical study by ID
clinicalStudyRegistry.registerPath({
  method: "get",
  path: "/clinicalstudy/{id}",
  tags: ["ClinicalStudy"],
  request: { params: GetClinicalStudySchema.shape.params },
  responses: createApiResponse(ClinicalStudySchema, "Success"),
});

clinicalStudyRouter.get("/:id", validateRequest(GetClinicalStudySchema), clinicalStudyController.getClinicalStudyById);

// Register the path for updating a clinical study
clinicalStudyRegistry.registerPath({
  method: "put",
  path: "/clinicalstudy/{id}",
  tags: ["ClinicalStudy"],
  request: {
    params: UpdateClinicalStudySchema.shape.params,
    body: {
      content: {
        "application/json": { schema: UpdateClinicalStudySchema.shape.body },
      },
    },
  },
  responses: createApiResponse(ClinicalStudySchema, "Success"),
});

clinicalStudyRouter.put(
  "/:id",
  validateRequest(z.object({ id: z.string() })),
  clinicalStudyController.updateClinicalStudy,
);

// Register the path for deleting a clinical study
clinicalStudyRegistry.registerPath({
  method: "delete",
  path: "/clinicalstudy/{id}",
  tags: ["ClinicalStudy"],
  request: { params: GetClinicalStudySchema.shape.params },
  responses: {
    [204]: {
      description: "Clinical study deleted successfully",
    },
  },
});

clinicalStudyRouter.delete(
  "/:id",
  validateRequest(GetClinicalStudySchema),
  clinicalStudyController.deleteClinicalStudy,
);

// Register the path for getting clinical studies by supervisor ID
clinicalStudyRegistry.registerPath({
  method: "get",
  path: "/clinicalstudy/supervisor/{supervisorId}",
  tags: ["ClinicalStudy"],
  request: { params: GetClinicalStudyBySupervisorIdSchema.shape.params },
  responses: createApiResponse(z.array(ClinicalStudySchema), "Success"),
});

clinicalStudyRouter.get(
  "/supervisor/:supervisorId",
  validateRequest(GetClinicalStudyBySupervisorIdSchema),
  clinicalStudyController.getClinicalStudiesBySupervisor,
);

// Register the path for getting clinical studies by study nurse ID
clinicalStudyRegistry.registerPath({
  method: "get",
  path: "/clinicalstudy/studynurse/{studyNurseId}",
  tags: ["ClinicalStudy"],
  request: { params: GetClinicalStudyByNurseIdSchema.shape.params },
  responses: createApiResponse(z.array(ClinicalStudySchema), "Success"),
});

clinicalStudyRouter.get(
  "/studynurse/:studyNurseId",
  validateRequest(GetClinicalStudyByNurseIdSchema),
  clinicalStudyController.getClinicalStudiesByStudyNurse,
);

// Register the path for getting clinical studies by diagnosis
clinicalStudyRegistry.registerPath({
  method: "get",
  path: "/clinicalstudy/diagnosis/{diagnosis}",
  tags: ["ClinicalStudy"],
  request: { params: GetClinicalStudyByDiagnosisSchema.shape.params },
  responses: createApiResponse(z.array(ClinicalStudySchema), "Success"),
});

clinicalStudyRouter.get(
  "/diagnosis/:diagnosis",
  validateRequest(GetClinicalStudyByDiagnosisSchema),
  clinicalStudyController.getClinicalStudiesByDiagnosis,
);
