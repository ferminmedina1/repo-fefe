/**
 * Dashboard Validation Tests
 * Pruebas unitarias para validaciones de dashboard
 */

import {
  validateCSVFile,
  validateFormula,
  validateWidgetData,
  validateColor,
  validateWidgetType,
  sanitizeText,
  validateWidgetId,
  extractFormulaFields,
  validateFormulaFields,
} from '@/lib/dashboard/validationUtils';

describe('Dashboard Validations', () => {
  describe('validateCSVFile', () => {
    it('should accept valid CSV files', () => {
      const file = new File(['a,b\n1,2'], 'test.csv', { type: 'text/csv' });
      const result = validateCSVFile(file);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-CSV files', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = validateCSVFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject files larger than 10MB', () => {
      const largeContent = new ArrayBuffer(11 * 1024 * 1024);
      const file = new File([largeContent], 'large.csv', { type: 'text/csv' });
      const result = validateCSVFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about large files (>5MB)', () => {
      const largeContent = new ArrayBuffer(6 * 1024 * 1024);
      const file = new File([largeContent], 'large.csv', { type: 'text/csv' });
      const result = validateCSVFile(file);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateFormula', () => {
    it('should accept valid formulas', () => {
      const result = validateFormula('[sales] * 1.2 + [tax]');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject eval() injections', () => {
      const result = validateFormula('eval("alert(1)")');
      expect(result.valid).toBe(false);
    });

    it('should reject Function() injections', () => {
      const result = validateFormula('Function("return window")()')
      expect(result.valid).toBe(false);
    });

    it('should reject empty formulas', () => {
      const result = validateFormula('');
      expect(result.valid).toBe(false);
    });

    it('should warn about long formulas', () => {
      const longFormula = '[field] + ' + Array(100).fill('[field]').join(' + ');
      const result = validateFormula(longFormula);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('extractFormulaFields', () => {
    it('should extract field references', () => {
      const fields = extractFormulaFields('[sales] * 1.2 + [tax] - [discount]');
      expect(fields).toEqual(['sales', 'tax', 'discount']);
    });

    it('should remove duplicate fields', () => {
      const fields = extractFormulaFields('[sales] + [sales] * 0.1');
      expect(fields).toEqual(['sales']);
    });

    it('should return empty array for formulas without fields', () => {
      const fields = extractFormulaFields('5 * 1.2 + 10');
      expect(fields).toEqual([]);
    });
  });

  describe('validateFormulaFields', () => {
    it('should validate fields exist in data', () => {
      const result = validateFormulaFields(
        '[sales] * 1.2',
        ['sales', 'tax', 'discount']
      );
      expect(result.valid).toBe(true);
    });

    it('should detect missing fields', () => {
      const result = validateFormulaFields(
        '[sales] * [missing_field]',
        ['sales', 'tax']
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('missing_field');
    });

    it('should warn when no fields are referenced', () => {
      const result = validateFormulaFields('5 * 1.2', ['sales', 'tax']);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateColor', () => {
    it('should accept valid colors', () => {
      expect(validateColor('blue')).toBe(true);
      expect(validateColor('red')).toBe(true);
      expect(validateColor('green')).toBe(true);
    });

    it('should reject invalid colors', () => {
      expect(validateColor('invalid')).toBe(false);
      expect(validateColor('rainbow')).toBe(false);
    });
  });

  describe('validateWidgetType', () => {
    it('should accept valid widget types', () => {
      expect(validateWidgetType('kpi')).toBe(true);
      expect(validateWidgetType('chart')).toBe(true);
      expect(validateWidgetType('list')).toBe(true);
    });

    it('should reject invalid types', () => {
      expect(validateWidgetType('invalid')).toBe(false);
      expect(validateWidgetType('custom')).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeText('Hello <script>alert(1)</script> World');
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should limit length', () => {
      const longText = Array(300).fill('a').join('');
      const result = sanitizeText(longText, 100);
      expect(result.length).toBeLessThanOrEqual(103); // 100 chars + "..."
    });

    it('should handle empty strings', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as any)).toBe('');
    });
  });

  describe('validateWidgetId', () => {
    it('should accept valid IDs', () => {
      const result = validateWidgetId('widget_123');
      expect(result.valid).toBe(true);
    });

    it('should reject short IDs', () => {
      const result = validateWidgetId('abc');
      expect(result.valid).toBe(false);
    });

    it('should reject invalid characters', () => {
      const result = validateWidgetId('widget@123!');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateWidgetData', () => {
    it('should accept valid data', () => {
      const data = { name: 'Test', value: 100 };
      const result = validateWidgetData(data);
      expect(result.valid).toBe(true);
    });

    it('should warn about large data', () => {
      const largeData = {
        items: Array(10000).fill({ id: 1, name: 'test', value: 100 }),
      };
      const result = validateWidgetData(largeData, 1024 * 1024); // 1MB max
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should reject data with suspicious content', () => {
      const maliciousData = { payload: '<script>alert(1)</script>' };
      const result = validateWidgetData(maliciousData);
      expect(result.valid).toBe(false);
    });

    it('should handle non-serializable data', () => {
      const data = { fn: () => {} };
      const result = validateWidgetData(data);
      expect(result.valid).toBe(false);
    });
  });
});
