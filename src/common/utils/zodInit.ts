// Initialize OpenAPI extension for zod globally
// This must be imported before any zod schemas are defined
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Extend zod with OpenAPI support
extendZodWithOpenApi(z);

export { z };
