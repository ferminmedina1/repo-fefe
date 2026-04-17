// Formula Function Library - All available formula functions

export interface FunctionDefinition {
  name: string;
  description: string;
  argsCount: 'variable' | number;
  argTypes: string[];
  returnType: string;
  example: string;
  category: 'aggregation' | 'math' | 'text' | 'date' | 'logic' | 'lookup';
}

/**
 * Aggregation Functions
 */
const SUM = (values: number[]): number => {
  if (!Array.isArray(values)) return 0;
  return values.reduce((acc, val) => acc + (Number(val) || 0), 0);
};

const AVG = (values: number[]): number => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return SUM(values) / values.length;
};

const COUNT = (values: any[]): number => {
  return Array.isArray(values) ? values.length : 0;
};

const COUNTA = (values: any[]): number => {
  if (!Array.isArray(values)) return 0;
  return values.filter(v => v !== null && v !== undefined && v !== '').length;
};

const MIN = (values: number[]): number => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return Math.min(...values.map(v => Number(v) || 0));
};

const MAX = (values: number[]): number => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return Math.max(...values.map(v => Number(v) || 0));
};

/**
 * Math Functions
 */
const ABS = (value: number): number => Math.abs(Number(value) || 0);
const ROUND = (value: number, decimals: number = 0): number => {
  const factor = Math.pow(10, Number(decimals) || 0);
  return Math.round((Number(value) || 0) * factor) / factor;
};

const FLOOR = (value: number): number => Math.floor(Number(value) || 0);
const CEIL = (value: number): number => Math.ceil(Number(value) || 0);
const SQRT = (value: number): number => Math.sqrt(Number(value) || 0);
const POWER = (base: number, exponent: number): number => 
  Math.pow(Number(base) || 0, Number(exponent) || 0);

/**
 * Text Functions
 */
const CONCAT = (...values: any[]): string => {
  return values.map(v => String(v || '')).join('');
};

const UPPER = (text: string): string => String(text || '').toUpperCase();
const LOWER = (text: string): string => String(text || '').toLowerCase();
const TRIM = (text: string): string => String(text || '').trim();
const LEN = (text: string): number => String(text || '').length;

const MID = (text: string, start: number, length: number): string => {
  const str = String(text || '');
  return str.substring(Number(start) - 1 || 0, (Number(start) - 1 || 0) + (Number(length) || 1));
};

const FIND = (searchText: string, inText: string): number => {
  const str = String(inText || '');
  const search = String(searchText || '');
  const position = str.indexOf(search);
  return position >= 0 ? position + 1 : -1;
};

const REPLACE = (oldText: string, startNum: number, numChars: number, newText: string): string => {
  const str = String(oldText || '');
  const start = Number(startNum) - 1 || 0;
  const count = Number(numChars) || 0;
  return str.slice(0, start) + String(newText || '') + str.slice(start + count);
};

/**
 * Logic Functions
 */
const IF = (condition: boolean, trueValue: any, falseValue: any): any => {
  return condition ? trueValue : falseValue;
};

const AND = (...conditions: boolean[]): boolean => {
  return conditions.every(c => Boolean(c));
};

const OR = (...conditions: boolean[]): boolean => {
  return conditions.some(c => Boolean(c));
};

const NOT = (condition: boolean): boolean => {
  return !Boolean(condition);
};

/**
 * Date Functions
 */
const TODAY = (): string => {
  return new Date().toISOString().split('T')[0];
};

const NOW = (): string => {
  return new Date().toISOString();
};

const YEAR = (date: string | Date): number => {
  const d = new Date(date);
  return d.getFullYear();
};

const MONTH = (date: string | Date): number => {
  const d = new Date(date);
  return d.getMonth() + 1;
};

const DAY = (date: string | Date): number => {
  const d = new Date(date);
  return d.getDate();
};

const DATEDIFF = (unit: string, startDate: string | Date, endDate: string | Date): number => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const diff = end - start;

  switch (String(unit).toLowerCase()) {
    case 'day':
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    case 'hour':
      return Math.floor(diff / (1000 * 60 * 60));
    case 'minute':
      return Math.floor(diff / (1000 * 60));
    case 'month':
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    case 'year':
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
    default:
      return Math.floor(diff);
  }
};

