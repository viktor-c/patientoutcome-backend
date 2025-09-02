import { logger } from "@/common/utils/logger";
import type { NextFunction, Request, Response } from "express";
import { acl } from "./acl";
import { aclConfig } from "./aclConfig";

// Utility to generate a route key from request (customize as needed)
function getRouteKey(req: Request): string {
  // some routes might not have a clear resource name, e.g., /api/user/login
  // for those routes, use setRoutekey middleware to set the routeKey explicitly
  logger.debug({ method: req.method, path: req.path }, "Generating route key for request");
  // Example: /api/consultation -> 'consultation', /api/patient -> 'patient'
  // Adjust the logic if your routes are nested or have parameters
  const basePath = req.baseUrl.replace(/^\//, ""); // Remove leading slash
  const pathParts = req.path.split("/").filter(Boolean);
  //BUG this could become a problem if the base path is longer than one part
  const resource = pathParts.length > 0 ? pathParts[0] : basePath; // Use first part of path as resource
  // if (pathParts[1] != undefined) resource += `-${pathParts[1]}`;
  const method = req.method.toLowerCase();
  // e.g., 'consultation:get', 'patient:post'
  const routeKey = `${resource}:${method}`;
  logger.debug({ routeKey }, "Generated route key");
  return routeKey;
}

// Global ACL middleware
export function AclMiddleware(routeKey = "") {
  return (req: Request, res: Response, next: NextFunction) => {
    let usedRouteKey = "";
    if (routeKey !== "") {
      // If routeKey is provided, set it on the request object
      usedRouteKey = routeKey;
      logger.debug({ usedRouteKey }, "AclMiddleware: Route key set");
    } else usedRouteKey = getRouteKey(req);

    logger.debug({ usedRouteKey }, "AclMiddleware: Processing route key");
    if (!usedRouteKey) {
      logger.debug("AclMiddleware: No route key found, skipping ACL check");
      return next();
    }
    const aclRule = (
      aclConfig as Record<string, { roles?: string[]; permissions?: string[]; atLeastAuthenticationLevel?: string }>
    )[usedRouteKey];
    if (!aclRule) {
      logger.debug({ usedRouteKey }, "AclMiddleware: No ACL rule found for route key");
      return next(); // No ACL rule for this route
    }
    // Use the generic acl middleware for enforcement
    logger.debug({ usedRouteKey, aclRule }, "AclMiddleware: Applying ACL rule for route key");
    return acl(aclRule)(req, res, next);
  };
}
