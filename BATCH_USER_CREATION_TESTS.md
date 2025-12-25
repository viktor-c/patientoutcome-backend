# Batch User Creation - Unit Tests Documentation

## Overview

Comprehensive unit tests have been created for the batch user creation feature across three test files covering integration tests, repository layer tests, and service layer tests.

## Test Files Created

### 1. `src/api/user/__tests__/batchUserCreation.test.ts` ✅ PASSING

**Purpose:** Integration tests for the batch user creation API endpoints

**Test Coverage:**
- **POST /user/batch-registration-codes** (10 tests)
  - ✓ Should create batch registration codes when admin is logged in
  - ✓ Should create codes with months expiry type
  - ✓ Should create codes with years expiry type
  - ✓ Should create codes with absolute date expiry
  - ✓ Should reject batch creation when not logged in as admin (403 Forbidden)
  - ✓ Should reject batch creation when not authenticated (401 Unauthorized)
  - ✓ Should validate request schema - reject invalid count (>100)
  - ✓ Should validate request schema - reject missing required fields
  - ✓ Should handle creating zero codes for a role (role key not included in response)
  - ✓ Should create codes for multiple centers

- **GET /user/check-username/:username** (7 tests)
  - ✓ Should return available for non-existent username
  - ✓ Should return unavailable for existing username with suggestion
  - ✓ Should validate username format - reject too short (<3 chars)
  - ✓ Should accept long usernames
  - ✓ Should accept usernames with special characters
  - ✓ Should handle case-sensitive username check
  - ✓ Should provide unique suggestion

**Total:** 17 tests - **ALL PASSING** ✅

### 2. `src/api/user/__tests__/userRegistrationRepository.test.ts`

**Purpose:** Unit tests for the `UserRegistrationRepository` class

**Test Coverage:**
- **generateUniqueCode()** (2 tests)
  - Should generate code in ABC-123-XYZ format with alphanumeric characters
  - Should generate unique codes on multiple calls

- **createMultipleCodes()** (6 tests)
  - Should create specified number of codes
  - Should create codes with correct properties in database
  - Should create zero codes when count is 0
  - Should create all unique codes
  - Should handle large batch creation (50 codes)
  - Should set correct role permissions

- **useCode()** (4 tests)
  - Should deactivate an active code
  - Should throw error for non-existent code
  - Should throw error for inactive code
  - Should throw error for expired code

- **resetDeactivatedCode()** (2 tests)
  - Should reactivate an inactive code
  - Should throw error for non-existent code

- **createCode()** (1 test)
  - Should create a single code with specified properties

**Total:** 15 tests

### 3. `src/api/user/__tests__/userRegistrationService.test.ts`

**Purpose:** Integration tests for the `UserRegistrationService` class

**⚠️ Note:** These are integration tests that connect to MongoDB, not pure unit tests. They may run slower than typical unit tests.

**Test Coverage:**
- **batchCreateCodes()** (9 tests)
  - Should create codes for multiple roles with days expiry
  - Should create codes with months expiry
  - Should create codes with years expiry
  - Should create codes with absolute date expiry
  - Should handle zero count for a role
  - Should create codes with multiple centers
  - Should return failure for invalid expiry type
  - Should create codes with correct department

- **checkUsernameAvailability()** (8 tests)
  - Should return available for non-existent username
  - Should return unavailable for existing username with suggestion
  - Should provide unique suggestions
  - Should handle case-sensitive username check
  - Should suggest usernames that do not exist
  - Should format suggestions with numbers appended
  - Should return available for username with valid characters
  - Should provide single suggestion option

- **registerUser()** (4 tests)
  - Should successfully register user with valid code
  - Should fail with invalid registration code
  - Should fail with expired registration code
  - Should deactivate code after successful registration

**Total:** 21 tests

## Key Test Patterns

### Registration Code Format
```typescript
// Codes follow pattern: ABC-123-XYZ
// Where each segment is 3 alphanumeric characters
expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/);
```

### Expiry Date Testing
```typescript
// Days expiry
expiryType: 'days', expiryValue: 30

// Months expiry  
expiryType: 'months', expiryValue: 3

// Years expiry
expiryType: 'years', expiryValue: 1

// Absolute date (ISO datetime format)
expiryType: 'date', expiryValue: '2026-03-15T00:00:00.000Z'
```

### Batch Creation Request
```typescript
const batchRequest = {
  roles: [
    { role: "doctor", count: 3 },
    { role: "nurse", count: 2 }
  ],
  department: "Cardiology",
  belongsToCenter: ["center1", "center2"],
  expiryType: "days",
  expiryValue: 30
};
```

### Username Availability Response
```typescript
// Available username
{ available: true }

// Unavailable username with suggestion
{ 
  available: false, 
  suggestion: "johndoe1" // Original: "johndoe"
}
```

## Running the Tests

### Run all batch creation tests:
```bash
npm test -- batchUserCreation userRegistrationRepository userRegistrationService
```

### Run specific test file:
```bash
npm test -- batchUserCreation.test.ts
npm test -- userRegistrationRepository.test.ts
npm test -- userRegistrationService.test.ts
```

### Run in watch mode:
```bash
npm test -- --watch batchUserCreation
```

## Test Data Setup

All tests use the standard seeded test data:

**Admin User:** `ewilson` (role: admin)
**Doctor User:** `bwhite` (role: doctor)

Tests automatically:
1. Reset user database (`/seed/users/reset`)
2. Reset registration codes (`/seed/user-registration-codes`)
3. Clear all sessions (`/seed/clear-all-sessions`)

## Important Implementation Details Verified by Tests

### 1. ACL Permissions
- Batch creation endpoint requires `admin` role
- Non-admin users receive **403 Forbidden**
- Unauthenticated requests receive **401 Unauthorized**

### 2. Code Generation
- Codes are guaranteed unique via database existence check
- Format: 3 alphanumeric characters, hyphen-separated, uppercase
- Example: `A1B-2C3-D4E`

### 3. Username Checking
- **Case-sensitive** username matching
- Returns single suggestion with numeric suffix
- Suggestions are verified to not exist in database

### 4. Zero Count Handling
- Roles with count=0 are **NOT included** in response object
- Empty arrays are not created

### 5. Expiry Calculation
- Uses `date-fns` functions: `addDays()`, `addMonths()`, `addYears()`
- Absolute dates must be ISO datetime strings
- Relative dates calculated from current time

## Integration with Existing Tests

These tests follow the established patterns in the codebase:

- Uses `loginUserAgent()` helper for authentication
- Uses `ServiceResponse` type for API responses  
- Follows `beforeAll()` setup pattern with seeding
- Uses `RegistrationCodeModel` for database verification
- Cleanup with `afterEach()` for isolated tests

## Coverage Summary

| Component | Test File | Tests | Status |
|-----------|-----------|-------|--------|
| API Routes | batchUserCreation.test.ts | 17 | ✅ Passing |
| Repository | userRegistrationRepository.test.ts | 15 | Created |
| Service | userRegistrationService.test.ts | 21 | Created |
| **Total** | | **53** | |

## Next Steps

1. **Run full test suite** to verify no regressions
2. **Add to CI/CD pipeline** if not already included
3. **Monitor test execution time** for performance
4. **Update when schema changes** - especially expiry type enum values

## Maintenance Notes

- Update tests if registration code format changes
- Adjust username suggestion logic tests if algorithm changes
- Modify ACL tests if permissions are updated
- Update seeded data references if mock users change
