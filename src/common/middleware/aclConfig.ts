// Centralized ACL config for all routes
// You can use route names, paths, or custom keys as needed

// Centralized ACL config for all routes

// users can have following roles
// developer, admin, project-manager, study-nurse, doctor, mfa, student, authenticated, anonymous

export interface userAuthenticationLevelsType {
  [role: string]: number;
}

export const userAuthenticationLevels: userAuthenticationLevelsType = {
  developer: 1000, // Developer level
  admin: 800, // Admin level
  "project-manager": 500, // Project manager level
  "study-nurse": 200, // Study nurse level
  doctor: 100, // Doctor level
  mfa: 50, // medizinische fachangestellte
  student: 25, // Student level
  authenticated: 1,
  anonymous: 0,
};

// acl can be roles, permissions, or at least authentication level

export const aclConfig = {
  // Example: Consultation routes
  "consultation:get": { roles: ["authenticated"] },
  "consultation:create": { roles: ["study-nurse", "doctor", "mfa"] },
  "consultation:update": { atLeastAuthenticationLevel: "mfa" },
  "consultation:delete": { atLeastAuthenticationLevel: "study-nurse" },

  // Example: Patient routes
  "patient:get": { roles: ["authenticated"] },
  "patient:create": { roles: ["authenticated"] },
  "patient:update": { roles: ["authenticated"] },
  "patient:delete": { roles: ["admin"] },

  // login routes
  // login path is not here, so it should pass without acl
  "user-login": { roles: ["anonymous"] }, // Allow anonymous users to login
  "user-logout": { roles: ["authenticated"] }, // Allow authenticated users to logout
  "user:get": { atLeastAuthenticationLevel: "admin" },
  "user:delete": { atLeastAuthenticationLevel: "admin" },

  // Add more route keys as needed
};
