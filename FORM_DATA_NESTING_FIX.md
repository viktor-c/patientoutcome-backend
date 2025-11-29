# Form Data Nesting Issue - Root Cause and Fix

## Problem Discovered

Through debugging logs, we discovered that `formData.value` in the frontend contained a malformed structure with both:

1. **Nested old data**: `body.formData.standardfragebogen` (with values like 3, 4, 2, 1)
2. **Direct new data**: `standardfragebogen` (with all 1s from user input)

```json
{
  "body": {
    "formData": {
      "standardfragebogen": { "q1": 3, "q2": 4, ... },  // OLD
      "sportfragebogen": { ... }
    }
  },
  "standardfragebogen": { "q1": 1, "q2": 1, ... },      // NEW
  "sportfragebogen": { ... }
}
```

## Root Cause

This was a **vicious cycle**:

1. **Old corrupted data in database** (from previous incorrect saves)
2. **Frontend loads form** → `formData.value` gets the corrupted nested structure
3. **User makes changes** → JsonForms adds changes as direct properties
4. **Save combines both** → creates the double-nested structure
5. **Saves to database** → perpetuates the corruption

## Fixes Applied

### 1. Frontend Fix (`ReviewFormAnswers.vue`)

**Location**: `onMounted()` when loading form data

**What it does**: Unwraps any `body.formData` nesting when loading a form

```typescript
// Check if formData has a 'body' wrapper (from old corrupted data)
if (initialFormData && typeof initialFormData === 'object' && 'body' in initialFormData) {
  console.warn('⚠️  Detected nested body structure in loaded form data, unwrapping...')
  const nestedData = initialFormData as Record<string, unknown>
  const bodyContent = nestedData.body
  if (bodyContent && typeof bodyContent === 'object' && 'formData' in bodyContent) {
    // Use body.formData as the actual form data
    const bodyRecord = bodyContent as Record<string, unknown>
    initialFormData = bodyRecord.formData as formData
  } else if (bodyContent) {
    // Use body directly
    initialFormData = bodyContent as formData
  }
}
```

**Result**: Even if the database contains corrupted data, the frontend will unwrap it before displaying.

### 2. Backend Fix (`formService.ts`)

**Location**: `updateForm()` method - data extraction logic

**What it does**: 
1. Detects and unwraps any `body.formData` nesting in the incoming request
2. Removes the `body` wrapper before saving to database

```typescript
// Handle the case where the client sends { body: { formData: {...} } }
let formData: any;

if (updatedForm.formData) {
  // Check if formData has a 'body' wrapper (incorrect structure)
  if (typeof updatedForm.formData === 'object' && 'body' in updatedForm.formData) {
    const nested = (updatedForm.formData as any).body;
    formData = nested?.formData || nested;
    console.log('⚠️  WARNING: Detected nested body structure in formData');
  } else {
    formData = updatedForm.formData;
  }
} else {
  formData = updatedForm;
}

// ... later when saving ...

// Ensure we're not including the malformed 'body' wrapper
if ('body' in formData) {
  console.log('⚠️  WARNING: Removing body wrapper from formData before saving');
  const { body, ...cleanFormData } = formData;
  updateData.formData = Object.keys(cleanFormData).length > 0 
    ? cleanFormData 
    : (body?.formData || body);
} else {
  updateData.formData = formData;
}
```

**Result**: Even if corrupted data is sent, the backend will clean it before saving.

## Expected Data Flow (After Fix)

```
DATABASE (old corrupted):
{
  "body": { "formData": { "q1": 3, "q2": 4 } },
  "q1": 1, "q2": 1
}

↓ LOAD ↓

FRONTEND (unwraps on load):
{
  "q1": 3, "q2": 4  // Extracted from body.formData
}

↓ USER EDITS ↓

FRONTEND (user changes to all 1s):
{
  "q1": 1, "q2": 1
}

↓ SAVE ↓

BACKEND (cleans any nesting):
{
  "q1": 1, "q2": 1  // Clean structure
}

↓ DATABASE (saved correctly):
{
  "q1": 1, "q2": 1  // No nesting!
}
```

## Testing

1. **Restart both servers** (frontend and backend need to reload the changes)
2. **Open an existing form** with corrupted data
   - Frontend should log: `⚠️  Detected nested body structure in loaded form data, unwrapping...`
   - Form should display correctly
3. **Make changes** to the form
4. **Save the form**
   - Backend should log warnings if it detects nesting
   - Data should be saved with clean structure
5. **Reload the form**
   - Should load without the unwrapping warning (data is now clean)

## Cleanup Existing Data

Forms that have already been saved with corrupted data will be automatically fixed when:
1. They are loaded (frontend unwraps)
2. User makes ANY change
3. Form is saved (backend cleans and saves correctly)

Alternatively, you could run a migration script to clean all existing forms in the database.

## Prevention

The root cause was the mismatch between:
- OpenAPI schema definition
- Frontend API client generation  
- Backend validation

This has been addressed by:
1. Properly separating body-only schemas from full validation schemas
2. Regenerating the frontend API client
3. Adding defensive code to handle legacy corrupted data

## Status

✅ Frontend fix applied - unwraps on load
✅ Backend fix applied - cleans on save  
✅ Backend built successfully
⏳ Requires server restart to take effect
⏳ Requires testing with real form data
