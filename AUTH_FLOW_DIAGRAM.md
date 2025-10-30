# Authentication vs Authorization Flow

## Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Request                           │
│                   GET /api/protected-resource                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express Middleware Chain                      │
│                                                                   │
│  1. Session Middleware (loads req.session)                       │
│  2. AclMiddleware (globalAclMiddleware.ts)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               Check: Does req.session.userId exist?              │
└─────┬──────────────────────────────────────────────────┬────────┘
      │                                                    │
    NO│                                                    │YES
      │                                                    │
      ▼                                                    ▼
┌──────────────────┐                         ┌─────────────────────┐
│  401 RESPONSE    │                         │  User Authenticated │
│  ─────────────   │                         │  ─────────────────  │
│                  │                         │                     │
│  Status: 401     │                         │  Check permissions  │
│  Message:        │                         │  based on:          │
│  "Authentication │                         │  - Roles            │
│   required:      │                         │  - Permissions      │
│   No active      │                         │  - Auth Level       │
│   session"       │                         └──────────┬──────────┘
│                  │                                    │
│  Frontend:       │                         ┌──────────┴──────────┐
│  → Clear state   │                         │                     │
│  → Redirect to   │                 HAS     │                   NO│
│     /login       │              PERMISSION │                PERM │
└──────────────────┘                         │                     │
                                             ▼                     ▼
                                  ┌────────────────┐   ┌──────────────────┐
                                  │ 200 RESPONSE   │   │  403 RESPONSE    │
                                  │ ──────────────  │   │  ──────────────  │
                                  │                │   │                  │
                                  │ Status: 200    │   │ Status: 403      │
                                  │ Data: {...}    │   │ Message:         │
                                  │                │   │ "Access denied:  │
                                  │ Frontend:      │   │  Insufficient... │
                                  │ → Process data │   │                  │
                                  └────────────────┘   │ Frontend:        │
                                                       │ → Show error     │
                                                       │ → Stay on page   │
                                                       │ → Don't redirect │
                                                       └──────────────────┘
```

## Example Scenarios

### Scenario 1: No Session (401)

```
Request: GET /api/user
Session: No cookie or expired

Flow:
├─ AclMiddleware executes
├─ Checks req.session.userId → undefined
├─ Returns 401: "Authentication required: No active session"
└─ Frontend redirects to /login
```

### Scenario 2: Student Accessing Admin Endpoint (403)

```
Request: DELETE /api/user/username/john
Session: Valid (userId: "abc123", roles: ["student"])
Required: roles: ["admin"] OR atLeastAuthenticationLevel: "admin"

Flow:
├─ AclMiddleware executes
├─ req.session.userId exists ✓
├─ Checks roles: ["student"] against required: ["admin"]
├─ User has "student" (level 25) but needs "admin" (level 800)
├─ Returns 403: "Access denied: Insufficient authentication level"
└─ Frontend shows error toast, stays on current page
```

### Scenario 3: Kiosk User Accessing Own Data (200)

```
Request: GET /api/kiosk/consultation
Session: Valid (userId: "def456", roles: ["kiosk"])
Required: roles: ["kiosk"]

Flow:
├─ AclMiddleware executes
├─ req.session.userId exists ✓
├─ Checks roles: ["kiosk"] against required: ["kiosk"]
├─ Match found ✓
├─ Passes to controller
├─ Controller processes request
└─ Returns 200 with consultation data
```

### Scenario 4: MFA Accessing Kiosk Admin Endpoint (200)

```
Request: GET /api/kiosk/user123/consultation
Session: Valid (userId: "ghi789", roles: ["mfa"])
Required: atLeastAuthenticationLevel: "mfa"

Flow:
├─ AclMiddleware executes
├─ req.session.userId exists ✓
├─ Checks authentication level: "mfa" (50) >= "mfa" (50) ✓
├─ Passes to controller
├─ Controller processes request
└─ Returns 200 with consultation data
```

## Decision Tree

```
                    ┌─────────────────┐
                    │ Request Arrives │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Session exists? │
                    └────────┬────────┘
                             │
                   ┌─────────┴─────────┐
                   │                   │
                  NO                  YES
                   │                   │
                   ▼                   ▼
            ┌───────────┐     ┌──────────────┐
            │ Return    │     │ Check ACL    │
            │ 401       │     │ Requirements │
            └───────────┘     └──────┬───────┘
                                     │
                       ┌─────────────┴─────────────┐
                       │                           │
                  MEETS REQUIREMENTS        DOESN'T MEET
                       │                           │
                       ▼                           ▼
              ┌─────────────────┐         ┌──────────────┐
              │ Continue to     │         │ Return       │
              │ Controller      │         │ 403          │
              │ Return 200/201  │         └──────────────┘
              └─────────────────┘
```

## Authentication Levels Reference

From `src/common/middleware/aclConfig.ts`:

```
Level 1000: developer
Level  800: admin
Level  500: project-manager
Level  200: study-nurse
Level  100: doctor
Level   50: mfa (medizinische fachangestellte)
Level   25: kiosk, student
Level    1: authenticated (any logged-in user)
Level    0: anonymous
```

## Quick Decision Matrix

| Condition | Status | Message Pattern | Action |
|-----------|--------|----------------|---------|
| No session cookie | 401 | "Authentication required: ..." | Redirect to login |
| Session expired | 401 | "Authentication required: ..." | Redirect to login |
| Logged in, wrong role | 403 | "Access denied: Insufficient role..." | Show error, stay on page |
| Logged in, low auth level | 403 | "Access denied: Insufficient authentication..." | Show error, stay on page |
| Logged in, correct permissions | 200/201 | Success response | Process normally |
