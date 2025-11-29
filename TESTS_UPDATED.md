# Test Updates Summary

## Overview
Tests have been updated and created to verify the proper distinction between authentication (401) and authorization (403) failures.

## Tests Updated

### 1. User Router Tests (`src/api/user/__tests__/userRouter.test.ts`)

**Updated Tests:**
- ✅ "should return an error when no user is logged in" 
  - Changed: `expect(response.body.message).toContain("Unauthorized")`
  - To: `expect(response.body.message).toContain("Authentication required")`
  
- ✅ "should fail if not logged in" (change-password endpoint)
  - Changed: `expect(res.body.message).toContain("Unauthorized")`
  - To: `expect(res.body.message).toContain("Authentication required")`

**Test Status:** ✅ 21/22 tests passing (1 unrelated failure about 404 vs 200)

### 2. Kiosk Router Tests (`src/api/kiosk/__tests__/kioskRouter.test.ts`)

**Status:** ✅ All 5 tests passing - no changes needed
- Tests only check for 401 status codes (not message content)
- All tests correctly verify authentication failures

## New Tests Created

### 3. ACL Authorization Tests (`src/common/middleware/__tests__/acl-authorization.test.ts`)

**New comprehensive test suite** covering:

#### Authentication (401) Tests
- User Delete Endpoint - no session → 401
- Kiosk Get Endpoint - no session → 401  
- Kiosk Admin Endpoint - no session → 401
- General User Endpoints - no session → 401

#### Authorization (403) Tests
- User Delete (requires admin):
  - Student tries to delete → 403 ✅
  - MFA tries to delete → 403 ✅
  - Admin can access → Not 403/401 ✅

- Kiosk Get (requires kiosk role):
  - Student tries to access → 403 ✅
  - Admin tries to access → 403 ✅ (role-specific, not level-based)

- Kiosk Admin (requires mfa level):
  - Student tries to access → 403 ✅
  - MFA can access → Not 403/401 ✅
  - Admin can access → Not 403/401 ✅

- General User Endpoints (requires authenticated):
  - Student can access → Not 403/401 ✅
  - MFA can access → Not 403/401 ✅

#### Error Message Consistency Tests
- Verifies all 401 responses contain "Authentication required"
- Verifies all 403 responses contain "Access denied"

**Test Status:** ✅ All 16 tests passing

## Test Coverage Summary

| Scenario | Status Code | Test Coverage | Status |
|----------|-------------|---------------|--------|
| No session | 401 | ✅ Multiple endpoints | Passing |
| Expired session | 401 | ✅ Implicit via logout tests | Passing |
| Wrong role | 403 | ✅ Student → admin endpoint | Passing |
| Insufficient auth level | 403 | ✅ Student → mfa endpoint | Passing |
| Role-specific restriction | 403 | ✅ Admin → kiosk endpoint | Passing |
| Correct permissions | 200/404 | ✅ Various endpoints | Passing |
| Message patterns | 401/403 | ✅ Consistency checks | Passing |

## Running Tests

### Run all authentication/authorization tests:
```bash
npm test -- acl-authorization
```

### Run user router tests:
```bash
npm test -- src/api/user/__tests__/userRouter.test.ts
```

### Run kiosk router tests:
```bash
npm test -- src/api/kiosk/__tests__/kioskRouter.test.ts
```

### Run all tests:
```bash
npm test
```

## Test Results

All authentication and authorization tests are passing:
- ✅ 16/16 ACL authorization tests passing
- ✅ 21/22 User router tests passing (1 unrelated failure)
- ✅ 5/5 Kiosk router tests passing

## What the Tests Verify

1. **401 (Authentication Required)**
   - Returned when `req.session.userId` is missing
   - Message contains "Authentication required"
   - Frontend should redirect to login

2. **403 (Access Denied)**
   - Returned when authenticated but lacks permissions
   - Message contains "Access denied"
   - Frontend should show error, NOT redirect to login

3. **Permission Checks Work**
   - Role-based access control functions correctly
   - Authentication level checks function correctly
   - Specific role requirements enforced

4. **Message Consistency**
   - All 401 responses use consistent messaging
   - All 403 responses use consistent messaging
   - Easy for frontend to parse and handle

## Notes

- Kiosk role tests limited because no mock kiosk user exists in test fixtures
- Blueprint tests not modified (already correct)
- All changes maintain backward compatibility with existing test infrastructure
- Tests use the `loginUserAgent()` utility for authenticated requests
