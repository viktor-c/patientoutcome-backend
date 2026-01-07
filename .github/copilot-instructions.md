
# Backend Development Guide

## Architecture Overview
This patient outcome management system follows a strict layered architecture: **Router → Controller → Service → Repository → Model**. Each layer has a specific responsibility and communication flows unidirectionally.

### Core Patterns
- **Router**: Define OpenAPI specs, validation schemas, and route endpoints using `@asteasolutions/zod-to-openapi`
- **Controller**: Handle HTTP concerns, delegate to services via `handleServiceResponse(serviceResponse, res)`
- **Service**: Business logic, validation, error handling. Always return `ServiceResponse<T>` objects
- **Repository**: Data access abstraction. Use `.lean()` for read operations, handle ObjectId validation
- **Model**: Zod schemas converted to Mongoose models via `@zodyac/zod-mongoose`

## Schema and API Development
- **Always start with Zod schemas** in `*Model.ts` files before creating routes
- Use `zodSchema()` to convert Zod to Mongoose: `const MongooseSchema = zodSchema(ZodSchema.omit({ _id: true }))`
- Register schemas in OpenAPI registry: `registry.register("SchemaName", ZodSchema)`
- Use `createApiResponses()` helper for consistent API response documentation
- Validation schemas follow pattern: `GetSchema`, `CreateSchema`, `UpdateSchema`, `DeleteSchema`

## Key Development Workflows
- **Testing**: Use Vitest (`npm run test`) for all testing
- **API Client Regeneration**: After backend changes, run frontend client generation:
  ```bash
  cd frontend && rm -rf src/api && npx @openapitools/openapi-generator-cli generate -i http://localhost:40001/openapi/v1/swagger.json -g typescript-fetch -o src/api
  ```
- **Mock Data**: Repository classes include mock data getters (dev/test only, throws in production)
- **Session Management**: Uses express-session with MongoDB store, user identification via cookies

## Code Conventions
- Use structured logging via `logger` utility (from `@/server` or `@/common/utils/logger`)
- Import zod from `@/common/utils/zodInit` to ensure OpenAPI extensions are loaded
- Use `zId()` for MongoDB ObjectId references, `zId("ModelName")` for typed references
- Validation: Use `validateRequest(schema)` middleware, debug validation errors in `httpHandlers.ts`
- Error handling: Always use `ServiceResponse.success()`, `.failure()`, `.conflict()`, `.created()` patterns

## Critical Dependencies
- `@asteasolutions/zod-to-openapi`: API documentation generation
- `@zodyac/zod-mongoose`: Zod-to-Mongoose schema conversion  
- Express session with `connect-mongo` for stateful authentication
- Biome for linting/formatting (`npm run lint:fix`)

## Integration Requirements
- After changing backend API, regenerate frontend types and API client
- OpenAPI spec automatically updates with zod-to-openapi registry patterns
- Don't remove existing comments unless explicitly requested
- Mock data is environment-protected (throws errors in production)

## General prompts
- "commit changes" is an alias for "commit changes to patientoutcome-frontend following best practices, logically group related changes into single commits; create multiple commits if necessary for clarity"
- do not solve typescript issues by using "as any" or "as unknown" with double assertion. Before doing this, check if an exact typing is possible. Ask if you are unsure. 