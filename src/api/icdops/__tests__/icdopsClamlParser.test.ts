import { describe, it, expect } from "vitest";
import { parseClamlXml, parseIcdData, parseOpsData } from "@/api/icdops/icdopsClamlParser";
import path from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";

// ──────────────────────────────────────────────────────────────
// ClaML Parser Unit Tests
// ──────────────────────────────────────────────────────────────

describe("ClaML XML Parser", () => {
  describe("parseClamlXml", () => {
    it("parses a minimal valid ClaML XML", () => {
      const tmpDir = path.join(os.tmpdir(), "claml-test-" + Date.now());
      mkdirSync(tmpDir, { recursive: true });
      const xmlPath = path.join(tmpDir, "test.xml");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ClaML version="2.0.0">
  <Title name="Test" version="2026">Test Classification</Title>
  <ClassKinds>
    <ClassKind name="category"/>
    <ClassKind name="chapter"/>
  </ClassKinds>
  <Class code="I" kind="chapter">
    <Rubric kind="preferred">
      <Label xml:lang="de-DE">Kapitel I</Label>
    </Rubric>
  </Class>
  <Class code="A00" kind="category">
    <Rubric kind="preferred">
      <Label xml:lang="de-DE">Cholera</Label>
    </Rubric>
  </Class>
  <Class code="A00.0" kind="category">
    <Rubric kind="preferred">
      <Label xml:lang="de-DE">Cholera durch Vibrio cholerae</Label>
    </Rubric>
    <Rubric kind="inclusion">
      <Label xml:lang="de-DE">Klassische Cholera</Label>
    </Rubric>
  </Class>
  <Class code="A00-A09" kind="block">
    <Rubric kind="preferred">
      <Label xml:lang="de-DE">Infektiöse Darmkrankheiten</Label>
    </Rubric>
  </Class>
</ClaML>`;

      writeFileSync(xmlPath, xml, "utf-8");

      const entries = parseClamlXml(xmlPath);

      expect(entries).toHaveLength(4);

      // Chapter
      const chapter = entries.find((e) => e.code === "I");
      expect(chapter).toBeDefined();
      expect(chapter!.kind).toBe("chapter");
      expect(chapter!.label).toBe("Kapitel I");

      // Block
      const block = entries.find((e) => e.code === "A00-A09");
      expect(block).toBeDefined();
      expect(block!.kind).toBe("block");
      expect(block!.label).toBe("Infektiöse Darmkrankheiten");

      // Category
      const cat = entries.find((e) => e.code === "A00");
      expect(cat).toBeDefined();
      expect(cat!.kind).toBe("category");
      expect(cat!.label).toBe("Cholera");

      // Category with inclusion rubric - should use preferred
      const subCat = entries.find((e) => e.code === "A00.0");
      expect(subCat).toBeDefined();
      expect(subCat!.label).toBe("Cholera durch Vibrio cholerae");

      // Cleanup
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("throws on invalid XML without ClaML root", () => {
      const tmpDir = path.join(os.tmpdir(), "claml-test-invalid-" + Date.now());
      mkdirSync(tmpDir, { recursive: true });
      const xmlPath = path.join(tmpDir, "bad.xml");

      writeFileSync(xmlPath, "<Root><Item/></Root>", "utf-8");

      expect(() => parseClamlXml(xmlPath)).toThrow("Invalid ClaML XML");

      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("throws when file does not exist", () => {
      expect(() => parseClamlXml("/nonexistent/path/to/file.xml")).toThrow();
    });
  });

  describe("parseIcdData", () => {
    it("loads the ICD-10-GM 2026 data", () => {
      const entries = parseIcdData();

      expect(entries.length).toBeGreaterThan(10000);

      // Spot-check a known code
      const cholera = entries.find((e) => e.code === "A00");
      expect(cholera).toBeDefined();
      expect(cholera!.label).toBe("Cholera");
      expect(cholera!.kind).toBe("category");

      // Check that chapters exist
      const chapters = entries.filter((e) => e.kind === "chapter");
      expect(chapters.length).toBeGreaterThan(0);

      // Check blocks exist
      const blocks = entries.filter((e) => e.kind === "block");
      expect(blocks.length).toBeGreaterThan(0);
    }, 30_000);
  });

  describe("parseOpsData", () => {
    it("loads the OPS 2026 data", () => {
      const entries = parseOpsData();

      expect(entries.length).toBeGreaterThan(15000);

      // Spot-check a known code
      const catEntry = entries.find((e) => e.code === "1-100");
      expect(catEntry).toBeDefined();
      expect(catEntry!.kind).toBe("category");
      expect(catEntry!.label).toContain("Klinische Untersuchung");

      // Check chapters exist
      const chapters = entries.filter((e) => e.kind === "chapter");
      expect(chapters.length).toBeGreaterThan(0);
    }, 30_000);
  });
});
