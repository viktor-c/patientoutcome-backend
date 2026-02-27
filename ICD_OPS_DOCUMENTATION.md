# ICD-10-GM / OPS Classification Search

> Searchable ICD-10-GM 2026 (German Modification) and OPS 2026 (Operationen- und Prozedurenschlüssel) classification codes with paginated API, in-memory backend cache, and localStorage frontend cache.

## Architecture Overview

```
┌─────────────────────────────┐     ┌─────────────────────────────────┐
│        FRONTEND             │     │           BACKEND               │
│                             │     │                                 │
│  IcdOpsSearchField.vue      │     │  icdopsRouter.ts                │
│    ↕ v-model                │     │    ↓                            │
│  useIcdOpsSearch composable │←───→│  icdopsController.ts            │
│    ↕                        │     │    ↓                            │
│  icdopsService.ts           │     │  icdopsService.ts (in-memory)   │
│    ↕ localStorage cache     │     │    ↓                            │
│                             │     │  icdopsClamlParser.ts           │
│                             │     │    ↓                            │
│                             │     │  XML ClaML files                │
└─────────────────────────────┘     └─────────────────────────────────┘
```

## Backend

### Data Source

The BfArM ClaML 2.0 XML files are stored in `src/ICD-OPS/`:
- **ICD-10-GM 2026**: `icd10gm2026syst-claml/Klassifikationsdateien/icd10gm2026syst_claml_20250912.xml` (~12,600 entries)
- **OPS 2026**: `ops2026syst-claml/Klassifikationsdateien/ops2026syst_claml_20251017.xml` (~19,900 entries)

### In-Memory Cache

At startup, both XML files are parsed and stored as flat arrays of `{ code, label, kind }` objects in memory. This takes ~800ms for ICD and ~500ms for OPS (one-time cost).

**Graceful degradation**: If XML parsing fails (e.g. files missing), the service logs an error and continues with empty datasets. The backend does NOT crash. The frontend can still use its local cache.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/icdops/icd/search?q=&page=&limit=&kind=` | Search ICD-10 codes |
| `GET` | `/icdops/ops/search?q=&page=&limit=&kind=` | Search OPS codes |
| `GET` | `/icdops/icd/status` | ICD data load status |
| `GET` | `/icdops/ops/status` | OPS data load status |

#### Query Parameters (search)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | (required) | Search term – matches code and label (case-insensitive) |
| `page` | number | 1 | Page number (1-based) |
| `limit` | number | 10 | Items per page (max 50) |
| `kind` | string | `category` | Filter: `chapter`, `block`, `category`, or `all` |

#### Response Format

```json
{
  "success": true,
  "message": "Found 42 ICD entries matching \"Cholera\"",
  "responseObject": {
    "items": [
      { "code": "A00", "label": "Cholera", "kind": "category" },
      { "code": "A00.0", "label": "Cholera durch Vibrio cholerae O:1, Biovar cholerae", "kind": "category" }
    ],
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "version": "2026",
    "type": "icd"
  },
  "statusCode": 200
}
```

### Files

| File | Purpose |
|------|---------|
| `src/api/icdops/icdopsModel.ts` | Zod schemas for entries, pagination, and query validation |
| `src/api/icdops/icdopsClamlParser.ts` | XML parser for BfArM ClaML 2.0 format |
| `src/api/icdops/icdopsService.ts` | In-memory data store with search and pagination |
| `src/api/icdops/icdopsController.ts` | Express request handlers |
| `src/api/icdops/icdopsRouter.ts` | Express routes + OpenAPI registry |
| `src/api/icdops/__tests__/` | Unit and integration tests (32 tests) |

## Frontend

### Service Layer (`src/services/icdopsService.ts`)

Handles API communication and **localStorage caching**:

- **Cache key**: Derived from `type + query + page + limit + kind`
- **Cache TTL**: 6 months
- **Year boundary**: If cache was populated in a previous calendar year, it's considered stale
- **Prefetch**: When querying page 1 with an invalid cache, page 2 is automatically fetched in the background
- **Stale fallback**: If the backend is unreachable, stale cache entries are returned instead of empty results

```typescript
import { searchIcd, searchOps, clearIcdOpsCache } from '@/services/icdopsService'

const result = await searchIcd({ query: 'Cholera', page: 1, limit: 10 })
console.log(result.items) // [{ code: 'A00', label: 'Cholera', kind: 'category' }, ...]
```

### Composable (`src/composables/useIcdOpsSearch.ts`)

Vue 3 composable providing reactive search state with debouncing and infinite scroll:

```typescript
import { useIcdOpsSearch } from '@/composables/useIcdOpsSearch'

const { query, items, loading, error, hasMore, loadMore, search, clear } = useIcdOpsSearch('icd', {
  limit: 10,
  kind: 'category',
  debounceMs: 300,
  minChars: 1,
})
```

### Component (`src/components/icdops/IcdOpsSearchField.vue`)

Drop-in Vuetify `v-autocomplete` wrapper supporting both single and multiple selection:

```vue
<template>
  <!-- Single selection -->
  <IcdOpsSearchField
    v-model="selectedDiagnosis"
    type="icd"
    label="Diagnosis (ICD-10)"
    placeholder="Search by code or name…"
  />

  <!-- Multiple selection with chips -->
  <IcdOpsSearchField
    v-model="diagnosisCodes"
    type="icd"
    label="Main Diagnosis ICD-10"
    multiple
    chips
    closable-chips
    return-object
  />

  <IcdOpsSearchField
    v-model="selectedProcedure"
    type="ops"
    label="Procedure (OPS)"
    placeholder="Search by code or name…"
  />
