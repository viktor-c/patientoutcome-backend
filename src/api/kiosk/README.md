# Kiosk API

The Kiosk API provides endpoints for managing kiosk user consultations in the patient outcome system.

## Overview

The Kiosk API follows the established patterns in the codebase with:
- **Model**: Zod validation schemas, TypeScript interfaces, and Mongoose models
- **Repository**: Data access layer with CRUD operations
- **Service**: Business logic layer
- **Controller**: HTTP request/response handling
- **Router**: Route definitions with OpenAPI documentation and ACL protection

## Model Structure

The Kiosk model represents a relationship between a kiosk user and their active consultation:

```typescript
{
  _id: ObjectId,
  consultationId: ObjectId, // Reference to Consultation
  kioskUserId: ObjectId,    // Reference to User with 'kiosk' role
}
```

**Note**: Forms are not stored in the Kiosk model to avoid data synchronization issues. When forms are needed, they should be retrieved through the Consultation API using the `consultationId`.

## API Endpoints

### 1. Get Consultation (Kiosk User)
- **Endpoint**: `GET /kiosk/consultation`
- **Access**: Only users with 'kiosk' role
- **Description**: Returns the current active consultation for the logged-in kiosk user
- **Authentication**: Requires valid session with kiosk role

### 2. Update Consultation Status (Kiosk User)
- **Endpoint**: `PUT /kiosk/consultation/status`
- **Access**: Only users with 'kiosk' role
- **Description**: Updates the consultation status for the current logged-in kiosk user
- **Request Body**:
  ```json
  {
    "status": "pending" | "in-progress" | "completed" | "cancelled",
    "notes": "Optional status update notes"
  }
  ```
- **Authentication**: Requires valid session with kiosk role

### 3. Get Consultation For Specific User (Admin/MFA)
- **Endpoint**: `GET /kiosk/{kioskUserId}/consultation`
- **Access**: Users with at least 'mfa' role
- **Description**: Returns the active consultation for the specified kiosk user
- **Parameters**: 
  - `kioskUserId`: The ID of the kiosk user
- **Authentication**: Requires valid session with at least mfa role

### 4. Delete Consultation For Specific User (Admin/MFA)
- **Endpoint**: `DELETE /kiosk/{kioskUserId}/consultation`
- **Access**: Users with at least 'mfa' role
- **Description**: Unlinks the consultation for the specified kiosk user (does not delete the consultation itself)
- **Parameters**: 
  - `kioskUserId`: The ID of the kiosk user
- **Authentication**: Requires valid session with at least mfa role

### 5. Set Consultation For Specific User (Admin/MFA)
- **Endpoint**: `POST /kiosk/{kioskUserId}/consultation/{consultationId}`
- **Access**: Users with at least 'mfa' role
- **Description**: Creates or updates a kiosk entry linking the specified user to a consultation
- **Parameters**: 
  - `kioskUserId`: The ID of the kiosk user
  - `consultationId`: The ID of the consultation to link
- **Authentication**: Requires valid session with at least mfa role
- **Behavior**: 
  - If kiosk entry doesn't exist: Creates new entry
  - If kiosk entry already exists: Updates the consultation link

## Access Control

The API uses the ACL (Access Control List) system with the following permissions:

- **kiosk:get**: Only users with 'kiosk' role can get their own consultation
- **kiosk:put**: Only users with 'kiosk' role can update their consultation status
- **kiosk:get-for**: Users with at least 'mfa' role can get consultation for any kiosk user
- **kiosk:delete-for**: Users with at least 'mfa' role can unlink consultation for any kiosk user
- **kiosk:set-consultation**: Users with at least 'mfa' role can set/link consultation for any kiosk user

## Role Hierarchy

```
developer (1000) > admin (800) > project-manager (500) > study-nurse (200) > doctor (100) > mfa (50) > kiosk (25) = student (25) > authenticated (1) > anonymous (0)
```

## Error Responses

All endpoints return standardized error responses:

- **401 Unauthorized**: Invalid session or insufficient permissions
- **404 Not Found**: Resource not found (consultation, kiosk, etc.)
- **400 Bad Request**: Validation errors
- **500 Internal Server Error**: Server-side errors

## OpenAPI Documentation

The API is fully documented using OpenAPI/Swagger specifications. Access the documentation at `/openapi` when the server is running.

## Testing

Basic tests are included in the `__tests__` directory to verify:
- Unauthorized access returns 401
- Route parameter validation
- ACL permission enforcement

## Usage Example

```typescript
// Get current consultation (as kiosk user)
const response = await fetch('/kiosk/consultation', {
  method: 'GET',
  credentials: 'include' // Include session cookie
});

// Update consultation status (as kiosk user)
const updateResponse = await fetch('/kiosk/consultation/status', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    status: 'completed',
    notes: 'Patient has completed all forms'
  })
});

// Get consultation for specific user (as admin/mfa)
const adminResponse = await fetch('/kiosk/user123/consultation', {
  method: 'GET',
  credentials: 'include'
});

// Set consultation for specific user (as admin/mfa)
const setResponse = await fetch('/kiosk/user123/consultation/consultation456', {
  method: 'POST',
  credentials: 'include'
});
```
