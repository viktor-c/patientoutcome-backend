# Form Template Plugin System

## Overview

The Form Template Plugin System provides a modular architecture for managing different form templates in the patient outcome management system. Each form template (e.g., MOXFQ, AOFAS, EFAS, VAS) is encapsulated in its own plugin, making the system easily extensible and maintainable.

## Architecture

```
formTemplatePlugins/
├── index.ts              # Main registry and exports
├── types.ts              # TypeScript interfaces
├── README.md             # This documentation
├── moxfq/
│   └── index.ts         # MOXFQ plugin implementation
├── aofas/
│   └── index.ts         # AOFAS plugin implementation
├── efas/
│   └── index.ts         # EFAS plugin implementation
└── vas/
    └── index.ts         # VAS plugin implementation
```

## Core Concepts

### What is a Form Template Plugin?

A form template plugin is a self-contained module that:

1. Defines the form's JSON structure (schema, UI schema, translations)
2. Implements score calculation logic specific to that form
3. Provides mock data for testing
4. Can optionally validate form data before processing

### Plugin Interface

Every plugin must implement the `FormTemplatePlugin` interface defined in `types.ts`:

```typescript
interface FormTemplatePlugin {
  templateId: string;              // Must match MongoDB _id
  name: string;                    // Human-readable form name
  description: string;             // What this form measures
  formTemplate: FormTemplateJson;  // Complete JSON form definition
  calculateScore: (formData: any) => ScoringData;  // Score calculation
  generateMockData?: () => any;    // Optional: Sample data generator
  validateFormData?: (formData: any) => boolean;   // Optional: Data validator
}
```

## Creating a New Form Template Plugin

### Step 1: Prepare Your Form JSON

Export your form from the form builder as JSON. The structure should include:

- `_id`: Unique MongoDB ObjectId string
- `title`: Form title
- `description`: Form description
- `formSchema`: JSON Schema for form structure
- `formSchemaUI`: UI Schema for rendering
- `formData`: Sample form data (optional)
- `translations`: i18n translations (optional)

Place the JSON file in: `src/api/formtemplate/JsonFormTemplates/YOUR_FORM_JsonForm_Export.json`

### Step 2: Create Plugin Directory

Create a new directory under `formTemplatePlugins/` with your form's name (lowercase):

```bash
mkdir src/api/formtemplate/formTemplatePlugins/yourform
```

### Step 3: Implement the Plugin

Create `index.ts` in your new directory:

```typescript
import type { FormTemplatePlugin, ScoringData, SubscaleScore } from "../types";
import * as yourFormJson from "../../JsonFormTemplates/YOUR_FORM_JsonForm_Export.json";

/**
 * Calculate score for your form
 * @param data - Raw form data submitted by user
 * @returns ScoringData structure with calculated scores
 */
function calculateYourFormScore(data: any): ScoringData {
  // STEP 1: Extract and normalize the data
  // Handle nested structures (e.g., { section: { q1: value, q2: value }})
  const questions = data.section || data;
  
  // STEP 2: Define your subscales (if applicable)
  const subscales = {
    subscale1: ["q1", "q2", "q3"],
    subscale2: ["q4", "q5", "q6"],
  };
  
  // STEP 3: Calculate subscale scores
  const subscale1Score = calculateSubscaleScore(
    questions,
    subscales.subscale1,
    "Subscale 1",
    "Description of subscale 1",
    maxScorePerQuestion // e.g., 4 for 0-4 Likert scale
  );
  
  // STEP 4: Calculate total score
  const allQuestions = [...subscales.subscale1, ...subscales.subscale2];
  const totalScore = calculateSubscaleScore(
    questions,
    allQuestions,
    "Total Score",
    "Overall assessment",
    maxScorePerQuestion
  );
  
  // STEP 5: Return the complete scoring structure
  return {
    rawData: data,
    subscales: {
      subscale1: subscale1Score,
      subscale2: subscale2Score,
    },
    total: totalScore,
  };
}

/**
 * Helper function to calculate a single subscale score
 */
function calculateSubscaleScore(
  questions: any,
  questionKeys: string[],
  name: string,
  description: string,
  maxPerQuestion: number
): SubscaleScore | null {
  // Get valid (non-null, non-undefined) answers
  const validAnswers = questionKeys
    .map((key) => questions[key])
    .filter((value) => value !== null && value !== undefined);
  
  if (validAnswers.length === 0) return null;
  
  // Calculate scores
  const rawScore = validAnswers.reduce((sum, value) => sum + value, 0);
  const maxPossibleScore = questionKeys.length * maxPerQuestion;
  const completionRate = validAnswers.length / questionKeys.length;
  
  // Normalize to 0-100 scale
  const normalizedScore = (rawScore / maxPossibleScore) * 100;
  
  return {
    name,
    description,
    rawScore,
    normalizedScore: Math.round(normalizedScore * 100) / 100,
    maxPossibleScore,
    answeredQuestions: validAnswers.length,
    totalQuestions: questionKeys.length,
    completionPercentage: Math.round(completionRate * 100),
    isComplete: completionRate === 1,
  };
}

/**
 * Generate mock data for testing
 */
function generateMockData(): any {
  return (yourFormJson as any).formData || {
    // Fallback: Define your own mock data structure
    section: {
      q1: 2,
      q2: 3,
      q3: 1,
    },
  };
}

/**
 * Export the plugin
 */
export const yourFormPlugin: FormTemplatePlugin = {
  templateId: "YOUR_MONGODB_ID_HERE", // Must match _id in JSON
  name: "Your Form Name",
  description: "What this form measures",
  formTemplate: yourFormJson as any,
  calculateScore: calculateYourFormScore,
  generateMockData,
};
```

