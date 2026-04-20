/**
 * DATE VALIDATION UTILITIES
 * ========================
 * Helper functions to validate and ensure dates are valid Date objects
 * Prevents "Cannot read properties of undefined (reading 'toISOString')" errors
 */

import { startOfMonth, endOfMonth } from 'date-fns';

/**
 * Validate and return a Date object, or fallback to default
 * @param date - Date to validate
 * @param fallback - Default date to use if invalid
 * @returns Valid Date object
 */
export function ensureValidDate(date: any, fallback: Date): Date {
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }
  return fallback;
}

/**
 * Validate date range has valid from/to dates
 * @param dateRange - Date range object with from/to
 * @returns Object with validated from/to dates
 */
export function validateDateRange(dateRange: any) {
  const now = new Date();
  const defaultFrom = startOfMonth(now);
  const defaultTo = endOfMonth(now);

  const from = ensureValidDate(dateRange?.from, defaultFrom);
  const to = ensureValidDate(dateRange?.to, defaultTo);

  return { from, to };
}

/**
 * Safe date range extraction from filters
 * Always returns valid Date objects even if filters are invalid
 * @param filters - Dashboard filters with optional dateRange
 * @returns Object with guaranteed valid from/to dates
 */
export function safeGetDateRange(filters: any) {
  const now = new Date();
  const defaultFrom = startOfMonth(now);
  const defaultTo = endOfMonth(now);

  if (!filters?.dateRange) {
    return { from: defaultFrom, to: defaultTo };
  }

  return validateDateRange(filters.dateRange);
}

/**
 * Ensure a date can safely call toISOString()
 * @param date - Date to check
 * @returns ISO string representation or error message
 */
export function safeToISOString(date: any): string {
  try {
    const validDate = ensureValidDate(date, new Date());
    return validDate.toISOString();
  } catch (error) {
    console.error('Error converting date to ISO string:', error, date);
    return new Date().toISOString();
  }
}
