# Activity Logging Integration Guide

## Overview
The activity logging system automatically tracks user actions throughout the backend. **Frontend applications should never directly call activity log endpoints**. Instead, logging happens automatically when business events occur in backend services.

## Architecture
- **Frontend** → Backend API endpoints (form, patient, consultation, etc.)
- **Backend Controllers** → Extract user context from session
- **Backend Services** → Execute business logic + log activities via `activityLogService`
- **Activity Log Service** → Broadcasts events to connected SSE clients (admin/developer dashboard)

## Core Pattern

### 1. Service Layer Integration

Add the `activityLogService` import and `UserContext` interface to your service:

```typescript
import { activityLogService } from "@/common/services/activityLogService";

export interface UserContext {
  username?: string;
  userId?: string;
  roles?: string[];
}
```

Update service methods to accept optional `userContext` parameter:

```typescript
async createResource(data: Resource, userContext?: UserContext): Promise<ServiceResponse<Resource | null>> {
  try {
    const newResource = await repository.create(data);
    
    // Log the activity
    if (userContext) {
      activityLogService.log({
        username: userContext.username || "Unknown",
        action: `Created resource: ${newResource.name}`,
        type: "info", // or "formOpen", "formSubmit", etc.
        details: `Resource ID: ${newResource._id}`,
      });
    }
    
    return ServiceResponse.created("Resource created successfully", newResource);
  } catch (error) {
    return ServiceResponse.failure("Error creating resource", null, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}
```

### 2. Controller Layer Integration

Extract user context from Express session and pass to service methods:

```typescript
import type { Request, RequestHandler, Response } from "express";
import { resourceService, type UserContext } from "./resourceService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";

class ResourceController {
  /**
   * Extract user context from session
   */
  private getUserContext(req: Request): UserContext {
    return {
      username: req.session?.username,
      userId: req.session?.userId,
      roles: req.session?.roles,
    };
  }

  public createResource: RequestHandler = async (req: Request, res: Response) => {
    const data = req.body;
    const userContext = this.getUserContext(req);
    const serviceResponse = await resourceService.createResource(data, userContext);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const resourceController = new ResourceController();
```

## Activity Log Types

Available activity types and their typical use cases:

- `"login"` - User authentication events
- `"roleSwitch"` - User switching between roles (clinician/researcher/etc.)
- `"dashboard"` - Dashboard access and navigation
- `"formOpen"` - Form creation or opening for editing
- `"formSubmit"` - Form submission/completion
- `"info"` - General informational events (CRUD operations)
- `"warning"` - Warning-level events
- `"error"` - Error events

## Complete Examples

### Example 1: Patient Service

```typescript
// patientService.ts
import { activityLogService } from "@/common/services/activityLogService";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { StatusCodes } from "http-status-codes";

export interface UserContext {
  username?: string;
  userId?: string;
  roles?: string[];
}

export class PatientService {
  async createPatient(patientData: Patient, userContext?: UserContext): Promise<ServiceResponse<Patient | null>> {
    try {
      const newPatient = await patientRepository.create(patientData);
      
      if (userContext) {
        activityLogService.log({
          username: userContext.username || "Unknown",
          action: `Created patient: ${newPatient.firstName} ${newPatient.lastName}`,
          type: "info",
          details: `Patient ID: ${newPatient._id}, External ID: ${newPatient.externalId}`,
        });
      }
      
      return ServiceResponse.created("Patient created successfully", newPatient);
    } catch (error) {
      return ServiceResponse.failure("Error creating patient", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async updatePatient(id: string, patientData: Partial<Patient>, userContext?: UserContext): Promise<ServiceResponse<Patient | null>> {
    try {
      const updatedPatient = await patientRepository.update(id, patientData);
      
      if (!updatedPatient) {
        return ServiceResponse.failure("Patient not found", null, StatusCodes.NOT_FOUND);
      }
      
      if (userContext) {
        activityLogService.log({
          username: userContext.username || "Unknown",
          action: `Updated patient: ${updatedPatient.firstName} ${updatedPatient.lastName}`,
          type: "info",
          details: `Patient ID: ${id}`,
        });
      }
      
      return ServiceResponse.success("Patient updated successfully", updatedPatient);
    } catch (error) {
      return ServiceResponse.failure("Error updating patient", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async deletePatient(id: string, userContext?: UserContext): Promise<ServiceResponse<Patient | null>> {
    try {
      const deletedPatient = await patientRepository.delete(id);
      
      if (!deletedPatient) {
        return ServiceResponse.failure("Patient not found", null, StatusCodes.NOT_FOUND);
      }
      
      if (userContext) {
        activityLogService.log({
          username: userContext.username || "Unknown",
          action: `Deleted patient: ${deletedPatient.firstName} ${deletedPatient.lastName}`,
          type: "warning",
          details: `Patient ID: ${id}`,
        });
      }
      
      return ServiceResponse.noContent("Patient deleted successfully", null);
    } catch (error) {
      return ServiceResponse.failure("Error deleting patient", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}
```

```typescript
// patientController.ts
import { patientService, type UserContext } from "./patientService";
import type { Request, RequestHandler, Response } from "express";
import { handleServiceResponse } from "@/common/utils/httpHandlers";

class PatientController {
  private getUserContext(req: Request): UserContext {
    return {
      username: req.session?.username,
      userId: req.session?.userId,
      roles: req.session?.roles,
    };
  }

  public createPatient: RequestHandler = async (req: Request, res: Response) => {
    const patientData = req.body;
    const userContext = this.getUserContext(req);
    const serviceResponse = await patientService.createPatient(patientData, userContext);
    return handleServiceResponse(serviceResponse, res);
  };

  public updatePatient: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const patientData = req.body;
    const userContext = this.getUserContext(req);
    const serviceResponse = await patientService.updatePatient(id, patientData, userContext);
    return handleServiceResponse(serviceResponse, res);
  };

  public deletePatient: RequestHandler = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userContext = this.getUserContext(req);
    const serviceResponse = await patientService.deletePatient(id, userContext);
    return handleServiceResponse(serviceResponse, res);
  };
}

export const patientController = new PatientController();
```

