// Task 18 - Search Length Limits: Add max-length validation
// Prevents ReDoS attacks and database overload from excessive search queries

import { SearchConstraints, ValidationError, ValidationResult } from "../types/bulk-operations.ts";

/**
 * Search query validation and constraints
 * Protects against:
 * - ReDoS (Regular Expression Denial of Service) attacks
 * - Database overload from complex queries
 * - Performance degradation from long strings
 */
export class SearchValidator {
  /**
   * Default search constraints for CRM
   */
  private static readonly DEFAULT_CONSTRAINTS: SearchConstraints = {
    maxLength: 100,
    minLength: 2,
    allowedChars: /^[a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s\-_.@:()]*$/,
    forbiddenPatterns: [
      /script|<|>|\/\*/i, // HTML/JS injection
      /;|\||&&|`/i, // Command injection
      /['"`]/i, // SQL injection vectors
      /\\/i, // Escape sequences
    ],
  };

  /**
   * Search context-specific constraints
   */
  private static readonly CONTEXT_CONSTRAINTS: Record<string, SearchConstraints> = {
    email: {
      maxLength: 254, // RFC 5321 max email length
      minLength: 1,
      allowedChars: /^[a-z0-9\s\-_.@+]*$/i,
      forbiddenPatterns: [/<|>|script|;/i],
    },
    phone: {
      maxLength: 20,
      minLength: 5,
      allowedChars: /^[\d\s\-+()]*$/,
      forbiddenPatterns: [/<|>|script|;/i],
    },
    company_name: {
      maxLength: 100,
      minLength: 1,
      allowedChars: /^[a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s\-_.&(),]*$/,
      forbiddenPatterns: [/<|>|script|;/i],
    },
    opportunity_name: {
      maxLength: 100,
      minLength: 1,
      allowedChars: /^[a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s\-_.&(),]*$/,
      forbiddenPatterns: [/<|>|script|;/i],
    },
    tag_name: {
      maxLength: 50,
      minLength: 1,
      allowedChars: /^[a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s\-_.]*$/,
      forbiddenPatterns: [/<|>|script|;/i],
    },
  };

  /**
   * Validate search query
   */
  static validateSearchQuery(
    query: unknown,
    context: string = "general"
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof query !== "string") {
      errors.push({
        field: "query",
        message: "Search query must be a string",
      });
      return { valid: false, errors };
    }

    const constraints =
      SearchValidator.CONTEXT_CONSTRAINTS[context] ||
      SearchValidator.DEFAULT_CONSTRAINTS;

    // Length validation
    if (query.length < constraints.minLength) {
      errors.push({
        field: "query",
        message: `Search query must be at least ${constraints.minLength} characters`,
        value: query,
        rule: "min_length",
      });
    }

    if (query.length > constraints.maxLength) {
      errors.push({
        field: "query",
        message: `Search query cannot exceed ${constraints.maxLength} characters (current: ${query.length})`,
        value: query,
        rule: "max_length",
      });
    }

    // Character validation
    if (
      constraints.allowedChars &&
      !constraints.allowedChars.test(query)
    ) {
      errors.push({
        field: "query",
        message: "Search query contains invalid characters",
        value: query,
        rule: "invalid_chars",
      });
    }

    // Forbidden pattern validation
    if (constraints.forbiddenPatterns) {
      for (const pattern of constraints.forbiddenPatterns) {
        if (pattern.test(query)) {
          errors.push({
            field: "query",
            message: "Search query contains forbidden characters or patterns",
            value: query,
            rule: "forbidden_pattern",
          });
          break;
        }
      }
    }

    // ReDoS detection: look for complex regex patterns
    if (SearchValidator.containsRegexPattern(query)) {
      errors.push({
        field: "query",
        message: "Search query appears to contain regex patterns (not allowed)",
        value: query,
        rule: "regex_not_allowed",
      });
    }

    // Unicode/encoding attack detection
    if (SearchValidator.containsUnicodeEscape(query)) {
      errors.push({
        field: "query",
        message: "Search query contains suspicious unicode escapes",
        value: query,
        rule: "unicode_escape_detected",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate multiple search filters
   */
  static validateSearchFilters(
    filters: Record<string, unknown>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [fieldName, value] of Object.entries(filters)) {
      if (typeof value === "string" && value.length > 0) {
        const validation = SearchValidator.validateSearchQuery(value, fieldName);

        if (!validation.valid) {
          errors.push(...validation.errors);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize search query (remove dangerous characters)
   */
  static sanitizeSearchQuery(query: string, context: string = "general"): string {
    let sanitized = query;

    const constraints =
      SearchValidator.CONTEXT_CONSTRAINTS[context] ||
      SearchValidator.DEFAULT_CONSTRAINTS;

    // Remove forbidden characters
    if (constraints.forbiddenPatterns) {
      for (const pattern of constraints.forbiddenPatterns) {
        sanitized = sanitized.replace(pattern, "");
      }
    }

    // Remove HTML/script tags
    sanitized = sanitized.replace(/<[^>]*>/g, "");

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

    // Collapse multiple spaces
    sanitized = sanitized.replace(/\s+/g, " ");

    // Trim
    sanitized = sanitized.trim();

    // Enforce max length
    if (sanitized.length > constraints.maxLength) {
      sanitized = sanitized.substring(0, constraints.maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Detect regex patterns in search query (ReDoS prevention)
   */
  private static containsRegexPattern(query: string): boolean {
    // Look for regex meta characters and patterns
    const regexPatterns = [
      /\[.*\]/, // Character class
      /\(.*\)/, // Grouping
      /\|/, // Alternation
      /\*|\+|\?/, // Quantifiers
      /\\[a-z]/i, // Escapes
      /\{.*\}/, // Repetition
    ];

    return regexPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Detect unicode escape sequences (encoding attacks)
   */
  private static containsUnicodeEscape(query: string): boolean {
    return /\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}|%u[0-9a-fA-F]{4}/.test(
      query
    );
  }

  /**
   * Calculate search complexity score
   * Higher score = more complex = more likely to cause issues
   */
  static calculateComplexityScore(query: string): number {
    let score = 0;

    // Length penalty
    score += Math.min(query.length / 10, 10);

    // Special character count
    const specialChars = query.match(/[^\w\s]/g) || [];
    score += specialChars.length * 2;

    // Unicode characters
    const unicodeChars = query.match(/[^\x00-\x7F]/g) || [];
    score += unicodeChars.length * 3;

    // Repeated characters (potential ReDoS)
    const hasRepeatedChars = /(.)\1{3,}/.test(query);
    score += hasRepeatedChars ? 20 : 0;

    // Complex patterns
    if (SearchValidator.containsRegexPattern(query)) {
      score += 50;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Rate limit search based on complexity
   */
  static shouldRateLimitSearch(
    query: string,
    isAdminUser: boolean = false
  ): boolean {
    const complexityScore = SearchValidator.calculateComplexityScore(
      query
    );
    const threshold = isAdminUser ? 80 : 60;

    return complexityScore > threshold;
  }

  /**
   * Get search constraint info for context
   */
  static getConstraints(context: string = "general"): SearchConstraints {
    return (
      SearchValidator.CONTEXT_CONSTRAINTS[context] ||
      SearchValidator.DEFAULT_CONSTRAINTS
    );
  }
}

/**
 * Hook for React components
 */
export function useSearchValidation(context: string = "general") {
  return {
    validate: (query: unknown) =>
      SearchValidator.validateSearchQuery(query, context),
    validateFilters: (filters: Record<string, unknown>) =>
      SearchValidator.validateSearchFilters(filters),
    sanitize: (query: string) =>
      SearchValidator.sanitizeSearchQuery(query, context),
    getComplexity: (query: string) =>
      SearchValidator.calculateComplexityScore(query),
    shouldRateLimit: (query: string, isAdmin?: boolean) =>
      SearchValidator.shouldRateLimitSearch(query, isAdmin),
    getConstraints: () => SearchValidator.getConstraints(context),
  };
}

/**
 * Middleware for search endpoint
 */
export function createSearchValidator(context: string = "general") {
  return (query: unknown) => {
    const validation = SearchValidator.validateSearchQuery(query, context);

    if (!validation.valid) {
      throw new Error(
        `Invalid search query: ${validation.errors
          .map(e => e.message)
          .join(", ")}`
      );
    }

    const sanitized = SearchValidator.sanitizeSearchQuery(
      query as string,
      context
    );
    const complexity = SearchValidator.calculateComplexityScore(sanitized);
    const shouldRateLimit = SearchValidator.shouldRateLimitSearch(sanitized);

    return {
      query: sanitized,
      complexity,
      shouldRateLimit,
    };
  };
}

/**
 * Database query builder with search validation
 */
export class SafeSearchQueryBuilder {
  private query: string;
  private filters: Record<string, string> = {};

  constructor(baseQuery: string) {
    this.query = baseQuery;
  }

  addFilter(fieldName: string, searchValue: unknown, context?: string): this {
    const validation = SearchValidator.validateSearchQuery(
      searchValue,
      context || fieldName
    );

    if (!validation.valid) {
      throw new Error(
        `Invalid filter for ${fieldName}: ${validation.errors
          .map(e => e.message)
          .join(", ")}`
      );
    }

    const sanitized = SearchValidator.sanitizeSearchQuery(
      searchValue as string,
      context || fieldName
    );

    this.filters[fieldName] = sanitized;
    return this;
  }

  build(): { query: string; filters: Record<string, string> } {
    return {
      query: this.query,
      filters: this.filters,
    };
  }
}