/**
 * Lookup Functions
 */
const VLOOKUP = (
  lookupValue: any,
  tableArray: any[],
  colIndexNum: number,
  rangeLookup: boolean = false
): any => {
  if (!Array.isArray(tableArray) || tableArray.length === 0) return undefined;
  
  const match = tableArray.find(row => {
    const firstCol = Array.isArray(row) ? row[0] : Object.values(row)[0];
    return firstCol === lookupValue;
  });

  if (!match) return undefined;
  
  const col = Number(colIndexNum) - 1;
  return Array.isArray(match) ? match[col] : Object.values(match)[col];
};

const INDEX = (array: any[], indexNum: number): any => {
  if (!Array.isArray(array)) return undefined;
  return array[Number(indexNum) - 1];
};

const MATCH = (lookupValue: any, lookupArray: any[], matchType: number = 0): number => {
  if (!Array.isArray(lookupArray)) return -1;
  const index = lookupArray.findIndex(v => v === lookupValue);
  return index >= 0 ? index + 1 : -1;
};

/**
 * Type Conversion
 */
const VALUE = (text: any): number => Number(text) || 0;
const TEXT = (value: any): string => String(value || '');
const BOOLEAN = (value: any): boolean => Boolean(value);

/**
 * Conditional Statistics
 */
const SUMIF = (range: any[], criteria: any, sumRange?: any[]): number => {
  if (!Array.isArray(range)) return 0;
  const values = sumRange || range;
  
  return range.reduce((acc, val, idx) => {
    if (val === criteria) {
      return acc + (Number(values[idx]) || 0);
    }
    return acc;
  }, 0);
};

const COUNTIF = (range: any[], criteria: any): number => {
  if (!Array.isArray(range)) return 0;
  return range.filter(val => val === criteria).length;
};

const AVERAGEIF = (range: any[], criteria: any, averageRange?: any[]): number => {
  if (!Array.isArray(range)) return 0;
  const values = averageRange || range;
  const matching = range
    .map((val, idx) => val === criteria ? values[idx] : null)
    .filter(v => v !== null);
  
  return matching.length > 0 ? AVG(matching) : 0;
};

/**
 * Statistical Functions
 */
const MEDIAN = (values: number[]): number => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => Number(a) - Number(b));
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? Number(sorted[mid]) : (Number(sorted[mid - 1]) + Number(sorted[mid])) / 2;
};

const STDEV = (values: number[]): number => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const mean = AVG(values);
  const squaredDiffs = values.map(v => Math.pow(Number(v) - mean, 2));
  return Math.sqrt(AVG(squaredDiffs));
};

/**
 * Percentage Functions
 */
