import { describe, expect, it } from "vitest";
import {
  escapeRegex,
  removeScripts,
  sanitizeHtml,
  sanitizeSearchQuery,
  validateSessionSecret,
} from "../securityUtils";

describe("securityUtils", () => {
  describe("escapeRegex", () => {
    it("should escape special regex characters", () => {
      expect(escapeRegex("hello.*world")).toBe("hello\\.\\*world");
      expect(escapeRegex("test[123]")).toBe("test\\[123\\]");
      expect(escapeRegex("a+b?c^d$e")).toBe("a\\+b\\?c\\^d\\$e");
      expect(escapeRegex("{foo}(bar)|baz")).toBe("\\{foo\\}\\(bar\\)\\|baz");
    });

    it("should handle strings without special characters", () => {
      expect(escapeRegex("hello")).toBe("hello");
      expect(escapeRegex("test123")).toBe("test123");
    });

    it("should handle empty strings", () => {
      expect(escapeRegex("")).toBe("");
    });

    it("should escape backslashes", () => {
      expect(escapeRegex("path\\to\\file")).toBe("path\\\\to\\\\file");
    });
  });

  describe("sanitizeSearchQuery", () => {
    it("should sanitize valid search queries", () => {
      expect(sanitizeSearchQuery("patient123")).toBe("patient123");
      expect(sanitizeSearchQuery("  test  ")).toBe("test");
    });

    it("should escape special regex characters in queries", () => {
      expect(sanitizeSearchQuery("pat.*123")).toBe("pat\\.\\*123");
      expect(sanitizeSearchQuery("test[abc]")).toBe("test\\[abc\\]");
    });

    it("should return null for invalid queries", () => {
      expect(sanitizeSearchQuery("")).toBeNull();
      expect(sanitizeSearchQuery("   ")).toBeNull();
      expect(sanitizeSearchQuery("a".repeat(101))).toBeNull(); // Exceeds max length
    });

    it("should handle non-string inputs", () => {
      //@ts-ignore - testing invalid input
      expect(sanitizeSearchQuery(null)).toBeNull();
      //@ts-ignore - testing invalid input
      expect(sanitizeSearchQuery(undefined)).toBeNull();
      //@ts-ignore - testing invalid input
      expect(sanitizeSearchQuery(123)).toBeNull();
    });

    it("should respect custom max length", () => {
      expect(sanitizeSearchQuery("short", 10)).toBe("short");
      expect(sanitizeSearchQuery("toolongstring", 5)).toBeNull();
    });
  });

  describe("validateSessionSecret", () => {
    it("should accept strong secrets", () => {
      const result = validateSessionSecret("MyStr0ng$ecretWith32Characters!!");
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it("should reject short secrets", () => {
      const result = validateSessionSecret("short");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 32 characters");
    });

    it("should reject secrets with low entropy", () => {
      const result = validateSessionSecret("a".repeat(40));
      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 3 of");
    });

    it("should reject secrets with only 2 character types", () => {
      const result = validateSessionSecret("abcdefghijklmnopqrstuvwxyz123456");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 3 of");
    });

    it("should accept secrets with 3 character types", () => {
      const result = validateSessionSecret("ABCdefghijklmnopqrstuvwxyz123456");
      expect(result.valid).toBe(true);
    });

    it("should accept secrets with all 4 character types", () => {
      const result = validateSessionSecret("MyStr0ng$ecretWithAllCharacterTypes!!!");
      expect(result.valid).toBe(true);
    });
  });

  describe("sanitizeHtml", () => {
    it("should escape HTML special characters", () => {
      expect(sanitizeHtml("<div>Hello</div>")).toBe("&lt;div&gt;Hello&lt;&#x2F;div&gt;");
      expect(sanitizeHtml('test "quoted" text')).toBe("test &quot;quoted&quot; text");
      expect(sanitizeHtml("a & b")).toBe("a &amp; b");
    });

    it("should escape single quotes", () => {
      expect(sanitizeHtml("it's working")).toBe("it&#x27;s working");
    });

    it("should handle empty strings", () => {
      expect(sanitizeHtml("")).toBe("");
    });

    it("should escape slashes", () => {
      expect(sanitizeHtml("path/to/file")).toBe("path&#x2F;to&#x2F;file");
    });

    it("should escape multiple special characters", () => {
      const input = '<script>alert("XSS")</script>';
      const output = sanitizeHtml(input);
      expect(output).toBe("&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;");
    });
  });

  describe("removeScripts", () => {
    it("should remove script tags", () => {
      const input = '<div>Safe content</div><script>alert("XSS")</script><p>More content</p>';
      const output = removeScripts(input);
      expect(output).not.toContain("<script>");
      expect(output).toContain("<div>Safe content</div>");
      expect(output).toContain("<p>More content</p>");
    });

    it("should remove inline event handlers", () => {
      const input = '<button onclick="doEvil()">Click me</button>';
      const output = removeScripts(input);
      expect(output).not.toContain("onclick");
      expect(output).toContain("<button");
    });

    it("should remove various event handlers", () => {
      const handlers = [
        '<img onerror="alert(1)" src="x">',
        '<div onload="doEvil()">test</div>',
        '<a onmouseover="steal()">link</a>',
      ];

      for (const input of handlers) {
        const output = removeScripts(input);
        expect(output).not.toMatch(/on\w+=/);
      }
    });

    it("should handle empty strings", () => {
      expect(removeScripts("")).toBe("");
    });

    it("should handle strings without scripts", () => {
      const input = "<div>Safe content</div>";
      expect(removeScripts(input)).toBe(input);
    });

    it("should remove multiple script tags", () => {
      const input = '<script>bad1()</script><div>good</div><script>bad2()</script>';
      const output = removeScripts(input);
      expect(output).not.toContain("<script>");
      expect(output).toContain("<div>good</div>");
    });

    it("should handle script tags with attributes", () => {
      const input = '<script type="text/javascript" src="evil.js">alert("XSS")</script>';
      const output = removeScripts(input);
      expect(output).not.toContain("<script>");
    });
  });

  describe("ReDoS prevention", () => {
    it("should handle potentially malicious regex patterns efficiently", () => {
      const maliciousPatterns = [
        "a*a*a*a*a*a*a*a*a*a*a*a*a*a*b",
        "(a+)+",
        "(a|a)*",
        "(a|ab)*",
        "^(a+)+$",
      ];

      for (const pattern of maliciousPatterns) {
        const start = Date.now();
        const escaped = escapeRegex(pattern);
        const duration = Date.now() - start;

        // Should complete quickly (< 100ms)
        expect(duration).toBeLessThan(100);

        // Create a RegExp with the escaped pattern to ensure it's safe
        const regex = new RegExp(escaped);
        const testString = "a".repeat(30) + "b";

        const testStart = Date.now();
        regex.test(testString);
        const testDuration = Date.now() - testStart;

        // Regex test should also be fast
        expect(testDuration).toBeLessThan(10);
      }
    });
  });
});
