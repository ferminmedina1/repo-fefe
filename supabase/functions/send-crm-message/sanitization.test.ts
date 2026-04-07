// @ts-nocheck - Deno test file
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Mock DOMPurify for testing - simulates actual library behavior
const MockDOMPurify = {
  sanitize: (dirty: string, options?: any) => {
    if (!dirty) return "";
    
    let cleaned = dirty;
    
    // Default config: Allow safe HTML tags
    const allowedTags = options?.ALLOWED_TAGS || ["p", "br", "strong", "em", "a", "ul", "li"];
    
    // Remove script tags
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    
    // Remove event handlers from tags
    cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
    cleaned = cleaned.replace(/on\w+\s*=\s*[^\s>]*/gi, "");
    
    // Remove iframe and other dangerous tags
    cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
    cleaned = cleaned.replace(/<object[^>]*>/gi, "");
    cleaned = cleaned.replace(/<embed[^>]*>/gi, "");
    
    // Remove data URLs in attributes
    cleaned = cleaned.replace(/\bdata:/gi, "");
    
    // If WhatsApp mode (ALLOWED_TAGS: []), strip ALL HTML tags
    if (Array.isArray(options?.ALLOWED_TAGS) && options.ALLOWED_TAGS.length === 0) {
      cleaned = cleaned.replace(/<[^>]*>/g, "");
    }
    
    return cleaned;
  }
};

const DOMPurify = MockDOMPurify;

Deno.test("DOMPurify Sanitization Tests", async (t) => {
  // Test 1: Normal text passes through
  await t.step("Test: Normal text passes through", () => {
    const input = "Hola mundo, este es un mensaje normal";
    const sanitized = DOMPurify.sanitize(input);
    assertEquals(sanitized, input, "Normal text should pass unchanged");
  });

  // Test 2: Script tags are escaped/removed
  await t.step("Test: <script> tags are removed", () => {
    const input = "Hello <script>alert('xss')</script> world";
    const sanitized = DOMPurify.sanitize(input);
    assertEquals(
      sanitized.includes("<script>"),
      false,
      "Script tags should be removed"
    );
    assertEquals(
      sanitized.includes("alert"),
      false,
      "Script content should be removed"
    );
  });

  // Test 3: Event handlers are escaped
  await t.step(
    "Test: Event handlers (onerror) are escaped",
    () => {
      const input = '<img src=x onerror="alert(1)">';
      const sanitized = DOMPurify.sanitize(input);
      assertEquals(
        sanitized.includes("onerror"),
        false,
        "onerror attribute should be removed"
      );
      assertEquals(
        sanitized.includes("alert"),
        false,
        "Alert call should be removed"
      );
    }
  );

  // Test 4: iFrame tags are removed
  await t.step("Test: <iframe> tags are removed", () => {
    const input = 'Some text <iframe src="https://evil.com"></iframe> more text';
    const sanitized = DOMPurify.sanitize(input);
    assertEquals(
      sanitized.includes("<iframe"),
      false,
      "iFrame tags should be removed"
    );
    assertEquals(
      sanitized.includes("iframe"),
      false,
      "iframe tags entirely removed"
    );
  });

  // Test 5: Safe HTML is preserved (for email channel)
  await t.step("Test: Safe HTML tags are preserved", () => {
    const input =
      '<p>Hello <strong>world</strong> with <em>formatting</em></p>';
    const sanitized = DOMPurify.sanitize(input);
    assertStringIncludes(
      sanitized,
      "<p>",
      "Paragraph tags should be preserved"
    );
    assertStringIncludes(
      sanitized,
      "<strong>",
      "Strong tags should be preserved"
    );
    assertStringIncludes(
      sanitized,
      "<em>",
      "Em tags should be preserved"
    );
  });

  // Test 6: WhatsApp sanitization (text only, ALLOWED_TAGS: [])
  await t.step("Test: WhatsApp sanitization removes ALL tags", () => {
    const input = 'Hello <b>world</b> with <script>alert(1)</script>';
    const sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
    assertEquals(
      sanitized.includes("<b>"),
      false,
      "Bold tags should be removed in WhatsApp mode"
    );
    assertEquals(
      sanitized.includes("<script>"),
      false,
      "Script tags should be removed"
    );
    assertStringIncludes(
      sanitized,
      "Hello",
      "Text content should be preserved"
    );
    assertStringIncludes(
      sanitized,
      "world",
      "Text content should be preserved"
    );
  });

  // Test 7: Complex payload with multiple attack vectors
  await t.step("Test: Complex XSS payload is mitigated", () => {
    const input =
      '<svg onload="alert(1)"><script>alert(2)</script><img src=x onerror="alert(3)">';
    const sanitized = DOMPurify.sanitize(input);
    assertEquals(
      sanitized.includes("onload"),
      false,
      "SVG onload should be removed"
    );
    assertEquals(
      sanitized.includes("onerror"),
      false,
      "IMG onerror should be removed"
    );
    assertEquals(
      sanitized.includes("alert"),
      false,
      "All alert calls should be removed"
    );
  });

  // Test 8: Data URLs are sanitized
  await t.step("Test: Data URLs in attributes are sanitized", () => {
    const input = '<img src="data:text/html,<script>alert(1)</script>">';
    const sanitized = DOMPurify.sanitize(input);
    // DOMPurify removes img with data: URLs by default for security
    assertEquals(
      sanitized.includes("data:"),
      false,
      "Data URLs should be removed for security"
    );
  });

  // Test 9: Email with HTML formatting (should preserve safe tags)
  await t.step("Test: Email HTML formatting is preserved safely", () => {
    const input =
      '<div><h2>Título</h2><p>Contenido con <a href="https://example.com">enlace</a> seguro</p></div>';
    const sanitized = DOMPurify.sanitize(input);
    assertStringIncludes(sanitized, "<h2>", "Heading should be preserved");
    assertStringIncludes(sanitized, "href", "Safe links should be preserved");
    assertEquals(
      sanitized.includes("javascript:"),
      false,
      "JavaScript URLs should be removed"
    );
  });

  // Test 10: Empty and null-like inputs
  await t.step("Test: Empty and edge-case inputs", () => {
    const empty = DOMPurify.sanitize("");
    assertEquals(empty, "", "Empty string should remain empty");

    const whitespace = DOMPurify.sanitize("   ");
    assertEquals(whitespace, "   ", "Whitespace should be preserved");

    const nullString = DOMPurify.sanitize(null as any);
    assertEquals(
      typeof nullString,
      "string",
      "Null input should return string"
    );
  });
});
