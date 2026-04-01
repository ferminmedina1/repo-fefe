// Formula Parser - Converts formula text to AST

import { FormulaToken, FormulaASTNode, FormulaValidation } from '@/types/dashboard';
import { FUNCTION_LIBRARY } from './FunctionLibrary';

type TokenType = 'function' | 'field' | 'operator' | 'number' | 'string' | 'parenthesis' | 'comma' | 'bracket' | 'eof' | 'whitespace';

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Tokenize formula text
 */
export class FormulaLexer {
  private input: string;
  private position = 0;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;

    while (this.position < this.input.length) {
      const char = this.current();

      // Skip whitespace
      if (/\s/.test(char)) {
        this.advance();
        continue;
      }

      // String literals
      if (char === '"' || char === "'") {
        this.readString();
      }
      // Numbers
      else if (/\d/.test(char) || (char === '-' && /\d/.test(this.peek()))) {
        this.readNumber();
      }
      // Field references (with brackets)
      else if (char === '[') {
        this.readFieldReference();
      }
      // Operators and punctuation
      else if ('(),+*/<>=!'.includes(char)) {
        this.readOperator();
      }
      // Function names or field names
      else if (/[a-zA-Z_]/.test(char)) {
        this.readIdentifier();
      }
      else {
        throw new Error(`Unknown character at position ${this.position}: ${char}`);
      }
    }

    // Add EOF token
    this.tokens.push({ type: 'eof', value: '', position: this.position });
    return this.tokens;
  }

  private current(): string {
    return this.input[this.position];
  }

  private peek(offset = 1): string {
    return this.input[this.position + offset] || '';
  }

  private advance(): void {
    this.position++;
  }

  private readString(): void {
    const quote = this.current();
    const start = this.position;
    this.advance();

    let value = '';
    while (this.position < this.input.length && this.current() !== quote) {
      if (this.current() === '\\' && this.peek() === quote) {
        value += quote;
        this.advance();
        this.advance();
      } else {
        value += this.current();
        this.advance();
      }
    }

    if (this.current() !== quote) {
      throw new Error(`Unterminated string at position ${start}`);
    }

    this.advance();
    this.tokens.push({ type: 'string', value, position: start });
  }

  private readNumber(): void {
    const start = this.position;
    let value = '';

    if (this.current() === '-') {
      value += '-';
      this.advance();
    }

    while (/\d/.test(this.current()) || this.current() === '.') {
      value += this.current();
      this.advance();
    }

    this.tokens.push({ type: 'number', value, position: start });
  }

  private readFieldReference(): void {
    const start = this.position;
    this.advance(); // Skip [

    let value = '';
    while (this.current() !== ']' && this.position < this.input.length) {
      value += this.current();
      this.advance();
    }

    if (this.current() !== ']') {
      throw new Error(`Unterminated field reference at position ${start}`);
    }

    this.advance(); // Skip ]
    this.tokens.push({ type: 'field', value, position: start });
  }

  private readOperator(): void {
    const start = this.position;
    let value = this.current();
    this.advance();

    // Check for two-character operators
    const twoChar = value + this.current();
    if (['<=', '>=', '!=', '==', '<>', '**'].includes(twoChar)) {
      value = twoChar;
      this.advance();
    }

    if ('()'.includes(value)) {
      this.tokens.push({ 
        type: value === '(' ? 'parenthesis' : 'parenthesis', 
        value, 
        position: start 
      });
    } else if (value === ',') {
      this.tokens.push({ type: 'comma', value, position: start });
    } else {
      this.tokens.push({ type: 'operator', value, position: start });
    }
  }

  private readIdentifier(): void {
    const start = this.position;
    let value = '';

    while (/[a-zA-Z0-9_]/.test(this.current())) {
      value += this.current();
      this.advance();
    }

    // Check if it's a function name
    const isFunctionName = FUNCTION_LIBRARY[value.toUpperCase()];
    const type = isFunctionName ? 'function' : 'field';

    this.tokens.push({ type, value, position: start });
  }
}

/**
 * Parse tokens to AST
 */
