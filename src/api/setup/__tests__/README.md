# Setup Router Tests

## Overview

Comprehensive test suite for the setup API endpoints that validates response structures match the OpenAPI specification.

## Issues Discovered and Fixed

### 1. **HTTP Status Code Mismatch**

- **Issue**: Creating an admin user returned `200 OK` instead of `201 CREATED`
- **Root Cause**: Service used `ServiceResponse.success()` instead of `ServiceResponse.created()`
- **Fix**: Updated `setupService.ts` line 89 to use `ServiceResponse.created()`
- **Impact**: Frontend and OpenAPI spec expected 201, backend returned 200

### 2. **Response Structure Inconsistency**

- **Issue**: Router validation errors used `data` property instead of `responseObject`
- **Root Cause**: Manual JSON construction in router didn't follow ServiceResponse pattern
- **Fix**: Updated `setupRouter.ts` to consistently use `responseObject` property
- **Impact**: Inconsistent response structure for validation errors

### 3. **Collection Name Mismatch**

- **Issue**: Tests expected "cases" collection, actual collection is "patientcases"
- **Root Cause**: MongoDB collection naming convention differs from model name
- **Fix**: Updated test expectations to use "patientcases"
- **Impact**: Stats endpoint validation would fail for case collection

## Test Coverage

### GET /setup/status (2 tests)

- ✅ Returns correct status when no admin exists
- ✅ Returns correct status when admin exists
- Validates: `setupRequired`, `hasAdminUser`, `hasAnyUsers`, `databaseConnected` fields

### POST /setup/create-admin (9 tests)

- ✅ Creates admin with valid data (returns 201 with adminUserId)
- ✅ Returns 409 CONFLICT when admin already exists
- ✅ Returns 409 CONFLICT when username already exists
- ✅ Returns 400 BAD_REQUEST with invalid username (too short)
- ✅ Returns 400 BAD_REQUEST with invalid username characters
- ✅ Returns 400 BAD_REQUEST with weak password
- ✅ Returns 400 BAD_REQUEST with invalid email
- ✅ Returns 400 BAD_REQUEST with missing required fields
- ✅ Uses default values for optional fields (department, belongsToCenter)

### GET /setup/stats (2 tests)

- ✅ Returns database statistics for all major collections
- ✅ All counts are valid non-negative integers

### Response Structure Validation (1 test)

- ✅ All endpoints return proper ServiceResponse structure
- Validates: `success`, `message`, `responseObject`, `statusCode` properties

## ServiceResponse Structure

All endpoints return responses in this format:

```typescript
{
  success: boolean;
  message: string;
  responseObject: T;  // Actual data or null
  statusCode: number; // HTTP status code
}
```

## Running Tests

```bash
# Run all setup tests
pnpm test src/api/setup/__tests__/setupRouter.test.ts

# Run all tests
pnpm test
```

## Key Validations

1. **HTTP Status Codes**: Ensures correct status codes (200, 201, 400, 409, 500)
2. **Response Structure**: Validates ServiceResponse format consistency
3. **Data Types**: Ensures all fields have correct types (boolean, string, number, object)
4. **MongoDB ObjectId Format**: Validates adminUserId follows 24-char hex pattern
5. **Database Integration**: Verifies actual user creation in MongoDB
6. **Error Messages**: Validates meaningful error messages for all failure cases

## Notes

- Tests use the actual MongoDB database (not mocked)
- Each test suite section manages its own database state
- Tests clean up created data in `afterAll` hooks
- Validation errors return `null` (not `undefined`) for responseObject
