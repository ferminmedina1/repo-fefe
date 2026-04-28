/**
 * CSV Validation & Sanitization Module
 * Prevents XSS, SQL Injection, and data corruption
 */

// ============================================
// SANITIZATION PATTERNS (Dangerous content)
// ============================================

/**
 * Patterns that indicate potential security threats
 */
const DANGEROUS_PATTERNS = {
  sqlInjection: /(\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bDELETE\b|\bEXEC\b|\bDECLARE\b|\bEXECUTE\b|\bDIRECT\b)/i,
  scriptTag: /<script[^>]*>.*?<\/script>/gi,
  eventHandler: /on\w+\s*=/gi,
  dataUri: /data:(?:text|image)\/(?:html|svg|javascript)/gi,
  formTag: /<form[^>]*>/gi,
  iframeTag: /<iframe[^>]*>/gi,
  styleTag: /<style[^>]*>.*?<\/style>/gi,
};

/**
 * Check if a string contains dangerous patterns
 * @param value - String to check
 * @returns true if dangerous content found
 */
export function containsDangerousPatterns(value: string): boolean {
  if (typeof value !== 'string') return false;

  for (const [pattern, regex] of Object.entries(DANGEROUS_PATTERNS)) {
    if (regex.test(value)) {
      console.warn(`Dangerous pattern detected: ${pattern}`);
      return true;
    }
  }

  return false;
}

/**
 * Sanitize a string value by removing dangerous content
 * @param value - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(value: any): string {
  if (typeof value !== 'string') {
    return String(value).trim();
  }

  let sanitized = value
    // Remove script tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove form tags
    .replace(/<form[^>]*>/gi, '')
    // Remove iframe tags
    .replace(/<iframe[^>]*>/gi, '')
    // Remove style tags
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    // Remove data URIs
    .replace(/data:(?:text|image)\/(?:html|svg|javascript)/gi, '')
    // Trim whitespace
    .trim();

  return sanitized;
}

/**
 * Validate and sanitize a numeric value
 * @param value - Value to validate
 * @param min - Minimum value (optional)
 * @param max - Maximum value (optional)
 * @returns { valid: boolean; value: number | null; error?: string }
 */
export function validateNumber(
  value: any,
  options?: { min?: number; max?: number; allowNegative?: boolean }
): { valid: boolean; value: number | null; error?: string } {
  const { min, max, allowNegative = true } = options || {};

  // Try to convert to number
  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, value: null, error: 'Valor no es un número válido' };
  }

  // Check range
  if (min !== undefined && num < min) {
    return { valid: false, value: null, error: `Valor debe ser >= ${min}` };
  }

  if (max !== undefined && num > max) {
    return { valid: false, value: null, error: `Valor debe ser <= ${max}` };
  }

  // Check negative
  if (!allowNegative && num < 0) {
    return { valid: false, value: null, error: 'Valores negativos no permitidos' };
  }

  return { valid: true, value: num };
}

/**
 * Validate and sanitize a date value
 * @param value - Date string to validate
 * @returns { valid: boolean; value: Date | null; error?: string }
 */
export function validateDate(value: any): { valid: boolean; value: Date | null; error?: string } {
  if (!value) {
    return { valid: false, value: null, error: 'Fecha requerida' };
  }

  const date = new Date(String(value));

  if (isNaN(date.getTime())) {
    return { valid: false, value: null, error: 'Formato de fecha inválido' };
  }

  // Check if date is reasonable (not more than 100 years ago or in future)
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 100, 0, 1);
  const maxDate = new Date(now.getFullYear() + 1, 11, 31);

  if (date < minDate || date > maxDate) {
    return { valid: false, value: null, error: 'Fecha fuera de rango permitido' };
  }

  return { valid: true, value: date };
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns true if valid email format
 */
