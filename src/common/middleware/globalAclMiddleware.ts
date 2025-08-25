import type { NextFunction, Request, Response } from "express";
import { ACLRequest, acl } from "./acl";
import { aclConfig } from "./aclConfig";

// Utility to generate a route key from request (customize as needed)
function getRouteKey(req: Request): string {
  // some routes might not have a clear resource name, e.g., /api/user/login
  // for those routes, use setRoutekey middleware to set the routeKey explicitly
  console.debug(`Generating route key for request: ${req.method} ${req.path}`);
  // Example: /api/consultation -> 'consultation', /api/patient -> 'patient'
  // Adjust the logic if your routes are nested or have parameters
  const basePath = req.baseUrl.replace(/^\//, ""); // Remove leading slash
  const pathParts = req.path.split("/").filter(Boolean);
  //BUG this could become a problem if the base path is longer than one part
  const resource = pathParts.length > 0 ? pathParts[0] : basePath; // Use first part of path as resource
  // if (pathParts[1] != undefined) resource += `-${pathParts[1]}`;
  const method = req.method.toLowerCase();
  // e.g., 'consultation:get', 'patient:post'
  console.debug(`Generated route key: ${resource}:${method}`);
  return `${resource}:${method}`;
}

// Global ACL middleware
export function AclMiddleware(routeKey = "") {
  return (req: Request, res: Response, next: NextFunction) => {
    let usedRouteKey = "";
    if (routeKey !== "") {
      // If routeKey is provided, set it on the request object
      usedRouteKey = routeKey;
      console.debug(`AclMiddleware: Route key set to: ${usedRouteKey}`);
    } else usedRouteKey = getRouteKey(req);

    console.debug(`AclMiddleware: Processing route key: ${usedRouteKey}`);
    if (!usedRouteKey) {
      console.debug("AclMiddleware: No route key found, skipping ACL check");
      return next();
    }
    const aclRule = (
      aclConfig as Record<string, { roles?: string[]; permissions?: string[]; atLeastAuthenticationLevel?: string }>
    )[usedRouteKey];
    if (!aclRule) {
      console.debug(`AclMiddleware: No ACL rule found for route key: ${usedRouteKey}`);
      return next(); // No ACL rule for this route
    }
    // Use the generic acl middleware for enforcement
    console.debug(`AclMiddleware: Applying ACL rule for route key: ${usedRouteKey}`, aclRule);
    return acl(aclRule)(req, res, next);
  };
}
