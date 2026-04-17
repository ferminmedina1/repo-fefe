// Formula Evaluator - Executes AST with data context

import { FormulaASTNode, FormulaContext } from '@/types/dashboard';
import { FUNCTION_LIBRARY } from './FunctionLibrary';

/**
 * Safely evaluate formula AST with context
 */
export class FormulaEvaluator {
  private context: FormulaContext;
  private maxRecursionDepth = 1000;
  private currentDepth = 0;

  constructor(context: FormulaContext) {
    this.context = context;
  }

  evaluate(node: FormulaASTNode): any {
    this.currentDepth++;

    if (this.currentDepth > this.maxRecursionDepth) {
      throw new Error('Maximum recursion depth exceeded');
    }

    try {
      const result = this.evaluateNode(node);
      return result;
    } finally {
      this.currentDepth--;
    }
  }

  private evaluateNode(node: FormulaASTNode): any {
    switch (node.type) {
      case 'literal':
        return node.value;

      case 'field':
        return this.resolveField(node.name || '');

      case 'binary':
        return this.evaluateBinary(node);

      case 'unary':
        return this.evaluateUnary(node);

      case 'function':
        return this.evaluateFunction(node);

      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  private resolveField(fieldName: string): any {
    // First check in context variables
    if (fieldName in this.context.variables) {
      return this.context.variables[fieldName];
    }

    // Then check in data
    if (fieldName in this.context.data) {
      return this.context.data[fieldName];
    }

    // Return undefined for missing fields
    console.warn(`Field not found in context: ${fieldName}`);
    return undefined;
  }

  private evaluateBinary(node: FormulaASTNode): any {
    const left = this.evaluate(node.left!);
    const right = this.evaluate(node.right!);
    const op = node.operator || '';

    switch (op) {
      case '+':
        return Number(left || 0) + Number(right || 0);
      case '-':
        return Number(left || 0) - Number(right || 0);
      case '*':
        return Number(left || 0) * Number(right || 0);
      case '/':
        if (Number(right) === 0) throw new Error('Division by zero');
        return Number(left || 0) / Number(right || 0);
      case '**':
        return Math.pow(Number(left || 0), Number(right || 0));
      case '<':
        return left < right;
      case '>':
        return left > right;
      case '<=':
        return left <= right;
      case '>=':
        return left >= right;
      case '==':
      case '=':
        return left === right;
      case '!=':
      case '<>':
        return left !== right;
      default:
        throw new Error(`Unknown operator: ${op}`);
    }
  }

  private evaluateUnary(node: FormulaASTNode): any {
    const right = this.evaluate(node.right!);
    const op = node.operator || '';

    switch (op) {
      case 'NOT':
        return !Boolean(right);
      case '-':
        return -Number(right);
      case '+':
        return +Number(right);
      default:
        throw new Error(`Unknown unary operator: ${op}`);
    }
  }

  private evaluateFunction(node: FormulaASTNode): any {
    const funcName = (node.name || '').toUpperCase();
    const func = FUNCTION_LIBRARY[funcName];

    if (!func) {
      throw new Error(`Unknown function: ${funcName}`);
    }

    // Evaluate arguments
    const args = (node.args || []).map(arg => {
      // For aggregation functions, pass array as-is without evaluating
      if (this.isAggregationFunction(funcName) && arg.type === 'field') {
        return this.resolveField(arg.name || '');
      }
      return this.evaluate(arg);
    });

    try {
      return func(...args);
    } catch (error) {
      throw new Error(
        `Error executing ${funcName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private isAggregationFunction(name: string): boolean {
    const aggregationFunctions = [
      'SUM', 'AVG', 'COUNT', 'COUNTA', 'MIN', 'MAX',
      'MEDIAN', 'STDEV', 'PERCENTILE', 'SUMIF', 'COUNTIF', 'AVERAGEIF'
    ];
    return aggregationFunctions.includes(name);
  }
}

/**
 * Evaluate formula with data context
 */
export const evaluateFormula = (
  ast: FormulaASTNode,
  data: Record<string, any>,
  variables: Record<string, any> = {}
): any => {
  const context: FormulaContext = {
    data,
    variables,
    functions: FUNCTION_LIBRARY
  };

  const evaluator = new FormulaEvaluator(context);
  return evaluator.evaluate(ast);
};

/**
 * Evaluate formula from text
 */
export const evaluateFormulaText = (
  formulaText: string,
  data: Record<string, any>,
  variables: Record<string, any> = {}
): any => {
  const { parseFormula } = require('./FormulaParser');
  const ast = parseFormula(formulaText);
  return evaluateFormula(ast, data, variables);
};

/**
 * Get field references from formula
 */
export const extractFieldReferences = (node: FormulaASTNode, fields: Set<string> = new Set()): Set<string> => {
  switch (node.type) {
    case 'field':
      if (node.name) {
        fields.add(node.name);
      }
      break;

    case 'binary':
      extractFieldReferences(node.left!, fields);
      extractFieldReferences(node.right!, fields);
      break;

    case 'unary':
      extractFieldReferences(node.right!, fields);
      break;

    case 'function':
      (node.args || []).forEach(arg => extractFieldReferences(arg, fields));
      break;
  }

  return fields;
};

/**
 * Get function calls from formula
 */
export const extractFunctionCalls = (node: FormulaASTNode, functions: Set<string> = new Set()): Set<string> => {
  switch (node.type) {
    case 'function':
      if (node.name) {
        functions.add(node.name);
      }
      (node.args || []).forEach(arg => extractFunctionCalls(arg, functions));
      break;

    case 'binary':
      extractFunctionCalls(node.left!, functions);
      extractFunctionCalls(node.right!, functions);
      break;

    case 'unary':
      extractFunctionCalls(node.right!, functions);
      break;
  }

  return functions;
};
