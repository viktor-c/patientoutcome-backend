import { readFileSync } from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { logger } from "@/common/utils/logger";
import type { IcdOpsEntry } from "./icdopsModel";

// ──────────────────────────────────────────────────────────────
// XML ClaML Parser
//
// Parses the BfArM ClaML 2.0 XML files for ICD-10-GM and OPS
// into a flat, searchable array of { code, label, kind } objects.
//
// The parser extracts Class elements with their code, kind and
// the preferred Rubric label. We keep chapters, blocks and
// categories so users can browse the hierarchy if needed, but
// the default search only returns categories.
// ──────────────────────────────────────────────────────────────

/**
 * Resolve the path to an XML classification file inside the ICD-OPS data folder.
 * The data folder is at `src/ICD-OPS/` relative to project root in dev,
 * or bundled next to the dist output in production.
 */
function resolveDataPath(relativePath: string): string {
  // In dev the source lives under src/ICD-OPS/..., in prod it's copied to dist/ICD-OPS/...
  // Try source first, then fall back to `dist/`.
  const srcPath = path.resolve(__dirname, "../../ICD-OPS", relativePath);
  try {
    readFileSync(srcPath, { flag: "r" }); // just check existence
    return srcPath;
  } catch {
    // fallback: dist-relative path (when running from built output)
    return path.resolve(__dirname, "../ICD-OPS", relativePath);
  }
}

// Paths inside the ICD-OPS data folder
const ICD_XML_RELATIVE =
  "icd10gm2026syst-claml/Klassifikationsdateien/icd10gm2026syst_claml_20250912.xml";
const OPS_XML_RELATIVE =
  "ops2026syst-claml/Klassifikationsdateien/ops2026syst_claml_20251017.xml";

/**
 * Extract the preferred label text from a Rubric element (or array of Rubrics).
 * ClaML stores labels as Rubric children of Class; there can be several Rubric
 * elements (preferred, inclusion, exclusion, note …). We want "preferred".
 */
function extractPreferredLabel(rubrics: any): string {
  if (!rubrics) return "";

  const rubricArray = Array.isArray(rubrics) ? rubrics : [rubrics];

  for (const rubric of rubricArray) {
    if (rubric?.["@_kind"] === "preferred" || rubric?.["@_kind"] === "preferredLong") {
      const label = rubric?.Label;
      if (!label) continue;

      // Label can be a string or an object with #text / Para children
      if (typeof label === "string") return label.trim();
      if (typeof label === "object") {
        // Direct text content
        if (label["#text"]) return String(label["#text"]).trim();
        // May have xml:space attribute and text
        if (label["@_xml:space"] && typeof label["#text"] === "undefined") {
          // Label might be wrapped in <Para>
          if (label.Para) {
            const para = label.Para;
            return typeof para === "string" ? para.trim() : String(para).trim();
          }
        }
        // Fallback: try to stringify it sensibly
        const text = label["#text"] ?? label.Para ?? label["Fragment"] ?? "";
        if (typeof text === "string") return text.trim();
        if (Array.isArray(text)) return text.filter((t: any) => typeof t === "string").join(" ").trim();
        return String(text).trim();
      }
      return String(label).trim();
    }
  }

  // If no preferred rubric found, try the first one with a label
  for (const rubric of rubricArray) {
    const label = rubric?.Label;
    if (label) {
      if (typeof label === "string") return label.trim();
      if (typeof label === "object" && label["#text"]) return String(label["#text"]).trim();
    }
  }

  return "";
}

/**
 * Parse a ClaML XML file and return an array of IcdOpsEntry objects.
 *
 * @param xmlFilePath Absolute path to the ClaML XML file
 * @returns Array of parsed entries
 */
export function parseClamlXml(xmlFilePath: string): IcdOpsEntry[] {
  const TAG = "icdopsClamlParser";

  logger.info(`${TAG}: Parsing ClaML XML file: ${xmlFilePath}`);
  const startTime = Date.now();

  const xmlContent = readFileSync(xmlFilePath, "utf-8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => name === "Class" || name === "Rubric" || name === "SubClass",
    textNodeName: "#text",
  });

  const parsed = parser.parse(xmlContent);
  const claml = parsed?.ClaML;

  if (!claml) {
    throw new Error(`${TAG}: Invalid ClaML XML – missing root ClaML element in ${xmlFilePath}`);
  }

  const classes: any[] = claml.Class ?? [];
  const entries: IcdOpsEntry[] = [];

  for (const cls of classes) {
    const code = cls["@_code"];
    const kind = cls["@_kind"];

    if (!code || !kind) continue;
    // Only keep chapter, block, category
    if (!["chapter", "block", "category"].includes(kind)) continue;

    const label = extractPreferredLabel(cls.Rubric);

    entries.push({
      code,
      label,
      kind: kind as IcdOpsEntry["kind"],
    });
  }

  const elapsed = Date.now() - startTime;
  logger.info(`${TAG}: Parsed ${entries.length} entries from ${xmlFilePath} in ${elapsed}ms`);

  return entries;
}

/**
 * Parse the ICD-10-GM 2026 ClaML XML file.
 */
export function parseIcdData(): IcdOpsEntry[] {
  const filePath = resolveDataPath(ICD_XML_RELATIVE);
  return parseClamlXml(filePath);
}

/**
 * Parse the OPS 2026 ClaML XML file.
 */
export function parseOpsData(): IcdOpsEntry[] {
  const filePath = resolveDataPath(OPS_XML_RELATIVE);
  return parseClamlXml(filePath);
}
