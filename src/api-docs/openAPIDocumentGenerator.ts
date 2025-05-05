import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

import { patientCaseRegistry } from "@/api/case/patientCaseRouter";
import { clinicalStudyRegistry } from "@/api/clinicalStudy/clinicalStudyRouter";
import { consultationRegistry } from "@/api/consultation/consultationRouter";
import { formRegistry } from "@/api/form/formRouter";
import { formTemplateRegistry } from "@/api/formtemplate/formTemplateRouter";
import { healthCheckRegistry } from "@/api/healthCheck/healthCheckRouter";
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
    consultationRegistry,
    formTemplateRegistry,
    formRegistry,
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
