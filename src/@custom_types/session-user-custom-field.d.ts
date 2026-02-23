// add a custom object to session data
// [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html).
// https://stackoverflow.com/questions/67174560/adding-additional-properties-to-session-object

import type { Role } from "@/common/middleware/aclConfig";

export interface UserSessionField {
  sessionId?: string;
  lastLogin?: Date;
  loggedin?: boolean;
  username?: string;
  user?: string;
  userId?: string;
  roles?: Role[];
  permissions?: string[];
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    sessionId?: string;
    roles: Role[];
    permissions?: string[];
    lastLogin?: Date;
    loggedIn?: boolean;
    username?: string;
    consultationId?: string;
    department?: string[];
  }
}
