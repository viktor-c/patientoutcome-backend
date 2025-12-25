import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

import { env } from "@/common/utils/envConfig";

/**
 * This function generates the OpenAPI document by combining the OpenAPIRegistry objects from the different routers.
 * In test environment, it returns a minimal mock document to avoid schema loading issues.
 *
 * @returns {object} The OpenAPI document.
 */
export function generateOpenAPIDocument() {
  // Only import registries when generating docs to avoid circular dependencies
  const { activityLogRegistry } = require("@/api/activitylog/activityLogRouter");
  const { blueprintRegistry } = require("@/api/blueprint/blueprintRouter");
  const { patientCaseRegistry } = require("@/api/case/patientCaseRouter");
  const { clinicalStudyRegistry } = require("@/api/clinicalStudy/clinicalStudyRouter");
  const { codeRegistry } = require("@/api/code/codeRouter");
  const { consultationRegistry } = require("@/api/consultation/consultationRouter");
  const { feedbackRegistry } = require("@/api/feedback/feedbackRouter");
  const { formRegistry } = require("@/api/form/formRouter");
  const { formTemplateRegistry } = require("@/api/formtemplate/formTemplateRouter");
  const { generalSchemaRegistry } = require("@/api/generalSchemas");
  const { healthCheckRegistry } = require("@/api/healthCheck/healthCheckRouter");
  const { kioskRegistry } = require("@/api/kiosk/kioskRouter");
  const { patientRegistry } = require("@/api/patient/patientRouter");
  const { statisticsRegistry } = require("@/api/statistics/statisticsRouter");
  const { surgeryRegistry } = require("@/api/surgery/surgeryRouter");
  const { userRegistry } = require("@/api/user/userRouter");
  const { userDepartmentRegistry } = require("@/api/userDepartment/userDepartmentRouter");

  const registry = new OpenAPIRegistry([
    activityLogRegistry,
    blueprintRegistry,
    codeRegistry,
    feedbackRegistry,
    healthCheckRegistry,
    userRegistry,
    patientRegistry,
    clinicalStudyRegistry,
    patientCaseRegistry,
    surgeryRegistry,
    consultationRegistry,
    statisticsRegistry,
    formTemplateRegistry,
    formRegistry,
    kioskRegistry,
    generalSchemaRegistry,
    userDepartmentRegistry,
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
