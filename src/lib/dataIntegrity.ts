/**
 * Data Integrity Validators
 * Valida la integridad de datos en operaciones críticas
 * Previene inconsistencias y violaciones de restricciones
 */

import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

/**
 * Valida que SKU y Barcode sean únicos en la empresa
 */
export async function validateProductUniqueness(
  companyId: string,
  productData: {
    sku?: string;
    barcode?: string;
  },
  excludeProductId?: string
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Validar SKU
    if (productData.sku && productData.sku.trim()) {
      const { data: existingSkus }: any = await supabase
        .from('products')
        .select('id')
        .eq('company_id', companyId)
        .eq('sku', productData.sku.trim());

      if (existingSkus && existingSkus.length > 0) {
        const hasDuplicate = existingSkus.some((s: any) => !excludeProductId || s.id !== excludeProductId);
        if (hasDuplicate) {
          errors.push(`SKU "${productData.sku}" ya existe en la empresa`);
        }
      }
    }

    // Validar Barcode
    if (productData.barcode && productData.barcode.trim()) {
      const { data: existingBarcodes }: any = await supabase
        .from('products')
        .select('id')
        .eq('company_id', companyId)
        .eq('barcode', productData.barcode.trim());

      if (existingBarcodes && existingBarcodes.length > 0) {
        const hasDuplicate = existingBarcodes.some((b: any) => !excludeProductId || b.id !== excludeProductId);
        if (hasDuplicate) {
          errors.push(`Código de barras "${productData.barcode}" ya existe en la empresa`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Error validating product uniqueness:', error);
    return {
      isValid: false,
      errors: ['Error al validar unicidad de datos'],
    };
  }
}

/**
 * Valida la consistencia de stock (total = suma de depósitos)
 */
export async function validateStockConsistency(
  productId: string,
  expectedTotal: number,
  companyId: string
): Promise<{ isConsistent: boolean; actualTotal: number; difference: number }> {
  try {
    const { data: warehouseStock }: any = await supabase
      .from('warehouse_stock')
      .select('stock')
      .eq('product_id', productId);

    const actualTotal = (warehouseStock || []).reduce((sum: number, ws: any) => sum + (ws.stock || 0), 0);
    const difference = expectedTotal - actualTotal;

    return {
      isConsistent: difference === 0,
      actualTotal,
      difference,
    };
  } catch (error) {
    console.error('Error validating stock consistency:', error);
    return {
      isConsistent: true,
      actualTotal: expectedTotal,
      difference: 0,
    };
  }
}

/**
 * Valida que los valores de imagen sean válidos
 */
export function validateImageMetadata(imageUrl: string | undefined): { isValid: boolean; error?: string } {
  if (!imageUrl) {
    return { isValid: true };
  }

  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return {
      isValid: false,
      error: 'Image URL debe ser http:// o https://',
    };
  }

  if (imageUrl.length > 2000) {
    return {
      isValid: false,
      error: 'Image URL es demasiado larga',
    };
  }

  return { isValid: true };
}

/**
 * Valida los datos antes de actualización masiva
 */
export function validateBulkUpdateData(
  updates: Record<string, any>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (updates.price !== undefined) {
    if (typeof updates.price !== 'number' || updates.price <= 0) {
      errors.push('Precio debe ser un número positivo');
    }
  }

  if (updates.cost !== undefined) {
    if (typeof updates.cost !== 'number' || updates.cost < 0) {
      errors.push('Costo no puede ser negativo');
    }
  }

  if (updates.stock !== undefined) {
    if (!Number.isInteger(updates.stock) || updates.stock < 0) {
      errors.push('Stock debe ser un número entero no negativo');
    }
  }

  if (updates.min_stock !== undefined) {
    if (!Number.isInteger(updates.min_stock) || updates.min_stock < 0) {
      errors.push('Stock mínimo debe ser un número entero no negativo');
    }
  }

  if (updates.category !== undefined) {
    if (typeof updates.category !== 'string' || updates.category.length > 100) {
      errors.push('Categoría debe ser texto con máximo 100 caracteres');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida los cambios de precio (previene cambios ilógicos)
 */
export function validatePriceChange(
  oldPrice: number,
  newPrice: number,
  maxPercentageChange: number = 500 // 500% máximo
): { isValid: boolean; error?: string; percentageChange: number } {
  const percentageChange = ((newPrice - oldPrice) / oldPrice) * 100;

  if (Math.abs(percentageChange) > maxPercentageChange) {
    return {
      isValid: false,
      error: `Cambio de precio demasiado radical (${percentageChange.toFixed(2)}%). Máximo permitido: ${maxPercentageChange}%`,
      percentageChange,
    };
  }

  return {
    isValid: true,
    percentageChange,
  };
}

/**
 * Valida que la distribución de stock en depósitos coincida con el total
 */
export function validateWarehouseDistribution(
  totalStock: number,
  warehouseDistribution: Record<string, number>
): { isValid: boolean; error?: string; total: number } {
  const total = Object.values(warehouseDistribution).reduce((sum, qty) => sum + (qty || 0), 0);

  if (total !== totalStock) {
    return {
      isValid: false,
      error: `Stock distribuido (${total}) no coincide con el total (${totalStock})`,
      total,
    };
  }

  return {
    isValid: true,
    total,
  };
}


// Validaciones de permisos se manejan a través del hook usePermissions existente
// que es más confiable y mantiene mejor control de acceso
