import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

import { clinicalStudyRegistry } from "@/api/clinicalStudy/clinicalStudyRouter";
import { healthCheckRegistry } from "@/api/healthCheck/healthCheckRouter";
import { patientCaseConsultationRegistry } from "@/api/patient/case/consultation/consultationRouter";
import { patientCaseRegistry } from "@/api/patient/case/patientCaseRouter";
import { patientRegistry } from "@/api/patient/patientRouter";
import { userRegistry } from "@/api/user/userRouter";

/**
 * This function generates the OpenAPI document by combining the OpenAPIRegistry objects from the different routers.
 *
 * @returns {object} The OpenAPI document.
 */
export function generateOpenAPIDocument() {
  const registry = new OpenAPIRegistry([
    healthCheckRegistry,
    userRegistry,
    patientRegistry,
    clinicalStudyRegistry,
    patientCaseRegistry,
    patientCaseConsultationRegistry,
  ]);
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Swagger API",
    },
    externalDocs: {
      description: "View the raw OpenAPI Specification in JSON format",
      url: "/swagger.json",
    },
  });
}
