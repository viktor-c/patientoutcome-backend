import type { NextFunction, Request, Response } from "express";
import { userAuthenticationLevels } from "./aclConfig";

// Type for a user object with roles/permissions (customize as needed)
// export interface ACLUser {
//   id: string;
//   roles: string[];
//   permissions?: string[];
// }

// // Type for the request with user attached (customize if you use a different property)
// export interface ACLRequest extends Request {
//   session: ACLUser;
// }

// ACL middleware factory: pass allowed roles or permissions
export function acl({
  roles = [],
  permissions = [],
  atLeastAuthenticationLevel = "authenticated",
}: {
  roles?: string[];
  permissions?: string[];
  atLeastAuthenticationLevel?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.session;
    //first check if anonymous user is allowed
    const anonymousAllowed =
      roles.includes("anonymous") || permissions.includes("anonymous") || atLeastAuthenticationLevel === "anonymous";
    if (!user.userId && !anonymousAllowed) {
      return res.status(401).json({ message: "Authentication required: No active session" });
    }
    // if user is not authenticated, check if anonymous is allowed
    if (!user.userId && anonymousAllowed) return next();

    // from here on, we assume user is authenticated
    // if user role is authenticated, allow access
    // This is optional, you can remove this check if you want to enforce roles/permissions
    if (roles.length > 0 && roles.includes("authenticated")) {
      return next();
    }
    // Check roles
    if (roles.length > 0 && user.roles && !user.roles.some((role) => roles.includes(role))) {
      return res.status(403).json({ message: "Access denied: Insufficient role permissions" });
    }
    // Check permissions
    if (permissions.length > 0 && (!user.permissions || !user.permissions.some((p) => permissions.includes(p)))) {
      return res.status(403).json({ message: "Access denied: Insufficient permissions" });
    }

    // Check authentication level
    if (atLeastAuthenticationLevel) {
      if (user.roles && user.roles.length > 0) {
        // go through all roles of the user, and check if at least one role has the required authentication level
        let hasRequiredLevel = false;
        for (const role of user.roles) {
          if (userAuthenticationLevels[role] >= userAuthenticationLevels[atLeastAuthenticationLevel]) {
            hasRequiredLevel = true;
            break; // No need to check further if one role meets the requirement
          }
        }
        // we found no roles at least as high as atLeastAuthenticationLevel
        if (!hasRequiredLevel) {
          return res.status(403).json({ message: "Access denied: Insufficient authentication level" });
        }
      } else {
        // do a last check, to see if atleastAuthenticationLevel is 'anonymous', if so, allow access
        if (atLeastAuthenticationLevel === "anonymous") {
          return next();
        }
        //this means we need at leastAuthenticationLevel, but the user has no roles, means he is not authenticated
        return res.status(403).json({ message: "Access denied: Insufficient authentication level" });
      }
    }
    next();
  };
}

// Example usage in a router:
// router.get('/admin', acl({ roles: ['admin'] }), handler)
// router.post('/edit', acl({ permissions: ['edit_consultation'] }), handler)
