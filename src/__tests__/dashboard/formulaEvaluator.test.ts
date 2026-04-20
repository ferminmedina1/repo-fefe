import { describe, it, expect } from 'vitest';
import { evaluateFormula, isValidFormulaString } from '@/lib/dashboard/formulaEvaluator';

describe('formulaEvaluator', () => {
  describe('evaluateFormula - Valid Expressions', () => {
    it('evalúa operaciones matemáticas básicas', () => {
      expect(evaluateFormula('2+2').value).toBe(4);
      expect(evaluateFormula('10 * 5').value).toBe(50);
      expect(evaluateFormula('100/2').value).toBe(50);
      expect(evaluateFormula('10 - 3').value).toBe(7);
    });

    it('evalúa potencias y raíces', () => {
      expect(evaluateFormula('2 ^ 3').value).toBe(8);
      expect(evaluateFormula('sqrt(16)').value).toBe(4);
    });

    it('soporta variables', () => {
      const result = evaluateFormula('a + b', { a: 5, b: 3 });
      expect(result.value).toBe(8);
      expect(result.isValid).toBe(true);
    });

    it('evalúa funciones matemáticas', () => {
      expect(evaluateFormula('max(1, 5, 3)').value).toBe(5);
      expect(evaluateFormula('min(1, 5, 3)').value).toBe(1);
      expect(evaluateFormula('abs(-10)').value).toBe(10);
    });

    it('evalúa operaciones complejas', () => {
      const result = evaluateFormula('(10 + 5) * 2 - 3 / 1.5');
      expect(result.isValid).toBe(true);
      expect(typeof result.value).toBe('number');
    });
  });

  describe('evaluateFormula - Security (Injection Prevention)', () => {
    it('rechaza patrones de código injection', () => {
      const dangerousPatterns = [
        'import("fs")',
        'require("fs")',
        'eval("malicious")',
        'Function("alert(1)")',
        'fetch("http://evil.com")',
        'XMLHttpRequest',
        'process.exit()',
        'document.location',
      ];

      dangerousPatterns.forEach(pattern => {
        const result = evaluateFormula(pattern);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('rechaza acceso a scope global', () => {
      const result = evaluateFormula('window.location.href');
      expect(result.isValid).toBe(false);
    });

    it('rechaza constructores peligrosos', () => {
      expect(evaluateFormula('constructor.prototype').isValid).toBe(false);
      expect(evaluateFormula('__proto__').isValid).toBe(false);
    });
  });

  describe('evaluateFormula - Error Handling', () => {
    it('rechaza fórmulas inválidas sintácticamente', () => {
      expect(evaluateFormula('2++2').isValid).toBe(false);
      expect(evaluateFormula('(2+2').isValid).toBe(false);
      expect(evaluateFormula('2 @@ 2').isValid).toBe(false);
    });

    it('rechaza fórmulas vacías', () => {
      expect(evaluateFormula('').isValid).toBe(false);
      expect(evaluateFormula('   ').isValid).toBe(false);
    });

    it('valida variables numéricas', () => {
      const invalidVars = [
        { a: 'string' },
        { b: null },
        { c: undefined },
        { d: NaN },
        { e: Infinity },
      ];

      invalidVars.forEach(vars => {
        const result = evaluateFormula('a || b || c || d || e', vars as Record<string, number>);
        expect(result.isValid).toBe(false);
      });
    });

    it('retorna error descriptivo para problemas', () => {
      const result = evaluateFormula('unknown_function()');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.length).toBeGreaterThan(0);
    });
  });

  describe('evaluateFormula - Edge Cases', () => {
    it('maneja números muy grandes', () => {
      const result = evaluateFormula('1000000 * 1000000');
      expect(result.isValid).toBe(true);
      expect(isFinite(result.value)).toBe(true);
    });

    it('maneja números muy pequeños', () => {
      const result = evaluateFormula('0.00001 / 1000');
      expect(result.isValid).toBe(true);
      expect(isFinite(result.value)).toBe(true);
    });

    it('rechaza NaN, Infinity, -Infinity', () => {
      expect(evaluateFormula('1/0').isValid).toBe(false);
      expect(evaluateFormula('0/0').isValid).toBe(false);
    });

    it('soporta números negativos', () => {
      const result = evaluateFormula('-50 + 30');
      expect(result.value).toBe(-20);
      expect(result.isValid).toBe(true);
    });
  });

  describe('isValidFormulaString', () => {
    it('valida fórmulas seguras', () => {
      expect(isValidFormulaString('2+2').valid).toBe(true);
      expect(isValidFormulaString('a * b').valid).toBe(true);
      expect(isValidFormulaString('sum(1,2,3)').valid).toBe(true);
    });

    it('rechaza patrones peligrosos', () => {
      expect(isValidFormulaString('import("fs")').valid).toBe(false);
      expect(isValidFormulaString('fetch("url")').valid).toBe(false);
      expect(isValidFormulaString('eval("code")').valid).toBe(false);
    });

    it('rechaza strings vacías', () => {
      expect(isValidFormulaString('').valid).toBe(false);
      expect(isValidFormulaString('   ').valid).toBe(false);
    });
  });
});
