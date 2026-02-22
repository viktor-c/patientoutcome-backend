#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function parseArgs(argv) {
  const args = {
    input: "",
    output: "",
    reference: "",
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--input") {
      args.input = argv[++i] || "";
    } else if (token === "--output") {
      args.output = argv[++i] || "";
    } else if (token === "--reference") {
      args.reference = argv[++i] || "";
    }
  }

  if (!args.input) {
    throw new Error("Missing --input path");
  }

  if (!args.output) {
    args.output = `${args.input}-ejson-converted`;
  }

  return args;
}

async function getJsonFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function isCanonicalOidObject(value) {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    typeof value.$oid === "string"
  );
}

function collectOidPaths(value, currentPath, pathSet) {
  if (isCanonicalOidObject(value)) {
    pathSet.add(currentPath);
    return;
  }

  if (Array.isArray(value)) {
    const arrayPath = `${currentPath}[]`;
    for (const item of value) {
      collectOidPaths(item, arrayPath, pathSet);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      collectOidPaths(child, nextPath, pathSet);
    }
  }
}

async function buildReferencePathMap(referenceDir) {
  const map = new Map();
  if (!referenceDir) {
    return map;
  }

  const files = await getJsonFiles(referenceDir);
  for (const fileName of files) {
    const filePath = path.join(referenceDir, fileName);
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    const pathSet = new Set();
    collectOidPaths(parsed, "", pathSet);
    map.set(fileName, pathSet);
  }

  return map;
}

function looksLikeIdKey(key) {
  if (!key) {
    return false;
  }

  const normalized = key.toLowerCase();
  const commonReferenceKeys = new Set([
    "_id",
    "department",
    "departments",
    "patient",
    "patients",
    "case",
    "cases",
    "center",
    "centers",
    "user",
    "users",
    "consultation",
    "consultations",
    "surgery",
    "surgeries",
    "clinicalstudy",
    "clinicalstudies",
    "blueprint",
    "blueprints",
    "form",
    "forms",
    "formtemplate",
    "formtemplates",
    "formversion",
    "formversions",
  ]);

  if (commonReferenceKeys.has(normalized)) {
    return true;
  }

  if (normalized === "_id") {
    return true;
  }

  return normalized.endsWith("id") || normalized.endsWith("ids");
}

function convertDocument(value, options) {
  const { referencePaths, currentPath = "", currentKey = "" } = options;

  if (Array.isArray(value)) {
    let changed = 0;
    const converted = value.map((item) => {
      const result = convertDocument(item, {
        referencePaths,
        currentPath: `${currentPath}[]`,
        currentKey,
      });
      changed += result.changed;
      return result.value;
    });

    return { value: converted, changed };
  }

  if (value && typeof value === "object") {
    if (isCanonicalOidObject(value)) {
      return { value, changed: 0 };
    }

    let changed = 0;
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      const childPath = currentPath ? `${currentPath}.${key}` : key;
      const result = convertDocument(child, {
        referencePaths,
        currentPath: childPath,
        currentKey: key,
      });
      output[key] = result.value;
      changed += result.changed;
    }

    return { value: output, changed };
  }

  if (typeof value === "string" && OBJECT_ID_REGEX.test(value)) {
    const inReference = referencePaths ? referencePaths.has(currentPath) : false;
    const heuristicMatch = looksLikeIdKey(currentKey);

    if (inReference || heuristicMatch) {
      return {
        value: { $oid: value },
        changed: 1,
      };
    }
  }

  return { value, changed: 0 };
}

async function run() {
  const args = parseArgs(process.argv);
  const inputDir = path.resolve(args.input);
  const outputDir = path.resolve(args.output);
  const referenceDir = args.reference ? path.resolve(args.reference) : "";

  const inputStats = await fs.stat(inputDir).catch(() => null);
  if (!inputStats || !inputStats.isDirectory()) {
    throw new Error(`Input path is not a directory: ${inputDir}`);
  }

  if (referenceDir) {
    const referenceStats = await fs.stat(referenceDir).catch(() => null);
    if (!referenceStats || !referenceStats.isDirectory()) {
      throw new Error(`Reference path is not a directory: ${referenceDir}`);
    }
  }

  await fs.mkdir(outputDir, { recursive: true });

  const referenceMap = await buildReferencePathMap(referenceDir);
  const inputFiles = await getJsonFiles(inputDir);

  let totalConverted = 0;
  const fileSummaries = [];

  for (const fileName of inputFiles) {
    const inputPath = path.join(inputDir, fileName);
    const outputPath = path.join(outputDir, fileName);

    const content = await fs.readFile(inputPath, "utf-8");
    const parsed = JSON.parse(content);

    const { value: converted, changed } = convertDocument(parsed, {
      referencePaths: referenceMap.get(fileName) || null,
      currentPath: "",
      currentKey: "",
    });

    totalConverted += changed;
    fileSummaries.push({ fileName, changed });

    await fs.writeFile(outputPath, `${JSON.stringify(converted, null, 2)}\n`, "utf-8");
  }

  console.log(`Converted backup written to: ${outputDir}`);
  console.log(`Total ObjectId strings converted: ${totalConverted}`);
  for (const summary of fileSummaries) {
    if (summary.changed > 0) {
      console.log(`  ${summary.fileName}: ${summary.changed}`);
    }
  }
}

run().catch((error) => {
  console.error(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
