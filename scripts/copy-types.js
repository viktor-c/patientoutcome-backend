#!/usr/bin/env node
/**
 * Script to copy TypeScript type source files from backend to frontend
 * This copies the actual .ts files so frontend can use them directly
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backendTypesDir = resolve(__dirname, "../src/types");
const frontendTypesDir = resolve(__dirname, "../../patientoutcome-frontend/src/types/backend");

// Ensure frontend types directory exists
if (!existsSync(frontendTypesDir)) {
  mkdirSync(frontendTypesDir, { recursive: true });
}

// Copy scoring types source file
const source = resolve(backendTypesDir, "scoring.ts");
const destination = resolve(frontendTypesDir, "scoring.ts");

if (existsSync(source)) {
  copyFileSync(source, destination);
  console.log("✓ Copied scoring.ts to frontend");
} else {
  console.warn(`⚠ Warning: scoring.ts not found at ${source}`);
}

console.log("✓ Type copying complete");
