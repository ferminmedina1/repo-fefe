/**
 * Dashboard Validation Utilities
 * Centraliza validaciones y sanitización de datos
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida un archivo CSV
 */
export function validateCSVFile(file: File): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar tipo MIME
  if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    errors.push('El archivo no es un CSV válido');
  }

  // Validar tamaño (máximo 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`Archivo demasiado grande: ${(file.size / 1024 / 1024).toFixed(1)}MB (máximo: 10MB)`);
  }

  // Advertencia si archivo es muy grande (>5MB)
  if (file.size > 5 * 1024 * 1024) {
    warnings.push('El archivo es bastante grande, la importación puede tardar unos segundos');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida una fórmula (previene XSS/injection)
 */
export function validateFormula(formula: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!formula || typeof formula !== 'string') {
    errors.push('La fórmula es requerida y debe ser texto');
    return { valid: false, errors, warnings };
  }

  // Trim espacios
  const trimmed = formula.trim();
  if (trimmed.length === 0) {
    errors.push('La fórmula no puede estar vacía');
    return { valid: false, errors, warnings };
  }

  // Prevenir eval() o Function() injection
  if (trimmed.includes('eval') || trimmed.includes('Function')) {
    errors.push('Fórmula contiene código no permitido');
    return { valid: false, errors, warnings };
  }

  // Prevenir acceso a window o global
  if (trimmed.includes('window') || trimmed.includes('global') || trimmed.includes('document')) {
    errors.push('No se permite acceso a objetos globales en fórmulas');
    return { valid: false, errors, warnings };
  }

  // Advertencia si la fórmula es muy larga (>500 caracteres)
  if (trimmed.length > 500) {
    warnings.push('La fórmula es bastante larga, considera simplificarla');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida datos de widget
 */
export function validateWidgetData(data: any, maxSizeBytes = 5 * 1024 * 1024): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Serializar para medir tamaño
    const serialized = JSON.stringify(data);
    const sizeBytes = new Blob([serialized]).size;

    if (sizeBytes > maxSizeBytes) {
      errors.push(
        `Datos del widget demasiado grandes: ${(sizeBytes / 1024 / 1024).toFixed(1)}MB (máximo: ${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB)`
      );
    }

    // Advertencia si datos son grandes (>2MB)
    if (sizeBytes > 2 * 1024 * 1024) {
      warnings.push('Los datos son bastante grandes, considera filtrar o paginar');
    }

    // Detectar contenido sospechoso
    if (serialized.includes('<script') || serialized.includes('javascript:')) {
      errors.push('Datos contienen contenido sospechoso (scripts)');
    }
  } catch (error) {
    errors.push('No se pudieron validar los datos (no son serializables)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida configuración de colores
 */
export const VALID_COLORS = ['blue', 'green', 'orange', 'purple', 'red', 'cyan'];

export function validateColor(color: string): boolean {
  return VALID_COLORS.includes(color);
}

/**
 * Valida tipos de widget
 */
export const VALID_WIDGET_TYPES = [
  'kpi',
  'chart',
  'list',
  'currency',
  'metric',
  'gauge',
  'table',
  'map',
];

export function validateWidgetType(type: string): boolean {
  return VALID_WIDGET_TYPES.includes(type);
}

/**
 * Sanitiza nombres y descripciones
 */
export function sanitizeText(text: string, maxLength = 200): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remover etiquetas HTML y scripts
  let sanitized = text
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .trim();

  // Limitar longitud
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim() + '...';
  }

  return sanitized;
}

/**
 * Valida ID de widget (debe ser único)
 */
export function validateWidgetId(id: string): ValidationResult {
  const errors: string[] = [];

  if (!id || typeof id !== 'string') {
    errors.push('ID de widget es requerido');
  } else if (id.length < 5) {
    errors.push('ID de widget debe tener al menos 5 caracteres');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    errors.push('ID de widget contiene caracteres no permitidos');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Extrae campos de referencia de una fórmula (ej: [field_name])
 */
export function extractFormulaFields(formula: string): string[] {
  const regex = /\[([a-zA-Z0-9_]+)\]/g;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(formula)) !== null) {
    matches.push(match[1]);
  }

  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Valida que todos los campos de una fórmula existan en los datos disponibles
 */
export function validateFormulaFields(
  formula: string,
  availableFields: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const referencedFields = extractFormulaFields(formula);
  const missingFields = referencedFields.filter((field) => !availableFields.includes(field));

  if (missingFields.length > 0) {
    errors.push(`Campos no encontrados en los datos: ${missingFields.join(', ')}`);
  }

  if (referencedFields.length === 0) {
    warnings.push('La fórmula no referencia ningún campo de datos');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
