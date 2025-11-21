# Statistics Schema Update Summary

## Overview
Updated the statistics API to properly reflect the consultation data structure with full scoring information and metadata.

## Changes Made

### 1. Created `statisticsModel.ts`
A new model file was created with properly typed Zod schemas:

- **`SubscaleScoreSchema`**: Represents a single subscale score (e.g., Walking & Standing, Pain)
- **`ScoringDataSchema`**: The complete scoring structure including rawData, subscales, and total
- **`ConsultationWithScoresSchema`**: New consultation schema with the following fields:
  - `_id`: Consultation MongoDB ObjectId
  - `caseId`: Patient case reference
  - `consultationId`: Same as _id (kept for clarity)
  - `createdAt`: When the consultation was created
  - `completedAt`: When the consultation was completed (nullable)
  - `completionTimeSeconds`: Time taken to complete in seconds (nullable)
  - `title`: Consultation title (derived from form title)
  - `scoring`: Object containing full ScoringData for each form type (aofas, efas, moxfq)

- **`CaseStatisticsSchema`**: Response schema containing:
  - `totalConsultations`: Number of consultations
  - `caseId`: Patient case ID
  - `consultations`: Array of ConsultationWithScores

- **`ScoreDataPointSchema`** and **`ScoreDataResponseSchema`**: For chart data

### 2. Updated `statisticsRouter.ts`
- Removed inline schema definitions
- Imported schemas from `statisticsModel.ts`
- Registered all schemas with OpenAPI registry:
  - `SubscaleScore`
  - `ScoringData`
  - `ConsultationWithScores`
  - `CaseStatistics`
  - `ScoreDataPoint`
  - `ScoreDataResponse`

### 3. Updated `statisticsService.ts`
- Removed old inline interfaces (`ConsultationStats`, `ScoreData`)
- Updated `getCaseStatistics()` to return `ServiceResponse<CaseStatistics | null>`
- Enhanced consultation processing to include:
  - Full `ScoringData` object for each form type (not just the score number)
  - `createdAt` from form creation date
  - `completedAt` from form completion date
  - `completionTimeSeconds` calculated from form creation and completion times
  - `title` derived from form title
  - Proper typing of the `scoring` object
  
- Updated `getScoreData()` to:
  - Return `ServiceResponse<ScoreDataResponse | null>`
  - Extract scores from `consultation.scoring?.aofas?.total?.normalizedScore` instead of simple score values
  - Use `createdAt` instead of `dateAndTime` for consistency

## Type Safety Improvements

The new schema structure provides complete type safety for:
- All scoring data including subscales and total scores
- Consultation metadata (creation, completion, timing)
- Proper nullability handling for optional fields

## API Response Structure

### Before
```typescript
{
  totalConsultations: number,
  caseId: string,
  consultations: [{
    _id: string,
    dateAndTime: Date,
    reasonForConsultation: string[],
    kioskId?: string,
    forms: {
      aofas?: { score: number, formId: string }
      // ...
    }
  }]
}
```

### After
```typescript
{
  totalConsultations: number,
  caseId: string,
  consultations: [{
    _id: ObjectId,
    caseId: ObjectId,
    consultationId: ObjectId,
    createdAt: Date,
    completedAt?: Date | null,
    completionTimeSeconds?: number | null,
    title: string,
    scoring?: {
      aofas?: ScoringData | null,
      efas?: ScoringData | null,
      moxfq?: ScoringData | null
    }
  }]
}
```

Where `ScoringData` includes:
```typescript
{
  rawData: { [section]: { [question]: value } } | null,
  subscales: {
    [subscaleName]: {
      name: string,
      description?: string | null,
      rawScore: number,
      normalizedScore: number,
      maxPossibleScore: number,
      answeredQuestions: number,
      totalQuestions: number,
      completionPercentage: number,
      isComplete: boolean
    } | null
  },
  total: SubscaleScore | null
}
```

## Next Steps

1. **Regenerate Frontend API Client**: Run the following command in your frontend project:
   ```bash
   cd frontend && rm -rf src/api && npx @openapitools/openapi-generator-cli generate -i http://localhost:40001/openapi/v1/swagger.json -g typescript-fetch -o src/api
   ```

2. **Update Frontend Code**: The frontend will now have access to:
   - Complete scoring data for all forms
   - Consultation timing metadata
   - Properly typed subscale information

3. **Test the Changes**: Verify that:
   - The API returns the correct structure
   - Frontend can access all scoring fields
   - Charts display correctly with the new score extraction path

## Build Status
✅ Backend builds successfully with no errors
