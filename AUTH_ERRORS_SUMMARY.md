# Summary: Authentication vs Authorization Error Handling

## What Changed

### 1. Middleware (`src/common/middleware/acl.ts`)
- **401 responses:** Only returned when `req.session.userId` is missing (no active session)
- **403 responses:** Returned when user is authenticated but lacks required roles, permissions, or authentication level
- Updated error messages to be more descriptive

### 2. Controllers
Updated error messages in:
- `src/api/user/userController.ts`
- `src/api/kiosk/kioskController.ts`

Changed from generic "Unauthorized" to specific "Authentication required" messages.

### 3. OpenAPI Documentation
Updated response documentation in routers:
- `src/api/user/userRouter.ts`
- `src/api/kiosk/kioskRouter.ts`

Added both 401 and 403 responses with clear descriptions.

## HTTP Status Code Usage

| Code | When | Message Pattern | User Action |
|------|------|----------------|-------------|
| 401 | No session or expired session | "Authentication required: ..." | Must log in |
| 403 | Has session but insufficient permissions | "Access denied: ..." | Contact admin or use different account |

## Error Message Patterns

### Backend Returns 401 When:
```typescript
// No session at all
if (!req.session || !req.session.userId) {
  return res.status(401).json({ 
    message: "Authentication required: No active session" 
  });
}
```

Messages:
- `"Authentication required: No active session"`
- `"Authentication required: Not logged in"`
- `"Authentication required: User id not found in session"`

### Backend Returns 403 When:
```typescript
// User authenticated but lacks permissions
if (!user.roles.some((role) => roles.includes(role))) {
  return res.status(403).json({ 
    message: "Access denied: Insufficient role permissions" 
  });
}
```

Messages:
- `"Access denied: Insufficient role permissions"`
- `"Access denied: Insufficient permissions"`
- `"Access denied: Insufficient authentication level"`

## Frontend Implementation

### React Example
```typescript
if (response.status === 401) {
  // Session expired - redirect to login
  localStorage.removeItem('user');
  navigate('/login');
}

if (response.status === 403) {
  // Insufficient permissions - show error, stay on page
  toast.error('You do not have permission to perform this action');
}
```

## Next Steps

1. **Start your backend server** to test the changes:
   ```bash
   npm run dev
   ```

2. **Test the responses:**
   - Access protected endpoint without login → Should get 401
   - Login as low-privilege user and access admin endpoint → Should get 403

3. **Regenerate frontend API client:**
   ```bash
   cd frontend
   rm -rf src/api
   npx @openapitools/openapi-generator-cli generate \
     -i http://localhost:40001/openapi/v1/swagger.json \
     -g typescript-fetch \
     -o src/api
   ```

4. **Update frontend error handling** using the patterns in `FRONTEND_ERROR_HANDLING.md`

## Files Modified

✅ `src/common/middleware/acl.ts` - Updated authentication/authorization checks  
✅ `src/api/user/userController.ts` - Updated error messages  
✅ `src/api/kiosk/kioskController.ts` - Updated error messages  
✅ `src/api/user/userRouter.ts` - Updated OpenAPI documentation  
✅ `src/api/kiosk/kioskRouter.ts` - Updated OpenAPI documentation  

## Documentation Created

📄 `AUTHENTICATION_VS_AUTHORIZATION.md` - Backend implementation guide  
📄 `FRONTEND_ERROR_HANDLING.md` - Frontend integration guide  
📄 `SUMMARY.md` - This file  

## Testing Checklist

- [ ] Start backend server
- [ ] Test 401: Access protected endpoint without session
- [ ] Test 403: Login with low-privilege account, access restricted endpoint
- [ ] Verify error messages match new patterns
- [ ] Check OpenAPI docs at http://localhost:40001/swagger
- [ ] Regenerate frontend API client
- [ ] Update frontend error handling interceptors
- [ ] Test frontend redirects for 401
- [ ] Test frontend error messages for 403

## Questions?

Refer to:
- Backend details: `AUTHENTICATION_VS_AUTHORIZATION.md`
- Frontend implementation: `FRONTEND_ERROR_HANDLING.md`
- ACL configuration: `src/common/middleware/aclConfig.ts`
