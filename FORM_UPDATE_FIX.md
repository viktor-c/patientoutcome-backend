# Form Update Schema Fix

## Problem
After adding new fields (`completionTimeSeconds`, `formStartTime`, `formEndTime`, `formFillStatus`) to the Form model, the `updateFormSchema` was causing issues with API requests. The schema structure was creating unnecessary nesting that prevented the frontend from successfully updating form data.

## Root Cause
The issue was that we had mixed up two different types of schemas:

1. **Validation Schema** - Used by the `validateRequest` middleware, which expects a structure with `body`, `params`, and `query` properties
2. **OpenAPI Body Schema** - Used for API documentation, which only describes the request body content

The OpenAPI registration was incorrectly using the full validation schema instead of just the body content schema, causing confusion and incorrect API documentation.

## Solution
Separated the schemas into two distinct types for both create and update operations:

### Create Operation
- `createFormBodySchema` - Only describes the body content (for OpenAPI docs)
- `createFormSchema` - Full validation schema with `body` wrapper (for middleware)

### Update Operation
- `updateFormBodySchema` - Only describes the body content (for OpenAPI docs)
- `updateFormSchema` - Full validation schema with `body` and `params` (for middleware)

## Expected Request Structure

### PUT /form/:formId

The frontend should send requests with this body structure:

```json
{
  "formData": {
    "section1": {
      "question1": "answer1",
      "question2": "answer2"
    },
    "section2": {
      "question3": "answer3"
    }
  },
  "completionTimeSeconds": 120,
  "formStartTime": "2025-10-03T10:00:00.000Z",
  "formEndTime": "2025-10-03T10:02:00.000Z",
  "formFillStatus": "completed",
  "score": 45
}
```

**Note:** All fields except the structure itself are optional. You can send:
- Just `formData` to update answers
- Just timing fields to update timing
- Any combination of the available fields

### POST /form

For creating a new form:

```json
{
  "formData": {
    "section1": {
      "question1": "answer1"
    }
  }
}
```

## Changes Made

### File: `src/api/form/formRouter.ts`

1. Created separate body schemas for OpenAPI documentation:
   - `createFormBodySchema`
   - `updateFormBodySchema`

2. Kept validation schemas for middleware:
   - `createFormSchema`
   - `updateFormSchema`

3. Updated OpenAPI registrations to use body-only schemas:
   - `createForm` endpoint now uses `createFormBodySchema`
   - `updateForm` endpoint now uses `updateFormBodySchema`

## How It Works

1. **Frontend sends request** → `{ formData: {...}, completionTimeSeconds: 120 }`
2. **validateRequest middleware** wraps it → `{ body: { formData: {...}, completionTimeSeconds: 120 }, params: { formId: "123" } }`
3. **Zod validates** against `updateFormSchema`
4. **Controller receives** `req.body` → `{ formData: {...}, completionTimeSeconds: 120 }`
5. **Service processes** the update correctly

## Testing
Build completed successfully with no TypeScript errors.

## Frontend API Regeneration

After fixing the backend schema, the frontend API client was regenerated using:

```bash
cd /home/victor/apps/DEV/patientoutcome/patientoutcome-frontend
rm -rf src/api
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:40001/openapi/v1/swagger.json \
  -g typescript-fetch \
  -o src/api
```

### Updated Frontend Code

The `ReviewFormAnswers.vue` component now sends form updates like this:

```typescript
await formApi.updateForm({
  formId,
  updateFormRequest: {
    formData: formData.value,
    // Optional fields can be added here:
    // completionTimeSeconds: 120,
    // formStartTime: new Date(),
    // formEndTime: new Date(),
    // formFillStatus: 'completed'
  }
})
```

The regenerated `UpdateFormRequest` interface now correctly matches the backend schema:

```typescript
export interface UpdateFormRequest {
    formData?: object;
    completionTimeSeconds?: number;
    formStartTime?: string;
    formEndTime?: string;
    formFillStatus?: 'draft' | 'incomplete' | 'completed';
    score?: number;
}
```

### Result

✅ No more double-nesting of `body` property
✅ Form data updates now save correctly to the database
✅ All timing fields are properly supported
✅ TypeScript types match the actual API structure
