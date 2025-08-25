import express, { type Request, type Response, type Router } from "express";
import swaggerUi from "swagger-ui-express";

import { generateOpenAPIDocument } from "@/api-docs/openAPIDocumentGenerator";

export const openAPIRouter: Router = express.Router();
const openAPIDocument = generateOpenAPIDocument();

/**
 * Route to serve the OpenAPI document
 */
openAPIRouter.get("/v1/swagger.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(openAPIDocument);
});

openAPIRouter.use("/v1", swaggerUi.serve, swaggerUi.setup(openAPIDocument));

// Avoid catch-all: return 404 for any other openAPIRouter route
openAPIRouter.use((req, res) => {
  res.status(404).json({ message: "OpenAPI route not found" });
});