### Step 4: Register the Plugin

Add your plugin to the main registry in `formTemplatePlugins/index.ts`:

```typescript
// 1. Import your plugin
import { yourFormPlugin } from "./yourform";

// 2. Export it
export { moxfqPlugin, aofasPlugin, efasPlugin, vasPlugin, yourFormPlugin };

// 3. Add it to the array
export const allFormPlugins: FormTemplatePlugin[] = [
  moxfqPlugin,
  aofasPlugin,
  efasPlugin,
  vasPlugin,
  yourFormPlugin, // Add your plugin here
];
```

### Step 5: Test Your Plugin

The plugin system automatically integrates with:

- `formTemplateRepository.mockFormTemplateData` - Your form template is auto-included
- `formRepository.populateMockForms()` - Uses your `calculateScore` function
- API endpoints - Your form is immediately available through the API

## Scoring Guidelines

### Best Practices

1. **Always normalize scores to 0-100 scale** for consistency across different forms
2. **Handle partial completions** gracefully (return null or partial scores)
3. **Validate data structure** before processing to avoid runtime errors
4. **Document your scoring algorithm** with inline comments
5. **Include descriptions** for subscales to help users understand the scores

### Common Patterns

#### Pattern 1: Simple Single-Section Form (like VAS)

```typescript
function calculateScore(data: any): ScoringData {
  const rawScore = data.pain ?? data.vas?.pain;
  return {
    rawData: data,
    subscales: { total: singleScore },
    total: singleScore,
  };
}
```

#### Pattern 2: Multi-Question Single-Section Form (like AOFAS)

```typescript
function calculateScore(data: any): ScoringData {
  const sectionKey = Object.keys(data)[0]; // e.g., 'section1'
  const questions = data[sectionKey] || {};
  // Calculate based on all questions in the section
  return { rawData: data, subscales: { [sectionKey]: score }, total: score };
}
```

#### Pattern 3: Multi-Subscale Form (like MOXFQ)

```typescript
function calculateScore(data: any): ScoringData {
  const questions = data.moxfq || data;
  const subscales = {
    walkingStanding: ["q1", "q2", "q3"],
    pain: ["q4", "q5"],
    social: ["q6", "q7"],
  };
  
  // Calculate each subscale separately
  const scores = {};
  for (const [key, questionList] of Object.entries(subscales)) {
    scores[key] = calculateSubscaleScore(questions, questionList, ...);
  }
  
  // Calculate total from all questions
  const allQuestions = Object.values(subscales).flat();
  const totalScore = calculateSubscaleScore(questions, allQuestions, ...);
  
  return { rawData: data, subscales: scores, total: totalScore };
}
```

#### Pattern 4: Multi-Section Form (like EFAS)

```typescript
function calculateScore(data: any): ScoringData {
  const sections = ["section1", "section2"];
  const subscaleScores = {};
  
  for (const sectionKey of sections) {
    const questions = data[sectionKey] || {};
    subscaleScores[sectionKey] = calculateSubscaleScore(questions, ...);
  }
  
  // Aggregate total across all sections
  const totalScore = aggregateSections(data, sections);
  
  return { rawData: data, subscales: subscaleScores, total: totalScore };
}
```

## Data Structures

### SubscaleScore

