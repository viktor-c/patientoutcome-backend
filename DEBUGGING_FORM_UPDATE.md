# Debugging Form Update Data Flow

## Purpose
Added comprehensive logging to trace the exact data flow from frontend to backend when updating forms. This will help identify any data nesting or transformation issues.

## Debugging Logs Added

### Frontend (`ReviewFormAnswers.vue`)

**Location**: `saveChanges()` function, before calling `formApi.updateForm()`

**Logs**:
```typescript
console.log('=== FRONTEND: Data being sent to API ===')
console.log('Full payload:', JSON.stringify(updatePayload, null, 2))
console.log('formData.value:', JSON.stringify(formData.value, null, 2))
console.log('updateFormRequest:', JSON.stringify(updatePayload.updateFormRequest, null, 2))
console.log('========================================')
```

**What it shows**:
- The complete payload structure being sent to the API client
- The raw form data (before wrapping)
- The updateFormRequest object structure

### Backend - Router (`formRouter.ts`)

**Location**: Debug middleware before validation, on PUT `/form/:formId`

**Logs**:
```typescript
console.log('=== BACKEND ROUTER: Raw Request ===')
console.log('Method:', req.method)
console.log('URL:', req.url)
console.log('Content-Type:', req.headers['content-type'])
console.log('Raw req.body:', JSON.stringify(req.body, null, 2))
console.log('===================================')
```

**What it shows**:
- The raw HTTP request body as received by Express (after body-parser)
- Content-Type header
- Request method and URL

### Backend - Controller (`formController.ts`)

**Location**: `updateForm()` method, after receiving request

**Logs**:
```typescript
console.log('=== BACKEND CONTROLLER: Received data ===')
console.log('formId:', formId)
console.log('req.body type:', typeof req.body)
console.log('req.body keys:', Object.keys(req.body))
console.log('req.body:', JSON.stringify(req.body, null, 2))
console.log('updatedForm:', JSON.stringify(updatedForm, null, 2))
console.log('=========================================')
```

**What it shows**:
- Form ID from URL params
- Type and structure of req.body
- The data being passed to the service layer

### Backend - Service (`formService.ts`)

**Location 1**: `updateForm()` method, at the beginning

**Logs**:
```typescript
console.log('=== BACKEND SERVICE: Received data ===')
console.log('formId:', formId)
console.log('updatedForm type:', typeof updatedForm)
console.log('updatedForm keys:', Object.keys(updatedForm))
console.log('updatedForm:', JSON.stringify(updatedForm, null, 2))
console.log('updatedForm.formData:', JSON.stringify(updatedForm.formData, null, 2))
console.log('======================================')
```

**Location 2**: After extracting formData

**Logs**:
```typescript
console.log('=== BACKEND SERVICE: After extraction ===')
console.log('formData extracted:', JSON.stringify(formData, null, 2))
console.log('formData type:', typeof formData)
console.log('formData keys:', formData && typeof formData === 'object' ? Object.keys(formData) : 'N/A')
console.log('=========================================')
```

**Location 3**: Before calling repository

**Logs**:
```typescript
console.log('=== BACKEND SERVICE: Final updateData ===')
console.log('updateData:', JSON.stringify(updateData, null, 2))
console.log('updateData.formData:', JSON.stringify(updateData.formData, null, 2))
console.log('=========================================')
```

**What it shows**:
- Data received by the service
- How formData is extracted from updatedForm
- The final data structure being sent to the database

## How to Use

1. **Start the backend server** with the debugging logs
2. **Open the frontend** and navigate to a form
3. **Make changes** to form data
4. **Click Save**
5. **Check the browser console** for frontend logs
6. **Check the backend terminal** for backend logs

## Expected Data Flow

```
FRONTEND formData.value:
{
  "section1": { "q1": "answer1", "q2": "answer2" },
  "section2": { "q3": "answer3" }
}

↓

FRONTEND updatePayload:
{
  "formId": "123...",
  "updateFormRequest": {
    "formData": {
      "section1": { "q1": "answer1", "q2": "answer2" },
      "section2": { "q3": "answer3" }
    }
  }
}

↓

BACKEND req.body (should receive):
{
  "formData": {
    "section1": { "q1": "answer1", "q2": "answer2" },
    "section2": { "q3": "answer3" }
  }
}

↓

BACKEND formData extracted:
{
  "section1": { "q1": "answer1", "q2": "answer2" },
  "section2": { "q3": "answer3" }
}

↓

DATABASE updateData.formData:
{
  "section1": { "q1": "answer1", "q2": "answer2" },
  "section2": { "q3": "answer3" }
}
```

## What to Look For

### Problem Signs:
1. **Double nesting**: `{ body: { formData: { ... } } }` instead of `{ formData: { ... } }`
2. **Extra wrapping**: Data wrapped in unexpected objects
3. **Missing fields**: Expected fields not present at any stage
4. **Type mismatches**: Data changing type (object → string, etc.)

### Common Issues:
- OpenAPI client serialization adding extra layers
- Validation middleware transforming the data
- Service layer extraction logic issues
- Repository serialization problems

## Cleanup

After debugging, you can remove these console.log statements or comment them out to reduce log noise in production.
