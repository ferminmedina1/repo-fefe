// Task 13 - Tags Validation: Server-side validation required
// Prevents invalid or malicious tags from being stored

import { z } from "https://esm.sh/zod@3.22.4";
import { ValidationError, ValidationResult } from "../types/bulk-operations.ts";

/**
 * Tag validation schema and rules
 * Ensures tags are safe, properly formatted, and within constraints
 */
export class TagValidator {
  // Schema validation
  private static readonly TAG_SCHEMA = z.object({
    id: z.string().uuid().optional(),
    name: z
      .string()
      .trim()
      .min(3, "Tag must be at least 3 characters")
      .max(50, "Tag must not exceed 50 characters")
      .regex(
        /^[a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s\-_.]+$/,
        "Tag contains invalid characters (only alphanumeric, spaces, hyphens, underscores, dots allowed)"
      ),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format (use #RRGGBB)")
      .optional(),
    description: z
      .string()
      .max(200, "Description must not exceed 200 characters")
      .optional(),
    companyId: z.string().uuid("Invalid company ID"),
  });

  private static readonly BATCH_TAG_SCHEMA = z.array(
    TagValidator.TAG_SCHEMA
  );

  // Reserved tags that cannot be created
  private static readonly RESERVED_TAGS = [
    "spam",
    "delete",
    "deleted",
    "admin",
    "system",
    "internal",
  ];

  /**
   * Validate single tag
   */
  static validateTag(tag: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      const validated = TagValidator.TAG_SCHEMA.parse(tag);

      // Check reserved tags
      if (TagValidator.RESERVED_TAGS.includes(validated.name.toLowerCase())) {
        errors.push({
          field: "name",
          message: `"${validated.name}" is a reserved tag name`,
          value: validated.name,
          rule: "reserved_tag",
        });
      }

      // Check for duplicate-like names (fuzzy matching)
      const normalized = validated.name.toLowerCase().replace(/\s+/g, " ");
      if (TagValidator.RESERVED_TAGS.some(rt => normalized.includes(rt))) {
        errors.push({
          field: "name",
          message: "Tag name is too similar to a reserved word",
          value: validated.name,
          rule: "similar_to_reserved",
        });
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            field: err.path.join("."),
            message: err.message,
            rule: err.code,
          });
        });
      } else {
        errors.push({
          field: "tag",
          message: "Invalid tag format",
        });
      }

      return { valid: false, errors };
    }
  }

  /**
   * Validate multiple tags (batch)
   */
  static validateBatch(tags: unknown[]): ValidationResult {
    const errors: ValidationError[] = [];
    const seenNames = new Set<string>();

    try {
      // Validate structure
      const validated = TagValidator.BATCH_TAG_SCHEMA.parse(tags);

      // Validate each tag individually
      validated.forEach((tag, index) => {
        const singleValidation = TagValidator.validateTag(tag);
        
        singleValidation.errors.forEach(err => {
          errors.push({
            ...err,
            field: `tags[${index}].${err.field}`,
          });
        });

        // Check for duplicates within batch
        const normalized = tag.name.toLowerCase();
        if (seenNames.has(normalized)) {
          errors.push({
            field: `tags[${index}].name`,
            message: "Duplicate tag name in batch",
            value: tag.name,
            rule: "duplicate_in_batch",
          });
        }
        seenNames.add(normalized);
      });

      // Limit batch size
      if (validated.length > 50) {
        errors.push({
          field: "tags",
          message: "Cannot create more than 50 tags at once",
          rule: "batch_size_exceeded",
        });
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            field: err.path.join("."),
            message: err.message,
            rule: err.code,
          });
        });
      }

      return { valid: false, errors };
    }
  }

  /**
   * Sanitize tag name (remove XSS vectors)
   */
  static sanitizeTagName(name: string): string {
    return (
      name
        .trim()
        // Remove script tags and similar
        .replace(/<script[^>]*>.*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, "")
        // Remove control characters
        .replace(/[\x00-\x1F\x7F]/g, "")
        // Collapse multiple spaces
        .replace(/\s+/g, " ")
        // Trim again
        .trim()
    );
  }

  /**
   * Get tag suggestions based on user input (for autocomplete)
   * Server-side calculation to prevent client manipulation
   */
  static getSuggestions(
    input: string,
    existingTags: string[],
    maxSuggestions: number = 5
  ): string[] {
    if (!input || input.length < 2) return [];

    const sanitized = TagValidator.sanitizeTagName(input).toLowerCase();
    
    return existingTags
      .filter(tag => 
        tag.toLowerCase().includes(sanitized) && 
        !existingTags.includes(tag)
      )
      .slice(0, maxSuggestions);
  }
}

/**
 * Server-side validation for tag operations
 * Must be called before any tag is stored in database
 */
export async function validateTagsServerSide(
  tags: unknown[],
  companyId: string,
  existingTags?: string[]
): Promise<{ valid: boolean; errors: ValidationError[]; sanitized?: unknown[] }> {
  const validation = TagValidator.validateBatch(tags);

  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
    };
  }

  // Additional server-side checks
  const serverErrors: ValidationError[] = [];

  // Check if any tags already exist in company
  if (existingTags) {
    const tagNames = tags.map((t: any) => t.name.toLowerCase());
    const duplicates = tagNames.filter(name => 
      existingTags.some(existing => existing.toLowerCase() === name)
    );

    if (duplicates.length > 0) {
      serverErrors.push({
        field: "tags",
        message: `Tags already exist: ${duplicates.join(", ")}`,
        rule: "duplicate_in_system",
      });
    }
  }

  if (serverErrors.length > 0) {
    return {
      valid: false,
      errors: [...validation.errors, ...serverErrors],
    };
  }

  // Sanitize names
  const sanitized = tags.map((t: any) => ({
    ...t,
    name: TagValidator.sanitizeTagName(t.name),
  }));

  return {
    valid: true,
    errors: [],
    sanitized,
  };
}

/**
 * Hook for components using tag validation
 */
export function useTagValidation() {
  return {
    validateTag: (tag: unknown) => TagValidator.validateTag(tag),
    validateBatch: (tags: unknown[]) => TagValidator.validateBatch(tags),
    sanitize: (name: string) => TagValidator.sanitizeTagName(name),
    getSuggestions: (input: string, existing: string[]) =>
      TagValidator.getSuggestions(input, existing),
  };
}
