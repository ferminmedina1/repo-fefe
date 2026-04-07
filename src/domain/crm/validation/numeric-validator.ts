// Task 14 - Numeric Limits: Add constraints on numeric fields
// Prevents overflow, underflow, and invalid numeric data

import { NumericConstraint, ValidationError, ValidationResult } from "../types/bulk-operations.ts";

/**
 * Numeric field constraints and validation
 * Ensures numeric data stays within acceptable ranges
 */
export class NumericValidator {
  /**
   * Define constraints for CRM numeric fields
   */
  private static readonly CRM_CONSTRAINTS: Record<string, NumericConstraint> = {
    // Deal/opportunity fields
    opportunity_value: {
      field: "opportunity_value",
      min: 0,
      max: 999_999_999,
      precision: 2,
      allowNegative: false,
      allowZero: true,
    },
    probability: {
      field: "probability",
      min: 0,
      max: 100,
      precision: 2,
      allowNegative: false,
      allowZero: true,
    },
    discount_percentage: {
      field: "discount_percentage",
      min: 0,
      max: 100,
      precision: 2,
      allowNegative: false,
      allowZero: true,
    },
    tax_rate: {
      field: "tax_rate",
      min: 0,
      max: 100,
      precision: 4,
      allowNegative: false,
      allowZero: true,
    },
    // Contact fields
    phone_calls: {
      field: "phone_calls",
      min: 0,
      max: 999_999,
      precision: 0,
      allowNegative: false,
      allowZero: true,
    },
    score: {
      field: "score",
      min: 0,
      max: 100,
      precision: 1,
      allowNegative: false,
      allowZero: true,
    },
    employee_count: {
      field: "employee_count",
      min: 1,
      max: 999_999,
      precision: 0,
      allowNegative: false,
      allowZero: false,
    },
    annual_revenue: {
      field: "annual_revenue",
      min: 0,
      max: 999_999_999_999, // 1 trillion
      precision: 2,
      allowNegative: false,
      allowZero: true,
    },
  };

  /**
   * Validate numeric value against constraints
   */
  static validateNumericField(
    fieldName: string,
    value: unknown,
    customConstraint?: NumericConstraint
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const constraint = customConstraint || NumericValidator.CRM_CONSTRAINTS[fieldName];

    if (!constraint) {
      return { valid: true, errors };
    }

    // Type check
    const numValue = Number(value);
    if (isNaN(numValue)) {
      errors.push({
        field: fieldName,
        message: "Value must be a number",
        value,
        rule: "not_a_number",
      });
      return { valid: false, errors };
    }

    // Negative check
    if (numValue < 0 && !constraint.allowNegative) {
      errors.push({
        field: fieldName,
        message: "Value cannot be negative",
        value: numValue,
        rule: "negative_not_allowed",
      });
    }

    // Zero check
    if (numValue === 0 && !constraint.allowZero) {
      errors.push({
        field: fieldName,
        message: "Value cannot be zero",
        value: numValue,
        rule: "zero_not_allowed",
      });
    }

    // Min constraint
    if (constraint.min !== undefined && numValue < constraint.min) {
      errors.push({
        field: fieldName,
        message: `Value must be at least ${constraint.min}`,
        value: numValue,
        rule: "below_minimum",
      });
    }

    // Max constraint
    if (constraint.max !== undefined && numValue > constraint.max) {
      errors.push({
        field: fieldName,
        message: `Value cannot exceed ${constraint.max}`,
        value: numValue,
        rule: "exceeds_maximum",
      });
    }

    // Precision check
    if (constraint.precision !== undefined) {
      const decimalPlaces = (numValue.toString().split(".")[1] || "").length;
      if (decimalPlaces > constraint.precision) {
        errors.push({
          field: fieldName,
          message: `Value can have at most ${constraint.precision} decimal places`,
          value: numValue,
          rule: "precision_exceeded",
        });
      }
    }

    // Detect potential overflow
    if (Math.abs(numValue) > Number.MAX_SAFE_INTEGER) {
      errors.push({
        field: fieldName,
        message: "Value exceeds maximum safe integer (loss of precision)",
        value: numValue,
        rule: "integer_overflow",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate multiple numeric fields at once
   */
  static validateNumericFields(
    data: Record<string, unknown>,
    constraints?: Record<string, NumericConstraint>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [fieldName, value] of Object.entries(data)) {
      const fieldConstraint = constraints?.[fieldName];
      const validation = NumericValidator.validateNumericField(
        fieldName,
        value,
        fieldConstraint
      );

      if (!validation.valid) {
        errors.push(...validation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Safe numeric conversion with constraints
   * Returns normalized value if valid, null if invalid
   */
  static safeConvert(
    value: unknown,
    fieldName: string,
    constraint?: NumericConstraint
  ): number | null {
    const validation = NumericValidator.validateNumericField(
      fieldName,
      value,
      constraint
    );

    if (!validation.valid) {
      return null;
    }

    const numValue = Number(value);
    const constraintToUse = constraint || NumericValidator.CRM_CONSTRAINTS[fieldName];

    if (!constraintToUse?.precision) {
      return numValue;
    }

    // Apply precision rounding
    const precision = constraintToUse.precision;
    return Math.round(numValue * Math.pow(10, precision)) / Math.pow(10, precision);
  }

  /**
   * Format numeric value for display
   */
  static formatForDisplay(
    value: number,
    fieldName: string,
    locale: string = "es-ES"
  ): string {
    const constraint = NumericValidator.CRM_CONSTRAINTS[fieldName];

    // Currency fields
    if (fieldName.includes("value") || fieldName.includes("revenue")) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }

    // Percentage fields
    if (fieldName.includes("percentage") || fieldName.includes("rate") || fieldName === "probability") {
      return `${value.toFixed(constraint?.precision || 1)}%`;
    }

    // Default numeric formatting
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: constraint?.precision || 0,
      maximumFractionDigits: constraint?.precision || 0,
    }).format(value);
  }

  /**
   * Get constraint for field
   */
  static getConstraint(fieldName: string): NumericConstraint | undefined {
    return NumericValidator.CRM_CONSTRAINTS[fieldName];
  }

  /**
   * Get all constraints
   */
  static getAllConstraints(): Record<string, NumericConstraint> {
    return { ...NumericValidator.CRM_CONSTRAINTS };
  }

  /**
   * Add custom constraint (for new fields)
   */
  static addConstraint(fieldName: string, constraint: NumericConstraint): void {
    NumericValidator.CRM_CONSTRAINTS[fieldName] = constraint;
  }
}

/**
 * Hook for React components
 */
export function useNumericValidation(fieldName: string) {
  const constraint = NumericValidator.getConstraint(fieldName);

  return {
    validate: (value: unknown) =>
      NumericValidator.validateNumericField(fieldName, value, constraint),
    convert: (value: unknown) =>
      NumericValidator.safeConvert(value, fieldName, constraint),
    format: (value: number, locale?: string) =>
      NumericValidator.formatForDisplay(value, fieldName, locale),
    constraint,
  };
}

/**
 * Middleware for numeric field validation in update operations
 */
export function createNumericFieldValidator(
  constraints: Record<string, NumericConstraint> = {}
) {
  return (data: Record<string, unknown>) => {
    return NumericValidator.validateNumericFields(data, constraints);
  };
}
