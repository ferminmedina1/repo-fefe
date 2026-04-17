// useFormulaEngine - React hook for formula parsing and evaluation

import { useMemo, useCallback, useState } from 'react';
import { FormulaASTNode, FormulaContext } from '@/types/dashboard';
import { parseFormula, validateFormulaSyntax } from '@/lib/formulaEngine/FormulaParser';
import { FormulaEvaluator, evaluateFormula, extractFieldReferences, extractFunctionCalls } from '@/lib/formulaEngine/FormulaEvaluator';

export interface FormulaEngineResult {
  value: any;
  error: Error | null;
  isLoading: boolean;
}

export interface FormulaEngineOptions {
  autoEvaluate?: boolean;
  cacheResults?: boolean;
  debounceMs?: number;
}

/**
 * Parse formula text and cache result
 */
const useFormulaParser = (formulaText: string) => {
  const result = useMemo(() => {
    try {
      const validation = validateFormulaSyntax(formulaText);
      if (!validation.valid) {
        return {
          ast: null,
          error: new Error(validation.message),
          fieldsNeeded: new Set<string>()
        };
      }

      const ast = parseFormula(formulaText);
      const fieldsNeeded = extractFieldReferences(ast);

      return {
        ast,
        error: null,
        fieldsNeeded
      };
    } catch (error) {
      return {
        ast: null,
        error: error instanceof Error ? error : new Error(String(error)),
        fieldsNeeded: new Set<string>()
      };
    }
  }, [formulaText]);

  return result;
};

/**
 * Evaluate parsed formula with data context
 */
const useFormulaEvaluation = (
  ast: FormulaASTNode | null,
  data: Record<string, any>,
  variables: Record<string, any> = {}
) => {
  const result = useMemo(() => {
    if (!ast) {
      return { value: undefined, error: null };
    }

    try {
      const value = evaluateFormula(ast, data, variables);
      return { value, error: null };
    } catch (error) {
      return {
        value: undefined,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }, [ast, data, variables]);

  return result;
};

/**
 * Complete formula engine hook - parse and evaluate
 */
export const useFormulaEngine = (
  formulaText: string,
  data: Record<string, any> = {},
  variables: Record<string, any> = {},
  options: FormulaEngineOptions = {}
): FormulaEngineResult => {
  const { autoEvaluate = true, cacheResults = true } = options;

  const parserResult = useFormulaParser(formulaText);
  const evaluationResult = useFormulaEvaluation(
    autoEvaluate ? parserResult.ast : null,
    data,
    variables
  );

  return {
    value: evaluationResult.value,
    error: parserResult.error || evaluationResult.error,
    isLoading: false
  };
};

/**
 * Hook for formula validation only
 */
export const useFormulaValidation = (formulaText: string) => {
  const result = useMemo(() => {
    try {
      const validation = validateFormulaSyntax(formulaText);
      return {
        valid: validation.valid,
        message: validation.message,
        errors: validation.errors || []
      };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : String(error),
        errors: []
      };
    }
  }, [formulaText]);

  return result;
};

/**
 * Hook for extracting formula metadata
 */
export const useFormulaMetadata = (formulaText: string) => {
  const parserResult = useFormulaParser(formulaText);

  const metadata = useMemo(() => {
    if (!parserResult.ast) {
      return {
        fieldsNeeded: new Set<string>(),
        functionsUsed: new Set<string>(),
        isValid: false
      };
    }

    const functionsUsed = extractFunctionCalls(parserResult.ast);

    return {
      fieldsNeeded: parserResult.fieldsNeeded,
      functionsUsed,
      isValid: parserResult.error === null
    };
  }, [parserResult]);

  return metadata;
};

/**
 * Hook for checking if all required fields are available
 */
export const useFormulaFieldValidation = (
  formulaText: string,
  availableFields: Set<string>
) => {
  const metadata = useFormulaMetadata(formulaText);

  const result = useMemo(() => {
    const missingFields = Array.from(metadata.fieldsNeeded).filter(
      field => !availableFields.has(field)
    );

    return {
      isValid: missingFields.length === 0,
      missingFields,
      allFieldsAvailable: missingFields.length === 0
    };
  }, [metadata, availableFields]);

  return result;
};

/**
 * Hook for debounced formula evaluation
 */
export const useDebouncedFormulaEngine = (
  formulaText: string,
  data: Record<string, any>,
  variables: Record<string, any> = {},
  debounceMs: number = 300
): FormulaEngineResult => {
  const [result, setResult] = useState<FormulaEngineResult>({
    value: undefined,
    error: null,
    isLoading: false
  });

  const evaluation = useFormulaEngine(formulaText, data, variables, {
    autoEvaluate: true,
    cacheResults: true
  });

  // Debounce with timeout
  useMemo(() => {
    const timer = setTimeout(() => {
      setResult(evaluation);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [evaluation, debounceMs]);

  return result;
};

/**
 * Hook for formula with manual evaluation control
 */
export const useManualFormulaEngine = (formulaText: string) => {
  const parserResult = useFormulaParser(formulaText);

  const evaluate = useCallback(
    (data: Record<string, any>, variables: Record<string, any> = {}) => {
      if (parserResult.error) {
        return {
          value: undefined,
          error: parserResult.error
        };
      }

      if (!parserResult.ast) {
        return {
          value: undefined,
          error: new Error('No valid AST to evaluate')
        };
      }

      try {
        const value = evaluateFormula(parserResult.ast, data, variables);
        return { value, error: null };
      } catch (error) {
        return {
          value: undefined,
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    },
    [parserResult]
  );

  return {
    evaluate,
    isValid: parserResult.error === null,
    parseError: parserResult.error,
    fieldsNeeded: parserResult.fieldsNeeded
  };
};

/**
 * Hook for batch formula evaluation
 */
export const useBatchFormulaEvaluation = (
  formulas: Record<string, string>,
  data: Record<string, any>,
  variables: Record<string, any> = {}
) => {
  const results = useMemo(() => {
    const output: Record<string, FormulaEngineResult> = {};

    for (const [key, formula] of Object.entries(formulas)) {
      try {
        const validation = validateFormulaSyntax(formula);
        if (!validation.valid) {
          output[key] = {
            value: undefined,
            error: new Error(validation.message),
            isLoading: false
          };
          continue;
        }

        const ast = parseFormula(formula);
        const value = evaluateFormula(ast, data, variables);
        output[key] = {
          value,
          error: null,
          isLoading: false
        };
      } catch (error) {
        output[key] = {
          value: undefined,
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false
        };
      }
    }

    return output;
  }, [formulas, data, variables]);

  return results;
};