</template>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'icd' \| 'ops'` | (required) | Which classification to search |
| `modelValue` | `string \| string[] \| IcdOpsEntry \| IcdOpsEntry[] \| null` | `null` | v-model binding (code string(s) or full object(s)) |
| `label` | `string` | `''` | Input label |
| `placeholder` | `string` | `''` | Placeholder text |
| `returnObject` | `boolean` | `false` | Return `{ code, label, kind }` instead of just the code |
| `multiple` | `boolean` | `false` | Allow multiple selections |
| `chips` | `boolean` | `false` | Display selections as chips (useful with multiple) |
| `closableChips` | `boolean` | `false` | Allow removing chips with an X button |
| `limit` | `number` | `10` | Items per page |
| `kind` | `string` | `'category'` | Kind filter |
| `clearable` | `boolean` | `true` | Show clear button |
| `disabled` | `boolean` | `false` | Disable input |
| `readonly` | `boolean` | `false` | Read-only mode |
| `density` | `string` | `'compact'` | Vuetify density |
| `variant` | `string` | `'outlined'` | Vuetify variant |
| `minChars` | `number` | `1` | Min characters to trigger search |
| `debounceMs` | `number` | `300` | Debounce delay in ms |

### Form Integrations

The `IcdOpsSearchField` component is integrated into the following forms:

| Form | ICD-10 Fields | OPS Fields |
|------|--------------|------------|
| `PatientCaseCreateEditForm.vue` | mainDiagnosisICD10, otherDiagnosisICD10 | — |
| `CreateEditSurgeryDialog.vue` | diagnosisICD10 | oPSCodes |
| `CaseBlueprints.vue` (Admin) | mainDiagnosisICD10, otherDiagnosisICD10 | — |
| `SurgeryBlueprints.vue` (Admin) | diagnosisICD10 | opsCodes |

#### Auto-fill Feature

When creating a patient case, if the user selects ICD-10 codes but leaves the "Main Diagnosis" text field empty, the system automatically fills it with the diagnosis labels from the selected ICD-10 codes upon form submission. This ensures the required main diagnosis field is populated with meaningful text.

### Files

| File | Purpose |
|------|---------|
| `src/services/icdopsService.ts` | API calls with localStorage cache |
| `src/composables/useIcdOpsSearch.ts` | Reactive composable with debounce & infinite scroll |
| `src/components/icdops/IcdOpsSearchField.vue` | Vuetify autocomplete component |
| `src/services/__tests__/icdopsService.spec.ts` | Service tests (12 tests) |
| `src/composables/__tests__/useIcdOpsSearch.spec.ts` | Composable tests (8 tests) |
| `src/components/icdops/__tests__/IcdOpsSearchField.spec.ts` | Component tests (21 tests) |
| `src/components/forms/__tests__/PatientCaseCreateEditForm.spec.ts` | Form tests (14 tests) |

## Data Storage Recommendation

The current approach of **parsing XML at startup into in-memory arrays** is the best choice for this use case:

| Approach | Pros | Cons |
|----------|------|------|
| **In-memory (current)** | ~5ms search, no dependencies, simple | ~50MB RAM, ~1.3s startup |
| MongoDB import | Queryable, indexed search | Adds migration step, network latency |
| SQLite | Structured queries, file-based | Extra dependency, more complex |
| Pre-parsed JSON | Faster startup (~100ms) | Needs build step, still in-memory |

The in-memory approach is recommended because:
1. **~32,500 entries** is small – the arrays use ~20-30 MB of RAM
2. Search speed (array filter) is sub-5ms which is excellent
3. No additional database dependencies
4. Data changes only once per year (just replace the XML files)

If startup time becomes a concern in the future, consider pre-converting the XML to JSON at build time.

## Testing

```bash
# Backend tests (32 tests)
cd patientoutcome-backend
npx vitest run src/api/icdops/__tests__/

# Frontend tests (55 tests total)
cd patientoutcome-frontend
npx vitest run src/services/__tests__/icdopsService.spec.ts \
  src/composables/__tests__/useIcdOpsSearch.spec.ts \
  src/components/icdops/__tests__/IcdOpsSearchField.spec.ts \
  src/components/forms/__tests__/PatientCaseCreateEditForm.spec.ts
```

## Updating Data for Future Years

1. Download the new ClaML ZIP files from BfArM (https://www.bfarm.de/)
2. Replace the folders under `src/ICD-OPS/`
3. Update the file path constants in `src/api/icdops/icdopsClamlParser.ts`
4. Update `DATA_VERSION` in `src/api/icdops/icdopsService.ts`
5. Restart the backend
6. Frontend caches will auto-invalidate due to the year-boundary rule