### Example 2: Consultation Service

```typescript
// consultationService.ts
import { activityLogService } from "@/common/services/activityLogService";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { StatusCodes } from "http-status-codes";

export interface UserContext {
  username?: string;
  userId?: string;
  roles?: string[];
}

export class ConsultationService {
  async createConsultation(caseId: string, consultationData: Consultation, userContext?: UserContext): Promise<ServiceResponse<Consultation | null>> {
    try {
      const newConsultation = await consultationRepository.create(consultationData);
      
      if (userContext) {
        activityLogService.log({
          username: userContext.username || "Unknown",
          action: `Created consultation for case`,
          type: "info",
          details: `Consultation ID: ${newConsultation._id}, Case ID: ${caseId}`,
        });
      }
      
      return ServiceResponse.created("Consultation created successfully", newConsultation);
    } catch (error) {
      return ServiceResponse.failure("Error creating consultation", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async addNoteToConsultation(consultationId: string, note: Note, userContext?: UserContext): Promise<ServiceResponse<Consultation | null>> {
    try {
      const updatedConsultation = await consultationRepository.addNote(consultationId, note);
      
      if (!updatedConsultation) {
        return ServiceResponse.failure("Consultation not found", null, StatusCodes.NOT_FOUND);
      }
      
      if (userContext) {
        activityLogService.log({
          username: userContext.username || "Unknown",
          action: `Added note to consultation`,
          type: "info",
          details: `Consultation ID: ${consultationId}, Note: ${note.text.substring(0, 50)}...`,
        });
      }
      
      return ServiceResponse.success("Note added successfully", updatedConsultation);
    } catch (error) {
      return ServiceResponse.failure("Error adding note", null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}
```

## Best Practices

### 1. Always Make UserContext Optional
```typescript
async method(data: Data, userContext?: UserContext)
```
This allows the service to work in contexts where session info isn't available (e.g., background jobs, system tasks).

### 2. Provide Meaningful Action Descriptions
```typescript
// ✅ Good
action: `Created patient: ${patient.firstName} ${patient.lastName}`
action: `Submitted MOXFQ form for consultation ${consultationId}`

// ❌ Bad
action: "Created resource"
action: "Updated"
```

### 3. Include Relevant Details
```typescript
details: `Patient ID: ${id}, External ID: ${externalId}, DOB: ${dob}`
```

### 4. Choose Appropriate Activity Types
- Use `"info"` for standard CRUD operations
- Use `"warning"` for deletions or sensitive operations
- Use `"error"` only for actual error conditions
- Use `"formSubmit"` specifically for completed form submissions
- Use `"formOpen"` for form creation or partial updates

### 5. Log at the Right Granularity
- **Do log**: Significant business events (create, update, delete, submit)
- **Don't log**: Read operations (get, list, search) - these would create too much noise
- **Exception**: You may want to log read operations for sensitive data (e.g., accessing patient medical records)

### 6. Handle Missing User Context Gracefully
```typescript
if (userContext) {
  activityLogService.log({
    username: userContext.username || "Unknown",
    action: `Created resource`,
    type: "info",
    details: `Resource ID: ${id}`,
  });
}
```

Always check if `userContext` exists before logging, and provide fallback values for missing fields.

## Testing Activity Logging

When writing tests for services with activity logging:

```typescript
describe("PatientService", () => {
  it("should create patient and log activity", async () => {
    const patientData = { firstName: "John", lastName: "Doe" };
    const userContext = { username: "testuser", userId: "123", roles: ["clinician"] };
    
    const response = await patientService.createPatient(patientData, userContext);
    
    expect(response.success).toBe(true);
    // Activity logging happens automatically, no need to assert on it
    // The activityLogService can be mocked if needed for isolated unit tests
  });
  
  it("should work without user context", async () => {
    const patientData = { firstName: "John", lastName: "Doe" };
    
    const response = await patientService.createPatient(patientData);
    
    expect(response.success).toBe(true);
    // Service should work fine even without user context
  });
});
```

## Migration Checklist

When adding activity logging to an existing service:

- [ ] Import `activityLogService` and define `UserContext` interface
- [ ] Add optional `userContext?: UserContext` parameter to service methods
- [ ] Add `activityLogService.log()` calls after successful operations
- [ ] Create `getUserContext()` helper in controller
- [ ] Update controller methods to extract and pass user context
- [ ] Test that service methods work with and without user context
- [ ] Verify logs appear in the activity log dashboard (for admin/developer roles)

## Frontend Impact

**Important**: After implementing activity logging in the backend:
- **Remove** any frontend code that was calling activity log endpoints directly
- **Remove** imports of activity log API client functions
- The frontend should only interact with business domain endpoints (forms, patients, consultations, etc.)
- Activity logging happens transparently on the backend

## Viewing Activity Logs

Activity logs are only visible to users with `developer` or `admin` roles through:
- **SSE Stream**: `GET /activitylog/stream` - Real-time event stream
- **Recent Logs**: `GET /activitylog/recent?count=50` - Last N logs
- **Stats**: `GET /activitylog/stats` - Connection and log statistics
- **Clear**: `DELETE /activitylog/clear` - Clear all logs (admin only)

These endpoints are for monitoring and debugging only, not for end-user functionality.
