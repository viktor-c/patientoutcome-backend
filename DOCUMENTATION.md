# Documentation Guide

This project uses JSDoc with the Docdash template to generate comprehensive API documentation.

## Generating Documentation

```bash
# Generate documentation
pnpm docs

# Generate and serve documentation locally
pnpm docs:serve
```

The documentation will be generated in the `docs/` directory and can be viewed in a browser at `http://localhost:8080`.

## Writing JSDoc Comments

### For Routes and Controllers

```typescript
/**
 * Get all patients with optional filtering
 * @route GET /api/patient
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Returns list of patients
 * @throws {Error} If database query fails
 */
export async function getPatients(req: Request, res: Response): Promise<void> {
  // implementation
}
```

### For Services

```typescript
/**
 * Creates a new patient case
 * @param {CreatePatientCaseRequest} data - Patient case data
 * @returns {ServiceResponse<PatientCase>} Service response with created case
 * @example
 * const result = await patientCaseService.create({
 *   patientId: '123',
 *   diagnosis: 'Fracture'
 * });
 */
export async function createCase(data: CreatePatientCaseRequest) {
  // implementation
}
```

### For Models

```typescript
/**
 * Patient schema definition
 * @typedef {Object} Patient
 * @property {string} _id - Unique identifier
 * @property {string} firstName - Patient's first name
 * @property {string} lastName - Patient's last name
 * @property {Date} dateOfBirth - Patient's date of birth
 * @property {string} externalId - External system patient ID
 */
```

## Documentation Structure

- **API Endpoints**: Each endpoint folder in `/src/api` has a `description.md` explaining its purpose
- **JSDoc Comments**: Inline documentation in TypeScript files
- **README**: High-level project overview and setup instructions

## Best Practices

1. **Document public APIs**: All exported functions, classes, and interfaces
2. **Include examples**: For complex functions, provide usage examples
3. **Describe parameters**: Type, purpose, and constraints
4. **Document errors**: What exceptions can be thrown and when
5. **Keep it current**: Update docs when changing code

## Viewing Documentation

After running `pnpm docs:serve`, navigate to:
- **Home**: Overview and getting started
- **API Endpoints**: Tutorial section with endpoint descriptions
- **Modules**: Organized by file structure
- **Classes/Functions**: Detailed API reference

## CI/CD Integration

To automatically generate and deploy docs:

```yaml
# .github/workflows/docs.yml
name: Generate Docs
on:
  push:
    branches: [main]
jobs:
  build-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm docs
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```
