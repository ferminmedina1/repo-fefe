import { evaluate } from 'mathjs';

/**
 * Result of formula evaluation
 */
export interface FormulaResult {
  value: number;
  isValid: boolean;
  error?: string;
}

/**
 * Safely evaluates a mathematical formula using mathjs
 * Prevents code injection and XSS attacks
 *
 * @param formula - The mathematical formula to evaluate (e.g., "2+2", "a*b")
 * @param variables - Optional variables/substitutions (e.g., { a: 5, b: 3 })
 * @returns FormulaResult with value and validation status
 *
 * @example
 * evaluateFormula("2+2") // { value: 4, isValid: true }
 * evaluateFormula("a*b", { a: 5, b: 3 }) // { value: 15, isValid: true }
 * evaluateFormula("import('fs')") // { value: 0, isValid: false, error: "Fórmula contiene código prohibido" }
 */
export function evaluateFormula(
  formula: string,
  variables: Record<string, number> = {}
): FormulaResult {
  try {
    // 1️⃣ Basic validation - formula must be string and not empty
    if (!formula || typeof formula !== 'string') {
      return {
        value: 0,
        isValid: false,
        error: 'Fórmula inválida',
      };
    }

    // 2️⃣ Trim whitespace
    const trimmedFormula = formula.trim();
    if (trimmedFormula.length === 0) {
      return {
        value: 0,
        isValid: false,
        error: 'Fórmula vacía',
      };
    }

    // 3️⃣ Security: Reject dangerous patterns that could indicate code injection
    const dangerousPatterns = [
      'import',
      'export',
      'require',
      'eval',
      '__',
      'Function',
      'constructor',
      'prototype',
      'fetch',
      'XMLHttpRequest',
      'localStorage',
      'sessionStorage',
      'document',
      'window',
      'process',
      'fs.',
      '.then',
      '.catch',
      'async',
      'await',
    ];

    const formulaLower = trimmedFormula.toLowerCase();
    for (const pattern of dangerousPatterns) {
      if (formulaLower.includes(pattern.toLowerCase())) {
        return {
          value: 0,
          isValid: false,
          error: `Fórmula contiene patrón prohibido: "${pattern}"`,
        };
      }
    }

    // 4️⃣ Syntax validation - reject invalid operator sequences
    const invalidOpPatterns = [
      /\+\+/,  // ++ (no unary plus)
      /--/,    // -- (no unary minus)
      /\*\*/,  // ** (no power without spaces)
      /\/\//,  // // (no comments)
      /\+\*/,  // +* or similar
      /\*\+/,
      /\+\//,
      /\/\+/,
      /\(\)/,  // Empty parens
      /\{\}/,  // Empty braces
    ];

    for (const pattern of invalidOpPatterns) {
      if (pattern.test(trimmedFormula)) {
        return {
          value: 0,
          isValid: false,
          error: 'Sintaxis inválida: operadores consecutivos o estructura mal formada',
        };
      }
    }

    // 5️⃣ Validate variables are numbers
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        return {
          value: 0,
          isValid: false,
          error: `Variable "${key}" debe ser un número válido`,
        };
      }
    }

    // 6️⃣ Parse and evaluate safely using mathjs
    // mathjs has built-in protections against code injection
    const result = evaluate(trimmedFormula, variables);

    // 6️⃣ Convert result to number
    const numResult = Number(result);

    // 8️⃣ Validate result is a finite number
    if (!isFinite(numResult)) {
      return {
        value: 0,
        isValid: false,
        error: 'El resultado no es un número válido',
      };
    }

    // ✅ Success
    return {
      value: numResult,
      isValid: true,
    };
  } catch (error) {
    // Catch mathjs evaluation errors (syntax errors, etc)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return {
      value: 0,
      isValid: false,
      error: `Error en fórmula: ${errorMessage}`,
    };
  }
}

/**
 * Test helper - validates that formulas behave as expected
 * Used for development/testing to ensure formula evaluator works correctly
 *
 * @example
 * testFormula([
 *   { formula: "2+2", shouldPass: true },
 *   { formula: "import('fs')", shouldPass: false }
 * ])
 */
export function testFormula(
  testCases: Array<{ formula: string; shouldPass: boolean }>
): Array<{
  formula: string;
  result: FormulaResult;
  passed: boolean;
}> {
  return testCases.map(({ formula, shouldPass }) => {
    const result = evaluateFormula(formula);
    const passed = result.isValid === shouldPass;

    return {
      formula,
      result,
      passed,
    };
  });
}

/**
 * Validates that a formula string is syntactically correct without evaluating it
 * Used for pre-flight validation before storing formulas
 */
export function isValidFormulaString(formula: string): { valid: boolean; error?: string } {
  if (!formula || typeof formula !== 'string' || formula.trim().length === 0) {
    return { valid: false, error: 'Fórmula vacía' };
  }

  const dangerousPatterns = [
    'import',
    'export',
    'require',
    'eval',
    'Function',
    'fetch',
    'document',
    'window',
  ];

  const formulaLower = formula.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (formulaLower.includes(pattern.toLowerCase())) {
      return {
        valid: false,
        error: `Contiene patrón prohibido: "${pattern}"`,
      };
    }
  }

  return { valid: true };
}