export class FormulaParser {
  private tokens: Token[];
  private position = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): FormulaASTNode {
    const ast = this.parseExpression();
    
    if (this.current().type !== 'eof') {
      throw new Error(`Unexpected token at position ${this.current().position}: ${this.current().value}`);
    }

    return ast;
  }

  private current(): Token {
    return this.tokens[this.position] || { type: 'eof', value: '', position: 0 };
  }

  private peek(offset = 1): Token {
    return this.tokens[this.position + offset] || { type: 'eof', value: '', position: 0 };
  }

  private advance(): Token {
    return this.tokens[this.position++];
  }

  private parseExpression(): FormulaASTNode {
    return this.parseOrExpression();
  }

  private parseOrExpression(): FormulaASTNode {
    let left = this.parseAndExpression();

    while (this.current().type === 'function' && this.current().value.toUpperCase() === 'OR') {
      this.advance();
      const right = this.parseAndExpression();
      left = {
        type: 'function',
        name: 'OR',
        args: [left, right]
      };
    }

    return left;
  }

  private parseAndExpression(): FormulaASTNode {
    let left = this.parseComparison();

    while (this.current().type === 'function' && this.current().value.toUpperCase() === 'AND') {
      this.advance();
      const right = this.parseComparison();
      left = {
        type: 'function',
        name: 'AND',
        args: [left, right]
      };
    }

    return left;
  }

  private parseComparison(): FormulaASTNode {
    let left = this.parseAdditive();

    while (['<', '>', '<=', '>=', '!=', '==', '<>'].includes(this.current().value)) {
      const operator = this.advance().value;
      const right = this.parseAdditive();
      left = {
        type: 'binary',
        operator,
        left,
        right
      };
    }

    return left;
  }

  private parseAdditive(): FormulaASTNode {
    let left = this.parseMultiplicative();

    while (['+', '-'].includes(this.current().value)) {
      const operator = this.advance().value;
      const right = this.parseMultiplicative();
      left = {
        type: 'binary',
        operator,
        left,
        right
      };
    }

    return left;
  }

  private parseMultiplicative(): FormulaASTNode {
    let left = this.parseUnary();

    while (['*', '/', '**'].includes(this.current().value)) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      left = {
        type: 'binary',
        operator,
        left,
        right
      };
    }

    return left;
  }

  private parseUnary(): FormulaASTNode {
    if (this.current().type === 'function' && this.current().value.toUpperCase() === 'NOT') {
      this.advance();
      const arg = this.parseUnary();
      return {
        type: 'unary',
        operator: 'NOT',
        right: arg
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): FormulaASTNode {
    const token = this.current();

    // Parenthesized expression
    if (token.value === '(') {
      this.advance();
      const expr = this.parseExpression();
      if (this.current().value !== ')') {
        throw new Error(`Expected ) at position ${this.current().position}`);
      }
      this.advance();
      return expr;
    }

    // Function call
    if (token.type === 'function') {
      return this.parseFunction();
    }

    // Field reference
    if (token.type === 'field') {
      this.advance();
      return {
        type: 'field',
        name: token.value
      };
    }

    // Number literal
    if (token.type === 'number') {
      this.advance();
      return {
        type: 'literal',
        value: Number(token.value)
      };
    }

    // String literal
    if (token.type === 'string') {
      this.advance();
      return {
        type: 'literal',
        value: token.value
      };
    }

    throw new Error(`Unexpected token at position ${token.position}: ${token.value}`);
  }

  private parseFunction(): FormulaASTNode {
    const nameToken = this.advance();
    const name = nameToken.value.toUpperCase();

    if (this.current().value !== '(') {
      throw new Error(`Expected ( after function name at position ${this.current().position}`);
    }

    this.advance();

    const args: FormulaASTNode[] = [];

    // Parse arguments
    if (this.current().value !== ')') {
      args.push(this.parseExpression());

      while (this.current().type === 'comma') {
        this.advance();
        args.push(this.parseExpression());
      }
    }

    if (this.current().value !== ')') {
      throw new Error(`Expected ) at position ${this.current().position}`);
    }

    this.advance();

    return {
      type: 'function',
      name,
      args
    };
  }
}

/**
 * Main formula parser function
 */
export const parseFormula = (formulaText: string): FormulaASTNode => {
  try {
    const lexer = new FormulaLexer(formulaText);
    const tokens = lexer.tokenize();
    const parser = new FormulaParser(tokens);
    return parser.parse();
  } catch (error) {
    throw new Error(`Formula parse error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Validate formula syntax
 */
export const validateFormulaSyntax = (formulaText: string): FormulaValidation => {
  const errors: any[] = [];
  const warnings: any[] = [];

  try {
    const lexer = new FormulaLexer(formulaText);
    const tokens = lexer.tokenize();
    const parser = new FormulaParser(tokens);
    parser.parse();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({
      message,
      position: 0,
      type: 'syntax'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};