const PERCENTILE = (array: number[], percentile: number): number => {
  if (!Array.isArray(array) || array.length === 0) return 0;
  const sorted = [...array].sort((a, b) => Number(a) - Number(b));
  const index = (Number(percentile) / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (lower === upper) return Number(sorted[lower]);
  return Number(sorted[lower]) * (1 - weight) + Number(sorted[upper]) * weight;
};

/**
 * Function Definitions Metadata
 */
export const FUNCTION_DEFINITIONS: Record<string, FunctionDefinition> = {
  // Aggregation
  SUM: {
    name: 'SUM',
    description: 'Suma todos los valores',
    argsCount: 'variable',
    argTypes: ['number[]'],
    returnType: 'number',
    example: 'SUM([10, 20, 30]) = 60',
    category: 'aggregation'
  },
  AVG: {
    name: 'AVG',
    description: 'Calcula el promedio',
    argsCount: 'variable',
    argTypes: ['number[]'],
    returnType: 'number',
    example: 'AVG([10, 20, 30]) = 20',
    category: 'aggregation'
  },
  COUNT: {
    name: 'COUNT',
    description: 'Cuenta elementos no vacíos',
    argsCount: 'variable',
    argTypes: ['any[]'],
    returnType: 'number',
    example: 'COUNT([1, 2, 3]) = 3',
    category: 'aggregation'
  },
  MIN: {
    name: 'MIN',
    description: 'Encuentra el valor mínimo',
    argsCount: 'variable',
    argTypes: ['number[]'],
    returnType: 'number',
    example: 'MIN([10, 5, 20]) = 5',
    category: 'aggregation'
  },
  MAX: {
    name: 'MAX',
    description: 'Encuentra el valor máximo',
    argsCount: 'variable',
    argTypes: ['number[]'],
    returnType: 'number',
    example: 'MAX([10, 5, 20]) = 20',
    category: 'aggregation'
  },
  // Math
  ROUND: {
    name: 'ROUND',
    description: 'Redondea valor a decimales especificados',
    argsCount: 2,
    argTypes: ['number', 'number'],
    returnType: 'number',
    example: 'ROUND(3.14159, 2) = 3.14',
    category: 'math'
  },
  ABS: {
    name: 'ABS',
    description: 'Valor absoluto',
    argsCount: 1,
    argTypes: ['number'],
    returnType: 'number',
    example: 'ABS(-5) = 5',
    category: 'math'
  },
  // Text
  CONCAT: {
    name: 'CONCAT',
    description: 'Concatena textos',
    argsCount: 'variable',
    argTypes: ['any'],
    returnType: 'string',
    example: 'CONCAT("Hola", " ", "Mundo") = "Hola Mundo"',
    category: 'text'
  },
  UPPER: {
    name: 'UPPER',
    description: 'Convierte a mayúsculas',
    argsCount: 1,
    argTypes: ['string'],
    returnType: 'string',
    example: 'UPPER("hola") = "HOLA"',
    category: 'text'
  },
  // Logic
  IF: {
    name: 'IF',
    description: 'Condicional - devuelve valor si se cumple condición',
    argsCount: 3,
    argTypes: ['boolean', 'any', 'any'],
    returnType: 'any',
    example: 'IF(x > 100, "Alto", "Bajo")',
    category: 'logic'
  },
  AND: {
    name: 'AND',
    description: 'Retorna verdadero si TODAS las condiciones son verdaderas',
    argsCount: 'variable',
    argTypes: ['boolean'],
    returnType: 'boolean',
    example: 'AND(x > 5, x < 10) = true si x está entre 5 y 10',
    category: 'logic'
  },
  // Conditional Statistics
  SUMIF: {
    name: 'SUMIF',
    description: 'Suma valores que cumplen criteria',
    argsCount: 3,
    argTypes: ['any[]', 'any', 'number[]'],
    returnType: 'number',
    example: 'SUMIF(statuses, "paid", amounts)',
    category: 'aggregation'
  },
};

/**
 * Export all functions as a map
 */
export const FUNCTION_LIBRARY: Record<string, Function> = {
  // Aggregation
  SUM,
  AVG,
  COUNT,
  COUNTA,
  MIN,
  MAX,
  MEDIAN,
  STDEV,
  PERCENTILE,

  // Math
  ABS,
  ROUND,
  FLOOR,
  CEIL,
  SQRT,
  POWER,

  // Text
  CONCAT,
  UPPER,
  LOWER,
  TRIM,
  LEN,
  MID,
  FIND,
  REPLACE,

  // Logic
  IF,
  AND,
  OR,
  NOT,

  // Date
  TODAY,
  NOW,
  YEAR,
  MONTH,
  DAY,
  DATEDIFF,

  // Lookup
  VLOOKUP,
  INDEX,
  MATCH,

  // Type Conversion
  VALUE,
  TEXT,
  BOOLEAN,

  // Conditional Statistics
  SUMIF,
  COUNTIF,
  AVERAGEIF,
};

/**
 * Get list of available functions for AutoComplete
 */
export const getAvailableFunctions = (): string[] => Object.keys(FUNCTION_LIBRARY);

/**
 * Get function help text
 */
export const getFunctionHelp = (functionName: string): FunctionDefinition | undefined => {
  return FUNCTION_DEFINITIONS[functionName.toUpperCase()];
};