export function validateEmail(email: any): boolean {
  if (typeof email !== 'string') return false;

  // Simple email regex - not perfect but good enough
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Sanitize CSV row data
 * @param row - Raw CSV row object
 * @param expectedColumns - Expected column names and types
 * @returns { valid: boolean; data: any; errors: string[] }
 */
export function sanitizeCSVRow(
  row: Record<string, any>,
  expectedColumns?: Record<string, 'string' | 'number' | 'date' | 'email'>
): { valid: boolean; data: Record<string, any>; errors: string[] } {
  const errors: string[] = [];
  const sanitizedData: Record<string, any> = {};

  // Process each column
  for (const [key, value] of Object.entries(row)) {
    if (containsDangerousPatterns(String(value))) {
      errors.push(`Contenido peligroso detectado en columna "${key}"`);
      continue;
    }

    const columnType = expectedColumns?.[key];

    if (columnType === 'number') {
      const validation = validateNumber(value);
      if (!validation.valid) {
        errors.push(`Columna "${key}": ${validation.error}`);
        sanitizedData[key] = null;
      } else {
        sanitizedData[key] = validation.value;
      }
    } else if (columnType === 'date') {
      const validation = validateDate(value);
      if (!validation.valid) {
        errors.push(`Columna "${key}": ${validation.error}`);
        sanitizedData[key] = null;
      } else {
        sanitizedData[key] = validation.value;
      }
    } else if (columnType === 'email') {
      const sanitized = sanitizeString(value);
      if (!validateEmail(sanitized)) {
        errors.push(`Columna "${key}": Email inválido`);
        sanitizedData[key] = null;
      } else {
        sanitizedData[key] = sanitized;
      }
    } else {
      // Default: string
      sanitizedData[key] = sanitizeString(value);
    }
  }

  return {
    valid: errors.length === 0,
    data: sanitizedData,
    errors,
  };
}

/**
 * Validate entire CSV dataset
 * @param rows - Array of CSV rows
 * @param requiredColumns - Required column names
 * @returns { valid: boolean; errors: string[]; warnings: string[] }
 */
export function validateCSVDataset(
  rows: Record<string, any>[],
  requiredColumns: string[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push('Dataset vacío o inválido');
    return { valid: false, errors, warnings };
  }

  // Check max rows (prevent memory bomb attacks)
  const MAX_ROWS = 50000;
  if (rows.length > MAX_ROWS) {
    errors.push(`Demasiadas filas (${rows.length}). Máximo: ${MAX_ROWS}`);
    return { valid: false, errors, warnings };
  }

  // Check column names exist
  const firstRow = rows[0];
  const firstRowKeys = Object.keys(firstRow);

  for (const required of requiredColumns) {
    const found = firstRowKeys.some(key => key.toLowerCase() === required.toLowerCase());
    if (!found) {
      errors.push(`Columna requerida faltante: "${required}"`);
    }
  }

  // Check for duplicate rows
  const seenRows = new Set<string>();
  let duplicateCount = 0;

  for (const row of rows) {
    const rowHash = JSON.stringify(row);
    if (seenRows.has(rowHash)) {
      duplicateCount++;
    } else {
      seenRows.add(rowHash);
    }
  }

  if (duplicateCount > 0) {
    warnings.push(`${duplicateCount} filas duplicadas detectadas`);
  }

  // Check data integrity
  let emptyColumnCount = 0;
  const columnStats: Record<string, number> = {};

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!value || value === '') {
        columnStats[key] = (columnStats[key] || 0) + 1;
      }
    }
  }

  // Warn about columns with >50% missing values
  for (const [column, count] of Object.entries(columnStats)) {
    const missingPercent = (count / rows.length) * 100;
    if (missingPercent > 50) {
      warnings.push(`Columna "${column}": ${missingPercent.toFixed(0)}% valores vacíos`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate CSV file size and type before parsing
 * @param file - File object
 * @returns { valid: boolean; error?: string }
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const isValidType = file.type === 'text/csv' || file.name.endsWith('.csv');
  if (!isValidType) {
    return { valid: false, error: 'Archivo debe ser CSV válido (.csv)' };
  }

  // Check file size (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return { valid: false, error: `Archivo demasiado grande (${sizeMB}MB). Máximo: 10MB` };
  }

  // Check if empty
  if (file.size === 0) {
    return { valid: false, error: 'El archivo CSV está vacío' };
  }

  return { valid: true };
}

/**
 * Comprehensive CSV validation pipeline
 * @param file - File to validate
 * @param requiredColumns - Required columns
 * @param expectedSchema - Column type definitions
 * @returns { valid: boolean; errors: string[]; warnings: string[] }
 */
export function validateCSVComprehensive(
  file: File,
  requiredColumns: string[],
  expectedSchema?: Record<string, 'string' | 'number' | 'date' | 'email'>
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: File validation
  const fileValidation = validateCSVFile(file);
  if (!fileValidation.valid) {
    return { valid: false, errors: [fileValidation.error!], warnings };
  }

  // Step 2-3: Parsing happens in the hook
  // This function provides the validation logic

  return { valid: true, errors, warnings };
}
