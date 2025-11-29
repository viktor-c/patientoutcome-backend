# User API

The User API provides endpoints for managing users in the patient outcome system.

## New Endpoint: Get All Kiosk Users

### Endpoint
`GET /user/kiosk-users`

### Description
Returns an array of all users in the database with the role "kiosk".

### Access Control
- **Access**: All authenticated users
- **ACL Rule**: `user:get-kiosk` requires `authenticated` role

### Response
```json
{
  "success": true,
  "message": "Kiosk users found",
  "responseObject": [
    {
      "_id": "676336bea497301f6eff8c93",
      "username": "kiosk1",
      "name": "Kiosk Tablet 1",
      "department": "Orthopädie",
      "roles": ["kiosk"],
      "permissions": [],
      "email": "kiosk1@example.com",
      "belongsToCenter": ["1"],
      "lastLogin": "2025-09-04T10:30:00.000Z"
    }
  ]
}
```

### Error Responses
- **401 Unauthorized**: User is not authenticated
- **404 Not Found**: No kiosk users found in the database
- **500 Internal Server Error**: Server-side error occurred

### OpenAPI Documentation
The endpoint is fully documented in the OpenAPI/Swagger specification:
- **Operation ID**: `getAllKioskUsers`
- **Tags**: ["User"]
- **Summary**: "Get all kiosk users"

### Usage Example
```typescript
// Get all kiosk users (requires authentication)
const response = await fetch('/user/kiosk-users', {
  method: 'GET',
  credentials: 'include' // Include session cookie
});

if (response.ok) {
  const data = await response.json();
  const kioskUsers = data.responseObject;
  console.log('Found kiosk users:', kioskUsers);
}
```

### Implementation Details

#### Repository Layer
- **Method**: `findAllByRoleAsync(role: string)`
- **Query**: `userModel.find({ roles: role })`
- **Returns**: Array of users without password field

#### Service Layer  
- **Method**: `getAllKioskUsers()`
- **Validation**: Checks if any kiosk users exist
- **Returns**: ServiceResponse with user array or error

#### Controller Layer
- **Method**: `getAllKioskUsers`
- **HTTP Handler**: Express RequestHandler
- **Response**: Standardized ServiceResponse format

### Testing
The endpoint includes comprehensive tests:
- ✅ Returns kiosk users for authenticated users
- ✅ Works for any authenticated user role  
- ✅ Returns 401 for unauthenticated requests
- ✅ Validates response structure and data integrity

### Integration
This endpoint is commonly used with the Kiosk API to:
1. List available kiosk users for consultation assignment
2. Display kiosk user information in admin interfaces
3. Validate kiosk user IDs before creating kiosk entries
