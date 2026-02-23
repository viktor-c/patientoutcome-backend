// Centralized ACL config for all routes
// You can use route names, paths, or custom keys as needed

// Centralized ACL config for all routes

// users can have following roles
// developer, admin, project-manager, study-nurse, doctor, mfa, student, authenticated, anonymous

/** All roles recognised by the ACL system, in order of decreasing privilege. */
export const ROLES = [
  "developer",
  "admin",
  "project-manager",
  "study-nurse",
  "doctor",
  "mfa",
  "kiosk",
  "student",
  "authenticated",
  "anonymous",
] as const;

/** Union type of all valid role strings. */
export type Role = (typeof ROLES)[number];

export const userAuthenticationLevels: Record<Role, number> = {
  developer: 1000, // Developer level
  admin: 800, // Admin level
  "project-manager": 500, // Project manager level
  "study-nurse": 200, // Study nurse level
  doctor: 100, // Doctor level
  mfa: 50, // medizinische fachangestellte
  kiosk: 25, // Kiosk user level
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

  // Form routes
  "form:soft-delete": { atLeastAuthenticationLevel: "doctor" },
  "form:restore": { atLeastAuthenticationLevel: "doctor" },
  "form:get-deleted": { atLeastAuthenticationLevel: "doctor" },

  // Example: Patient routes
  "patient:get": { roles: ["authenticated"] },
  "patient:create": { roles: ["authenticated"] },
  "patient:update": { roles: ["authenticated"] },
  "patient:delete": { roles: ["admin"] },

  // Kiosk routes
  "kiosk:get": { roles: ["kiosk"] },
  "kiosk:put": { roles: ["kiosk"] },
  "kiosk:get-for": { atLeastAuthenticationLevel: "mfa" },
  "kiosk:delete-for": { atLeastAuthenticationLevel: "mfa" },
  "kiosk:set-consultation": { atLeastAuthenticationLevel: "mfa" },

  // login routes
  // login path is not here, so it should pass without acl
  //"user-login": { roles: ["anonymous"] }, // Allow anonymous users to login
  "user-logout": { roles: ["authenticated"] }, // Allow authenticated users to logout
  "user:get": { roles: ["authenticated"] },
  "user:create": { roles: ["admin"] },
  "user:get-kiosk": { roles: ["authenticated"] },
  "user:update-by-id": { atLeastAuthenticationLevel: "admin" }, // Only admin can update other users
  "user:delete": { atLeastAuthenticationLevel: "admin" },

  // UserDepartment routes
  "userDepartment-get-all": { roles: ["admin"] },
  "userDepartment-get-own": { roles: ["authenticated"] },
  "userDepartment-get-by-id": { roles: ["admin"] },
  "userDepartment-create": { roles: ["admin"] },
  "userDepartment-update": { roles: ["admin"] },
  "userDepartment-delete": { roles: ["admin"] },
  "userDepartment-update-code-life": { atLeastAuthenticationLevel: "doctor" }, // Doctor+ can set code life for their own departments

  // Backup routes - admin and developer only
  "backup-jobs-get-all": { roles: ["admin", "developer"] },
  "backup-jobs-get": { roles: ["admin", "developer"] },
  "backup-jobs-create": { roles: ["admin", "developer"] },
  "backup-jobs-update": { roles: ["admin", "developer"] },
  "backup-jobs-delete": { roles: ["admin", "developer"] },
  "backup-jobs-trigger": { roles: ["admin", "developer"] },
  "backup-create": { roles: ["admin", "developer"] },
  "backup-history-get": { roles: ["admin", "developer"] },
  "backup-metadata-get": { roles: ["admin", "developer"] },
  "backup-download": { roles: ["admin", "developer"] },
  "backup-upload": { roles: ["admin", "developer"] },
  "backup-restore": { roles: ["admin", "developer"] },
  "backup-restore-history-get": { roles: ["admin", "developer"] },
  "backup-credentials-get-all": { roles: ["admin", "developer"] },
  "backup-credentials-create": { roles: ["admin", "developer"] },
  "backup-credentials-delete": { roles: ["admin", "developer"] },
  "backup-collections-get": { roles: ["admin", "developer"] },
  "backup-stats-get": { roles: ["admin", "developer"] },

  // Add more route keys as needed
};
