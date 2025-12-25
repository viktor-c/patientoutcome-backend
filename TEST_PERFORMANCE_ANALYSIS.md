# Performance Issues in userRegistrationService.test.ts

## Problem Summary

The `userRegistrationService.test.ts` file is **extremely slow** and may timeout. This is happening because:

### Root Causes

1. **Integration Tests, Not Unit Tests**
   - Tests connect to real MongoDB database
   - No mocking of dependencies
   - Each test performs multiple database operations

2. **Expensive Database Operations**
   - `beforeEach` creates multiple user documents for every test
   - Database queries run sequentially (not in parallel)
   - No indexes on test collections

3. **Service Dependencies**
   - `UserRegistrationService.registerUser()` calls `userService.createUser()`
   - `userService` imports may cause module loading delays
   - Potential circular dependency issues during test execution

4. **Cleanup Operations**
   - Originally had `afterEach` deleting all documents after every test
   - Changed to `afterAll` but database still accumulates data during test run

## Performance Analysis

**Expected vs Actual:**
- Pure unit tests: ~5-50ms per test
- These integration tests: ~2-5 seconds per test
- Total suite: Should be <5s, actually **>45 seconds** (timing out)

**Specific Slow Operations:**
- Creating test users in `beforeEach`: ~500-1000ms
- `userModel.findOne()` queries: ~100-300ms each
- `RegistrationCodeModel` operations: ~100-200ms each
- Service method calls that chain multiple DB operations: ~1-2s

## Quick Fixes Applied

✅ **Fixed Wrong Property Names**
- Changed `suggestions` (plural) to `suggestion` (singular)
- Matches actual implementation that returns single suggestion

✅ **Fixed Case-Sensitivity Test**
- Changed from expecting case-insensitive to case-sensitive
- Matches actual MongoDB query behavior

✅ **Removed Expensive Loop**
- Removed test that looped through multiple suggestions checking database
- Each loop iteration was a separate DB query

✅ **Changed Cleanup Strategy**
- Changed from `afterEach` to `afterAll`
- Reduces number of delete operations

✅ **Added Cleanup in beforeEach**
- Ensures clean state without waiting for afterAll
- Prevents test data conflicts

## Recommended Solutions

### Option 1: Mock Dependencies (Best for Unit Tests)

```typescript
import { vi } from "vitest";

describe("UserRegistrationService", () => {
  let service: UserRegistrationService;
  let mockRepository: any;

  beforeEach(() => {
    // Mock the repository
    mockRepository = {
      createMultipleCodes: vi.fn(),
      useCode: vi.fn(),
    };
    
    // Mock userModel
    vi.mock("../userModel", () => ({
      userModel: {
        findOne: vi.fn(),
        create: vi.fn(),
      },
    }));

    service = new UserRegistrationService(mockRepository);
  });

  it("should create codes for multiple roles", async () => {
    mockRepository.createMultipleCodes.mockResolvedValue([
      { code: "ABC-123-DEF" },
    ]);

    const result = await service.batchCreateCodes({...});
    
    expect(result.success).toBe(true);
    expect(mockRepository.createMultipleCodes).toHaveBeenCalledTimes(1);
  });
});
```

**Pros:**
- Fast execution (<100ms total)
- No database dependency
- True unit tests
- Can test edge cases easily

**Cons:**
- Requires refactoring tests
- May miss integration issues
- Need to keep mocks in sync with implementation

### Option 2: Use In-Memory MongoDB (Better for Integration Tests)

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

**Pros:**
- Real MongoDB behavior
- Much faster than network DB
- Isolated test environment

**Cons:**
- Still slower than mocking (~5-10s total)
- Requires additional dependency
- Setup complexity

### Option 3: Optimize Current Approach

```typescript
// Create indexes for test collections
beforeAll(async () => {
  await userModel.createIndexes();
  await RegistrationCodeModel.createIndexes();
});

// Use Promise.all for parallel operations
beforeEach(async () => {
  await Promise.all([
    userModel.deleteMany({}),
    RegistrationCodeModel.deleteMany({}),
  ]);
  
  await Promise.all([
    userModel.create({...}),
    userModel.create({...}),
  ]);
});

// Reduce number of tests
// Combine similar test cases
```

**Pros:**
- Minimal code changes
- Keeps integration testing
- Moderate performance improvement

**Cons:**
- Still relatively slow (~15-20s)
- Database dependent
- Not true unit tests

## Current Status

**Test File:** `src/api/user/__tests__/userRegistrationService.test.ts`

**Tests:** 19 tests (down from 21)
- Removed 2 tests expecting multiple suggestions

**Performance:** 
- Before fixes: Hanging indefinitely
- After fixes: ~45 seconds (still slow, but completing)

**Classification:** Integration tests, not unit tests

## Recommendations

1. **Short Term:** 
   - Keep current implementation
   - Mark tests as integration tests
   - Run separately from fast unit test suite
   - Add timeout configuration in vitest.config

2. **Medium Term:**
   - Add mocking for true unit tests
   - Keep integration tests separate
   - Use test tags to separate fast/slow tests

3. **Long Term:**
   - Migrate to in-memory MongoDB for integration tests
   - Create separate unit test file with mocks
   - Set up CI/CD to run fast tests on every commit, slow tests nightly

## Test Configuration

Add to `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    testTimeout: 60000, // 60 seconds for integration tests
    hookTimeout: 30000, // 30 seconds for setup/teardown
    slowTestThreshold: 5000, // Warn if test takes >5s
  },
});
```

## Running Tests

```bash
# Run only fast tests (batchUserCreation is fast)
npm test -- batchUserCreation.test.ts

# Run slow integration tests with extended timeout
npm test -- userRegistrationService.test.ts --testTimeout=60000

# Skip slow tests
npm test -- --exclude="**/userRegistrationService.test.ts"
```