```typescript
interface SubscaleScore {
  name: string;                    // Display name
  description?: string | null;     // What this subscale measures
  rawScore: number | null;         // Sum of answer values
  normalizedScore: number | null;  // 0-100 normalized score
  maxPossibleScore: number;        // Maximum achievable raw score
  answeredQuestions: number;       // Number of non-null answers
  totalQuestions: number;          // Total questions in subscale
  completionPercentage: number;    // Percentage of questions answered
  isComplete: boolean;             // True if all questions answered
}
```

### ScoringData

```typescript
interface ScoringData {
  rawData: any;                           // Original form data
  subscales: {
    [key: string]: SubscaleScore | null;  // Individual subscale scores
  };
  total: SubscaleScore | null;           // Overall total score
}
```

## Integration Points

### Automatic Integration

Your plugin automatically integrates with:

1. **Form Template Repository**: `formTemplateRepository.mockFormTemplateData` includes your form
2. **Form Repository**: Uses your `calculateScore` function when creating/updating forms
3. **API Endpoints**: Your form is available through all standard API endpoints
4. **Seeding**: Mock data is generated using your `generateMockData` function

### Manual Integration

If you need custom logic, use the plugin registry:

```typescript
import { getPluginByTemplateId, calculateFormScore } from "@/api/formtemplate/formTemplatePlugins";

// Get a specific plugin
const plugin = getPluginByTemplateId("67b4e612d0feb4ad99ae2e85");
if (plugin) {
  const score = plugin.calculateScore(formData);
}

// Or use the helper function
const score = calculateFormScore(templateId, formData);
```

## Testing Your Plugin

### Unit Tests

Create a test file for your plugin:

```typescript
import { describe, it, expect } from "vitest";
import { yourFormPlugin } from "./index";

describe("YourForm Plugin", () => {
  it("should calculate scores correctly", () => {
    const mockData = {
      section: {
        q1: 2,
        q2: 3,
        q3: 1,
      },
    };
    
    const result = yourFormPlugin.calculateScore(mockData);
    
    expect(result.total).not.toBeNull();
    expect(result.total?.rawScore).toBe(6);
    expect(result.total?.normalizedScore).toBeGreaterThan(0);
    expect(result.total?.isComplete).toBe(true);
  });
  
  it("should handle partial completions", () => {
    const partialData = {
      section: {
        q1: 2,
        q2: null,
        q3: 1,
      },
    };
    
    const result = yourFormPlugin.calculateScore(partialData);
    
    expect(result.total?.answeredQuestions).toBe(2);
    expect(result.total?.isComplete).toBe(false);
  });
});
```

### Integration Tests

Test the full integration:

```typescript
import { formRepository } from "@/api/form/formRepository";
import { formTemplateRepository } from "@/api/formtemplate/formTemplateRepository";

// Your form should be in mockFormTemplateData
const templates = formTemplateRepository.mockFormTemplateData;
const yourTemplate = templates.find(t => t._id === "YOUR_TEMPLATE_ID");
expect(yourTemplate).toBeDefined();

// Score calculation should work in forms
const form = await formRepository.createFormByTemplateId(
  caseId,
  consultationId,
  "YOUR_TEMPLATE_ID"
);
expect(form?.scoring).toBeDefined();
```

## Common Issues and Solutions

### Issue 1: Scores are null

**Cause**: No valid answers found in the data
**Solution**: Check your data extraction logic and ensure you're accessing the correct keys

### Issue 2: NaN in normalized scores

**Cause**: Division by zero when maxPossibleScore is 0
**Solution**: Add validation for empty subscales before calculation

### Issue 3: Plugin not found in registry

**Cause**: Plugin not added to `allFormPlugins` array
**Solution**: Make sure you exported your plugin and added it to the array in `index.ts`

### Issue 4: Template ID mismatch

**Cause**: `templateId` in plugin doesn't match `_id` in JSON
**Solution**: Copy the exact `_id` value from your JSON file to the plugin

## Maintenance

### Updating Existing Plugins

When updating a plugin:

1. Keep the `templateId` unchanged
2. Version your JSON file if making breaking changes
3. Update tests to cover new functionality
4. Document changes in comments

### Deprecating Plugins

To deprecate a form:

1. Remove it from `allFormPlugins` array
2. Keep the plugin file for backward compatibility
3. Add a deprecation notice in the plugin's comments
4. Consider data migration for existing forms

## Support

For questions or issues:

1. Check existing plugins for reference implementations
2. Review the type definitions in `types.ts`
3. Consult the main README for project architecture
4. Contact the development team

## Examples

See the existing implementations:

- **Simple form**: `vas/index.ts`
- **Single section**: `aofas/index.ts`
- **Multi-subscale**: `moxfq/index.ts`
- **Multi-section**: `efas/index.ts`
