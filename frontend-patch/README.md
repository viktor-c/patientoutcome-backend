This directory contains proposed frontend changes for the patientoutcome-frontend repo to match updated backend typing for form templates.

Overview:

- Backend replaced `any` usage in form template plugin types with `CustomFormData`, `Questionnaire`, and other safe types.
- Update the frontend API models and local types to reflect these changes.

Suggested steps:

1. Regenerate API client: The OpenAPI spec exported from backend will reflect new types; regenerate the frontend API client:

```bash
cd patientoutcome-frontend
rm -rf src/api
npx @openapitools/openapi-generator-cli generate -i http://localhost:40001/openapi/v1/swagger.json -g typescript-fetch -o src/api
```

2. Update the FormTemplate model type in frontend (in src/api types or local type file):

Old (loose):

```ts
export interface FormTemplate {
  _id: string;
  title: string;
  description: string;
  formSchema: any;
  formSchemaUI?: any;
  formData?: any;
  translations?: any;
}
```

New (typed):

```ts
export type Questionnaire = Record<string, number | null>;
export type CustomFormData = Record<string, Questionnaire>;

export interface FormTemplate {
  _id: string;
  title: string;
  description: string;
  formSchema: Record<string, unknown>;
  formSchemaUI?: Record<string, unknown>;
  formData?: CustomFormData;
  translations?: Record<string, string> | Record<string, unknown>;
}
```

3. Update UI components that read `formData` to use typed objects. Replace any `any` in code with the new `CustomFormData` type to enable compile-time verification and better editor assistance.

4. Replace occurrences where the frontend treats translations as `any` and update to typed shapes where possible.

5. Update frontend tests that assert on `formData` or `scoring` types to use typed fixtures.

6. Run `pnpm test` and `pnpm build` in frontend to verify no type errors.

Example migration snippets:

- Replace `const formData: any = ...` with `const formData: CustomFormData = ...`
- Use `Object.entries(formData).forEach(([section, questions]) => {...})` where `questions: Questionnaire`.

If you'd like, I can prepare a set of code patches or a PR for the frontend repo if you point me to the frontend workspace or a fork/branch to push to.
