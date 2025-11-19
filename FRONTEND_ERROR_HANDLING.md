# Frontend Error Handling Guide

## Quick Reference for Frontend Developers

When making API calls, you'll now receive different status codes for authentication vs authorization failures:

### Status Code Overview

| Status | Name | Meaning | Frontend Action |
|--------|------|---------|----------------|
| **401** | Unauthorized | Session expired or user not logged in | Redirect to login page, clear auth state |
| **403** | Forbidden | User is logged in but lacks permissions | Show error message, DO NOT redirect to login |

## Implementation Examples

### React/TypeScript Example

```typescript
async function fetchData(url: string) {
  try {
    const response = await fetch(url, {
      credentials: 'include', // Important for session cookies
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Session expired or not logged in
        // Clear any local auth state
        localStorage.removeItem('user');
        
        // Redirect to login
        window.location.href = '/login';
        
        // Or with React Router:
        // navigate('/login', { state: { from: location.pathname } });
        
        throw new Error('Session expired. Please log in again.');
      }
      
      if (response.status === 403) {
        // Authenticated but lacks permissions
        const data = await response.json();
        
        // Show user-friendly error
        toast.error(data.message || 'You do not have permission to access this resource');
        
        // Optionally log for debugging
        console.warn('Access denied:', data.message);
        
        throw new Error('Access denied');
      }
      
      // Handle other errors...
    }
    
    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### Axios Interceptor Example

```typescript
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:40001',
  withCredentials: true, // Important for session cookies
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired - redirect to login
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Access denied - show error but stay on page
      const message = error.response.data?.message || 'Access denied';
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Fetch Wrapper Example

```typescript
class ApiClient {
  private baseUrl = 'http://localhost:40001';
  
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (response.status === 401) {
      // Clear auth state and redirect
      this.handleAuthenticationRequired();
      throw new Error('Authentication required');
    }
    
    if (response.status === 403) {
      const data = await response.json();
      throw new ForbiddenError(data.message);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  private handleAuthenticationRequired() {
    // Clear any stored auth data
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?returnUrl=${returnUrl}`;
  }
}

// Custom error class for 403 responses
class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
```

## Backend Error Message Patterns

The backend now uses consistent error message patterns:

### 401 Messages (Authentication Required)
- `"Authentication required: No active session"`
- `"Authentication required: Not logged in"`
- `"Authentication required: User id not found in session"`

**Frontend Response:** Redirect to login page

### 403 Messages (Access Denied)
- `"Access denied: Insufficient role permissions"`
- `"Access denied: Insufficient permissions"`
- `"Access denied: Insufficient authentication level"`

**Frontend Response:** Show error message, stay on current page

## Testing Your Implementation

### Test Case 1: Expired Session (401)
```bash
# Make request without valid session cookie
curl -X GET http://localhost:40001/api/user

# Expected: 401 with message containing "Authentication required"
```

### Test Case 2: Insufficient Permissions (403)
```bash
# Login as student user, then try to access admin endpoint
curl -X GET http://localhost:40001/api/admin/users \
  -H "Cookie: connect.sid=<student-session-cookie>"

# Expected: 403 with message containing "Access denied"
```

## User Experience Best Practices

### For 401 (Session Expired)
1. Clear all local authentication state
2. Show brief notification: "Your session has expired"
3. Redirect to login page
4. Optionally save the intended destination URL for redirect after login

```typescript
// Save return URL
const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
navigate(`/login?returnUrl=${returnUrl}`);

// After login, redirect back
const params = new URLSearchParams(window.location.search);
const returnUrl = params.get('returnUrl') || '/dashboard';
navigate(returnUrl);
```

### For 403 (Access Denied)
1. DO NOT clear authentication state
2. DO NOT redirect to login
3. Show clear error message explaining the permission issue
4. Optionally provide a "Contact Admin" link
5. Optionally show what permission/role is required

```typescript
if (error.response?.status === 403) {
  const message = error.response.data?.message || 'Access denied';
  
  toast.error(
    <div>
      <strong>Access Denied</strong>
      <p>{message}</p>
      <a href="/contact">Contact administrator</a>
    </div>,
    { duration: 5000 }
  );
}
```

## Regenerating API Client

After these backend changes, regenerate your frontend API client:

```bash
cd frontend
rm -rf src/api
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:40001/openapi/v1/swagger.json \
  -g typescript-fetch \
  -o src/api
```

The generated client will now properly document both 401 and 403 responses in the TypeScript types.

## Summary

✅ **DO** redirect to login on 401  
❌ **DON'T** redirect to login on 403  
✅ **DO** show helpful error messages for 403  
✅ **DO** clear auth state on 401  
❌ **DON'T** clear auth state on 403  
