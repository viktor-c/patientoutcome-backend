PR Title: chore(types): migrate frontend FormTemplate types to use CustomFormData and stricter shapes

Summary:

- The backend replaced `any` used for form template shapes with stricter types (`CustomFormData`, `Questionnaire`) and updated `FormTemplatePlugin` signatures.
- To align the frontend with the backend, update your TypeScript models, UI components, and generated API client to use these new types.

Suggested commits in frontend repo:

1. feat(formtemplate-types): add `Questionnaire` and `CustomFormData` types
   - Modify `FormTemplate` interface to use `formData?: CustomFormData` and `formSchema` typed as `Record<string, unknown>`.
2. refactor(form-rendering): update components to use `CustomFormData` and typed questionnaires
   - Replace `any` in `formData` usage with typed `CustomFormData`.
   - Update code that indexes into `formData` to avoid `as any` casts and add guards for `null`/`undefined`.
3. chore(openapi): regenerate API client
   - Remove existing `src/api` generated files and re-run OpenAPI generator to reflect updated backend OpenAPI spec.
4. test(formtemplates): update tests and fixtures to use typed `CustomFormData`.

Developer steps:

- Run local backend to serve the OpenAPI spec: `pnpm build && pnpm start` (or `npm run dev`) and ensure the backend runs locally (default port for the app is configured in server.ts
- Regenerate types: `npx @openapitools/openapi-generator-cli generate -i http://localhost:40001/openapi/v1/swagger.json -g typescript-fetch -o src/api`
- Run `pnpm install` and `pnpm build` to verify build and `pnpm test` for tests.

Notes:

- The backend JSON files are still plain JSON — you may need to cast them to typed `FormTemplate` objects in the frontend code where applicable (e.g., `const ft = yourJson as unknown as FormTemplate`).
- The plugin `calculateScore` functions are backend-only; frontend will not call them directly. The frontend only needs updated types for `formTemplate` and `formData`."}
