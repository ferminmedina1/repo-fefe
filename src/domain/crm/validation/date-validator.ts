// Task 16 - Date Validation: Proper date formatting and validation
// Prevents invalid dates and ensures consistent date handling

import { DateValidationResult, ValidationError, ValidationResult } from "../types/bulk-operations.ts";

/**
 * Date validation and formatting utility
 * Handles date parsing, validation, and formatting consistently
 */
export class DateValidator {
  // ISO 8601 format for storage: YYYY-MM-DD
  private static readonly ISO_DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
  // ISO 8601 with time: YYYY-MM-DDTHH:mm:ss.fffZ
  private static readonly ISO_DATETIME_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

  /**
   * Validate date string or Date object
   */
  static validateDate(
    value: unknown,
    options: {
      allowFuture?: boolean;
      allowPast?: boolean;
      minDate?: Date;
      maxDate?: Date;
      format?: "ISO_DATE" | "ISO_DATETIME" | "LOCALIZED";
    } = {}
  ): DateValidationResult {
    const {
      allowFuture = true,
      allowPast = true,
      minDate,
      maxDate,
      format = "ISO_DATETIME",
    } = options;

    try {
      let dateToValidate: Date;

      // Parse input
      if (value instanceof Date) {
        dateToValidate = value;
      } else if (typeof value === "string") {
        dateToValidate = new Date(value);
      } else if (typeof value === "number") {
        dateToValidate = new Date(value);
      } else {
        return {
          valid: false,
          error: "Value must be a date, date string, or timestamp",
        };
      }

      // Check if parse was successful
      if (isNaN(dateToValidate.getTime())) {
        return {
          valid: false,
          error: "Invalid date format",
        };
      }

      // Validate format string if provided
      if (typeof value === "string") {
        if (format === "ISO_DATE" && !DateValidator.ISO_DATE_FORMAT.test(value)) {
          return {
            valid: false,
            error: "Date must be in ISO format (YYYY-MM-DD)",
          };
        }
        if (format === "ISO_DATETIME" && !DateValidator.ISO_DATETIME_FORMAT.test(value)) {
          return {
            valid: false,
            error: "DateTime must be in ISO format (YYYY-MM-DDTHH:mm:ss.fffZ)",
          };
        }
      }

      const now = new Date();

      // Check future dates
      if (!allowFuture && dateToValidate > now) {
        return {
          valid: false,
          error: "Future dates are not allowed",
        };
      }

      // Check past dates
      if (!allowPast && dateToValidate < now) {
        return {
          valid: false,
          error: "Past dates are not allowed",
        };
      }

      // Check minimum date
      if (minDate && dateToValidate < minDate) {
        return {
          valid: false,
          error: `Date must be on or after ${DateValidator.formatISO(minDate)}`,
        };
      }

      // Check maximum date
      if (maxDate && dateToValidate > maxDate) {
        return {
          valid: false,
          error: `Date must be on or before ${DateValidator.formatISO(maxDate)}`,
        };
      }

      return {
        valid: true,
        normalizedDate: dateToValidate,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Error validating date: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Validate date range
   */
  static validateDateRange(
    startDate: unknown,
    endDate: unknown
  ): ValidationResult {
    const errors: ValidationError[] = [];

    const startValidation = DateValidator.validateDate(startDate, { format: "ISO_DATE" });
    const endValidation = DateValidator.validateDate(endDate, { format: "ISO_DATE" });

    if (!startValidation.valid) {
      errors.push({
        field: "startDate",
        message: startValidation.error || "Invalid start date",
      });
    }

    if (!endValidation.valid) {
      errors.push({
        field: "endDate",
        message: endValidation.error || "Invalid end date",
      });
    }

    if (startValidation.valid && endValidation.valid) {
      if (startValidation.normalizedDate! > endValidation.normalizedDate!) {
        errors.push({
          field: "dateRange",
          message: "Start date must be before or equal to end date",
          rule: "invalid_range",
        });
      }

      // Check range span (e.g., max 2 years)
      const maxDaysAllowed = 365 * 2;
      const daysDifference = Math.floor(
        (endValidation.normalizedDate!.getTime() - startValidation.normalizedDate!.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysDifference > maxDaysAllowed) {
        errors.push({
          field: "dateRange",
          message: `Date range cannot exceed ${maxDaysAllowed} days`,
          rule: "range_too_large",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format date to ISO string (YYYY-MM-DD)
   */
  static formatISO(date: Date | string | null): string {
    if (!date) return "";

    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /**
   * Format date for localized display
   */
  static formatLocalized(
    date: Date | string,
    locale: string = "es-ES",
    options?: Intl.DateTimeFormatOptions
  ): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...options,
    }).format(dateObj);
  }

  /**
   * Format date with time
   */
  static formatWithTime(
    date: Date | string,
    locale: string = "es-ES"
  ): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(dateObj);
  }

  /**
   * Get date difference in days
   */
  static getDaysDifference(startDate: Date | string, endDate: Date | string): number {
    const start = typeof startDate === "string" ? new Date(startDate) : startDate;
    const end = typeof endDate === "string" ? new Date(endDate) : endDate;

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay);
  }

  /**
   * Get relative date description (e.g., "3 days ago")
   */
  static getRelativeDescription(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    const now = new Date();
    const secondsDiff = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (secondsDiff < 60) return "hace unos segundos";
    if (secondsDiff < 3600) return `hace ${Math.floor(secondsDiff / 60)} minutos`;
    if (secondsDiff < 86400) return `hace ${Math.floor(secondsDiff / 3600)} horas`;
    if (secondsDiff < 604800) return `hace ${Math.floor(secondsDiff / 86400)} días`;
    if (secondsDiff < 2592000) return `hace ${Math.floor(secondsDiff / 604800)} semanas`;

    return DateValidator.formatLocalized(dateObj);
  }

  /**
   * Validate business days (exclude weekends)
   */
  static isBusinessDay(date: Date | string): boolean {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const day = dateObj.getUTCDay();
    return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
  }

  /**
   * Add business days to date (skipping weekends)
   */
  static addBusinessDays(date: Date | string, days: number): Date {
    const dateObj = typeof date === "string" ? new Date(date) : new Date(date);

    let addedDays = 0;
    let iterationDate = new Date(dateObj);

    while (addedDays < days) {
      iterationDate.setDate(iterationDate.getDate() + 1);

      if (DateValidator.isBusinessDay(iterationDate)) {
        addedDays++;
      }
    }

    return iterationDate;
  }
}

/**
 * Hook for React components
 */
export function useDateValidation() {
  return {
    validate: (value: unknown, options?: any) =>
      DateValidator.validateDate(value, options),
    validateRange: (startDate: unknown, endDate: unknown) =>
      DateValidator.validateDateRange(startDate, endDate),
    formatISO: (date: Date | string | null) => DateValidator.formatISO(date),
    formatLocalized: (date: Date | string, locale?: string) =>
      DateValidator.formatLocalized(date, locale),
    formatWithTime: (date: Date | string, locale?: string) =>
      DateValidator.formatWithTime(date, locale),
    getDaysDifference: (start: Date | string, end: Date | string) =>
      DateValidator.getDaysDifference(start, end),
    getRelativeDescription: (date: Date | string) =>
      DateValidator.getRelativeDescription(date),
    isBusinessDay: (date: Date | string) => DateValidator.isBusinessDay(date),
    addBusinessDays: (date: Date | string, days: number) =>
      DateValidator.addBusinessDays(date, days),
  };
}
