# Authentication vs Authorization Error Handling

## Overview
This document explains how to properly distinguish between authentication and authorization failures in the backend.

## HTTP Status Codes

### 401 Unauthorized (Actually: Unauthenticated)
**When to use:** The user has no valid session or the session has expired.
**Meaning:** "You need to log in to access this resource"
**Response message pattern:** "Authentication required: ..."

**Examples:**
- No session cookie present
- Session expired
- Invalid session token
- User not logged in

### 403 Forbidden (Actually: Unauthorized)
**When to use:** The user is authenticated (has a valid session) but lacks the required permissions/roles.
**Meaning:** "You're logged in, but you don't have permission to do this"
**Response message pattern:** "Access denied: ..."

**Examples:**
- User is logged in but doesn't have the required role (e.g., needs 'admin' but has 'student')
- User's authentication level is too low (e.g., needs 'study-nurse' but has 'mfa')
- User lacks specific permissions

## Implementation

### In Middleware (`src/common/middleware/acl.ts`)

```typescript
// ✅ 401 - No session at all
if (!user.userId && !anonymousAllowed) {
  return res.status(401).json({ 
    message: "Authentication required: No active session" 
  });
}

// ✅ 403 - Has session but insufficient role
if (roles.length > 0 && user.roles && !user.roles.some((role) => roles.includes(role))) {
  return res.status(403).json({ 
    message: "Access denied: Insufficient role permissions" 
  });
}

// ✅ 403 - Has session but insufficient authentication level
if (!hasRequiredLevel) {
  return res.status(403).json({ 
    message: "Access denied: Insufficient authentication level" 
  });
}
```

### In Controllers

Controllers should only return 401 when checking for session existence:

```typescript
// ✅ 401 - Check if session exists
if (!req.session || !req.session.userId) {
  return res.status(401).json({ 
    message: "Authentication required: Not logged in" 
  });
}

// After this point, user is authenticated
// Any permission checks should return 403 via the ACL middleware
```

## Frontend Handling

Your frontend should handle these status codes differently:

### 401 Response
```typescript
if (response.status === 401) {
  // Session expired or user not logged in
  // Redirect to login page
  // Clear local auth state
  router.push('/login');
}
```

### 403 Response
```typescript
if (response.status === 403) {
  // User is logged in but lacks permissions
  // Show error message
  // Don't redirect to login
  showToast('You do not have permission to perform this action');
}
```

## OpenAPI Documentation

Update your router OpenAPI specs to include both status codes:

```typescript
responses: createApiResponses([
  {
    schema: SuccessSchema,
    description: "Success",
    statusCode: 200,
  },
  {
    schema: z.object({ message: z.string() }),
    description: "Authentication required - No active session",
    statusCode: 401,
  },
  {
    schema: z.object({ message: z.string() }),
    description: "Access denied - Insufficient permissions",
    statusCode: 403,
  },
  // ... other responses
])
```

## Testing

When writing tests, verify the correct status code:

```typescript
// Test: No session
it("should return 401 when not authenticated", async () => {
  const response = await request(app).get("/api/resource");
  expect(response.status).toBe(401);
  expect(response.body.message).toContain("Authentication required");
});

// Test: Wrong role
it("should return 403 when authenticated but lacking permissions", async () => {
  const response = await request(app)
    .get("/api/admin/resource")
    .set("Cookie", studentUserCookie); // authenticated as student
  expect(response.status).toBe(403);
  expect(response.body.message).toContain("Access denied");
});
```

## Summary

| Code | Condition | User Action Required |
|------|-----------|---------------------|
| 401  | No session / Expired session | Log in again |
| 403  | Valid session but insufficient permissions | Contact admin or use different account |

## Updated Files

The following files have been updated with the new error messages:
- `src/common/middleware/acl.ts` - Updated all authentication/authorization checks
