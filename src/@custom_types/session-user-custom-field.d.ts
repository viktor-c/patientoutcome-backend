// add a custom object to session data
// [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html).
// https://stackoverflow.com/questions/67174560/adding-additional-properties-to-session-object

export interface UserSessionField {
  sessionId?: string;
  lastLogin?: Date;
  loggedin?: boolean;
  username?: string;
  user?: string;
  userId?: string;
  roles?: string[];
  permissions?: string[];
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    sessionId?: string;
    roles: string[];
    permissions?: string[];
    lastLogin?: Date;
    loggedIn?: boolean;
    username?: string;
    consultationId?: string;
    department?: string[];
  }
}
