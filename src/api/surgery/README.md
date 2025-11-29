# Surgery API

This directory contains the standalone Surgery API extracted from the PatientCase API. The Surgery API provides comprehensive management of surgical procedures and related data.

## Architecture

The Surgery API follows the same architectural pattern as other APIs in the system:

- **Model** (`surgeryModel.ts`): Zod schemas and MongoDB model definitions
- **Repository** (`surgeryRepository.ts`): Data access layer with MongoDB operations
- **Service** (`surgeryService.ts`): Business logic layer with error handling
- **Controller** (`surgeryController.ts`): Request handling and response formatting
- **Router** (`surgeryRouter.ts`): Route definitions and OpenAPI documentation

## Schema Structure

### Surgery Schema
```typescript
{
  _id: ObjectId,
  externalId?: string,
  diagnosis?: string[],
  diagnosisICD10?: string[],
  therapy?: string,
  OPSCodes?: string[],
  side: "left" | "right" | "none",
  surgeryDate: Date,
  surgeryTime?: number,
  tourniquet?: number,
  anaesthesiaType?: AnaesthesiaType,
  roentgenDosis?: number,
  roentgenTime?: string,
  additionalData?: Note[],
  surgeons: ObjectId[],
  patientCase: ObjectId,
  createdAt?: Date,
  updatedAt?: Date
}
```

## API Endpoints

### Core CRUD Operations
- `GET /surgeries` - Get all surgeries
- `GET /surgery/{surgeryId}` - Get surgery by ID
- `POST /surgery` - Create new surgery
- `PUT /surgery/{surgeryId}` - Update surgery
- `DELETE /surgery/{surgeryId}` - Delete surgery

### Search and Filter Operations
- `GET /surgeries/searchById/{searchQuery}` - Search by external ID
- `GET /surgeries/case/{patientCaseId}` - Get surgeries by patient case
- `GET /surgeries/diagnosis/{diagnosis}` - Get surgeries by diagnosis
- `GET /surgeries/diagnosisICD10/{diagnosisICD10}` - Get surgeries by ICD10 code
- `GET /surgeries/surgeon/{surgeonId}` - Get surgeries by surgeon
- `GET /surgeries/side/{side}` - Get surgeries by anatomical side
- `GET /surgeries/therapy/{therapy}` - Get surgeries by therapy type
- `GET /surgeries/from/{startDate}/to/{endDate}` - Get surgeries by date range

### Related Data Operations
- `GET /surgery/{surgeryId}/surgeons` - Get surgeons for a surgery

## Key Features

### 1. **Standalone Document Structure**
- Surgeries are now independent MongoDB documents
- Each surgery references a patient case via `patientCase` field
- Enables better querying and data management

### 2. **Comprehensive Search Capabilities**
- Search by external ID, diagnosis, ICD10 codes
- Filter by surgeon, anatomical side, therapy type
- Date range queries for surgical scheduling

### 3. **Enhanced Data Management**
- Automatic external ID generation
- Timestamp tracking (createdAt, updatedAt)
- Structured note management via `additionalData`

### 4. **OpenAPI Integration**
- Full OpenAPI 3.0 documentation
- Zod-based schema validation
- Automatic request/response validation

## Changes from PatientCase API

### Extracted Functionality
The following functionality was moved from PatientCase API to Surgery API:

1. **Schemas**: `SurgerySchema` and `CreateSurgerySchema`
2. **Repository Methods**:
   - `findCasesBySurgeon()` → `findSurgeriesBySurgeon()`
   - `findSurgeonsByCaseId()` → `findSurgeonsBySurgeryId()`
3. **Service Methods**: All surgery-related service methods
4. **Controller Methods**: All surgery-related controller methods
5. **Router Endpoints**: Surgery-specific endpoints

### Updated PatientCase Model
- `surgeries` field now contains references to Surgery documents
- Surgery-related methods removed from PatientCase service/controller
- Mock data updated to reference surgery documents

## Data Migration Considerations

When migrating existing data:

1. **Extract Embedded Surgeries**: Convert embedded surgery objects to separate Surgery documents
2. **Update References**: Replace embedded surgeries with ObjectId references in PatientCase documents
3. **Maintain Relationships**: Ensure `patientCase` field in Surgery documents correctly references the original case
4. **Update Queries**: Modify any existing queries that accessed embedded surgery data

## Testing

Basic test coverage is provided in `__tests__/surgeryRouter.test.ts` including:
- CRUD operation validation
- Parameter validation
- Error handling
- Search functionality

## Integration

The Surgery API is automatically integrated into:
- Main server routing (`/surgery` and `/surgeries` endpoints)
- OpenAPI documentation generation
- Request validation middleware
- Error handling middleware

## Benefits of Extraction

1. **Improved Scalability**: Surgeries can be queried and managed independently
2. **Better Performance**: Dedicated indexes and optimized queries for surgical data
3. **Enhanced Flexibility**: Surgery-specific features can be developed without affecting PatientCase
4. **Cleaner Architecture**: Separation of concerns between patient cases and surgical procedures
5. **API Clarity**: Dedicated endpoints make the API more intuitive for surgery-specific operations

## Future Enhancements

Potential improvements for the Surgery API:
- Surgery status tracking (scheduled, in-progress, completed, cancelled)
- Integration with operating room scheduling systems
- Surgical outcome tracking and reporting
- Pre/post-operative care integration
- Surgical team management features
