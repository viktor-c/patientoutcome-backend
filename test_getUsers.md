# Manual Testing Guide for getUsers API Changes

This document provides a manual testing guide for the updated `getUsers` functionality.

## Changes Made

1. **Updated Controller**: Modified `getUsers` to filter users by department and role
2. **Updated Service**: Added `findAllFiltered` method to handle department and role filtering
3. **Updated Repository**: Added `findAllFilteredAsync` method for database queries
4. **Updated Router**: Added query parameter validation and documentation
5. **Updated ACL**: Changed from admin-only to authenticated users

## Test Scenarios

### 1. Admin User - All Users
**Endpoint**: `GET /user`
**Login as**: Admin (ewilson - Radiology department)
**Expected**: Should return all 9 users from all departments

### 2. Non-Admin User - Same Department Only
**Endpoint**: `GET /user`
**Login as**: Doctor (bwhite - Oncology department)
**Expected**: Should return only 1 user (bwhite) from Oncology department

### 3. Admin User - Filter by Role
**Endpoint**: `GET /user?role=kiosk`
**Login as**: Admin (ewilson)
**Expected**: Should return 2 kiosk users (kiosk1, kiosk2) from all departments

### 4. Non-Admin User - Filter by Role in Same Department
**Endpoint**: `GET /user?role=kiosk`
**Login as**: Developer (victor - Orthopädie department)
**Expected**: Should return 2 kiosk users (kiosk1, kiosk2) from Orthopädie department only

### 5. Non-Admin User - Filter by Role Not in Department
**Endpoint**: `GET /user?role=kiosk`
**Login as**: Doctor (bwhite - Oncology department)
**Expected**: Should return 404 "No Users found" (no kiosk users in Oncology)

### 6. Unauthenticated User
**Endpoint**: `GET /user`
**No login**
**Expected**: Should return 401 "Unauthorized"

## Mock User Data Reference

| Username | Department  | Role            | ID                       |
| -------- | ----------- | --------------- | ------------------------ |
| student  | UnitTesting | student         | 676336bea497301f6eff8c8d |
| asmith   | Neurology   | mfa             | 676336bea497301f6eff8c8e |
| bwhite   | Orthopädie  | doctor          | 676336bea497301f6eff8c8f |
| cjones   | Pediatrics  | study-nurse     | 676336bea497301f6eff8c90 |
| dlee     | Dermatology | project-manager | 676336bea497301f6eff8c91 |
| ewilson  | Radiology   | admin           | 676336bea497301f6eff8c92 |
| victor   | Orthopädie  | developer       | 676336bea497301f6eff8c94 |
| kiosk1   | Orthopädie  | kiosk           | 676336bea497301f6eff8c95 |
| kiosk2   | Orthopädie  | kiosk           | 676336bea497301f6eff8c96 |

## Testing with curl (if server is running)

```bash
# Login as admin
curl -c cookies.txt -X POST "http://localhost:8080/user/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "ewilson", "password": "password123#124"}'

# Get all users (admin sees all)
curl -b cookies.txt "http://localhost:8080/user"

# Get kiosk users (admin sees all)
curl -b cookies.txt "http://localhost:8080/user?role=kiosk"

# Login as developer
curl -c cookies.txt -X POST "http://localhost:8080/user/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "victor", "password": "password123#124"}'

# Get users in same department
curl -b cookies.txt "http://localhost:8080/user"

# Get kiosk users in same department
curl -b cookies.txt "http://localhost:8080/user?role=kiosk"
```

## Automated Tests

Run the test suite to verify all functionality:

```bash
pnpm test src/api/user/__tests__/userRouter.test.ts
```

All tests should pass, covering the new filtering functionality.
