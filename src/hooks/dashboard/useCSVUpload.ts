import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

export interface CSVUploadResult {
  success: boolean;
  inserted: number;
  errors: string[];
  warnings: string[];
}

export interface CSVRow {
  [key: string]: string | number;
}

// Define required columns for sales data
const SALES_REQUIRED_COLUMNS = ['product_name', 'quantity', 'unit_price'];
const OPTIONAL_COLUMNS = ['customer_name', 'date', 'cost', 'category'];

export const useCSVUpload = () => {
  const validateHeaders = useCallback((headers: string[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());

    // Check required columns
    SALES_REQUIRED_COLUMNS.forEach(required => {
      if (!lowerHeaders.includes(required.toLowerCase())) {
        errors.push(`Missing required column: "${required}"`);
      }
    });

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }, []);

  const parseCSV = useCallback((file: File): Promise<{ rows: CSVRow[]; headers: string[] } | null> => {
    return new Promise((resolve) => {
      Papa.parse(file, {
        complete: (results) => {
          if (results.data.length === 0) {
            resolve(null);
            return;
          }

          const headers = (results.data[0] as string[]).map(h => h.toLowerCase().trim());
          const rows = (results.data.slice(1) as unknown[]).filter(row => {
            // Skip empty rows
            if (!row || (Array.isArray(row) && row.every(cell => !cell))) {
              return false;
            }
            return true;
          });

          const parsedRows = rows.map((row: unknown) => {
            const rowObj: CSVRow = {};
            const rowArray = Array.isArray(row) ? row : Object.values(row || {});
            headers.forEach((header, index) => {
              rowObj[header] = rowArray[index] || '';
            });
            return rowObj;
          });

          resolve({ rows: parsedRows, headers });
        },
        error: () => {
          resolve(null);
        },
      });
    });
  }, []);

  const uploadSalesData = useCallback(
    async (
      companyId: string,
      rows: CSVRow[],
      headers: string[]
    ): Promise<CSVUploadResult> => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let inserted = 0;

      // Validate headers first
      const headerValidation = validateHeaders(headers);
      if (!headerValidation.valid) {
        return {
          success: false,
          inserted: 0,
          errors: headerValidation.errors,
          warnings,
        };
      }

      // Process each row
      const salesToInsert: any[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Extract required fields
        const productName = row.product_name?.toString().trim();
        const quantity = parseFloat(row.quantity?.toString() || '0');
        const unitPrice = parseFloat(row.unit_price?.toString() || '0');

        // Validate required fields
        if (!productName) {
          warnings.push(`Row ${i + 2}: Missing product_name`);
          continue;
        }

        if (isNaN(quantity) || quantity <= 0) {
          warnings.push(`Row ${i + 2}: Invalid quantity "${row.quantity}"`);
          continue;
        }

        if (isNaN(unitPrice) || unitPrice < 0) {
          warnings.push(`Row ${i + 2}: Invalid unit_price "${row.unit_price}"`);
          continue;
        }

        // Extract optional fields
        const cost = row.cost ? parseFloat(row.cost.toString()) : unitPrice * 0.6; // Default 60% cost
        const customerName = row.customer_name?.toString().trim() || 'Sin cliente';
        const category = row.category?.toString().trim() || 'General';
        const dateStr = row.date?.toString().trim() || new Date().toISOString().split('T')[0];

        // Validate date
        const saleDate = new Date(dateStr);
        if (isNaN(saleDate.getTime())) {
          warnings.push(`Row ${i + 2}: Invalid date "${row.date}"`);
          continue;
        }

        const subtotal = quantity * unitPrice;

        salesToInsert.push({
          company_id: companyId,
          total: subtotal,
          created_at: saleDate.toISOString(),
          // Will handle sale_items separately
          _productName: productName,
          _quantity: quantity,
          _unitPrice: unitPrice,
          _cost: cost,
          _customerName: customerName,
          _category: category,
          _subtotal: subtotal,
        });
      }

      if (salesToInsert.length === 0) {
        return {
          success: false,
          inserted: 0,
          errors: ['No valid rows to import'],
          warnings,
        };
      }

      try {
        // Insert sales data
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .insert(
            salesToInsert.map(sale => ({
              company_id: sale.company_id,
              total: sale._subtotal,
              created_at: sale.created_at,
            }))
          )
          .select('id');

        if (salesError) {
          errors.push(`Failed to insert sales: ${salesError.message}`);
          return { success: false, inserted: 0, errors, warnings };
        }

        if (!salesData || salesData.length === 0) {
          errors.push('No sales records created');
          return { success: false, inserted: 0, errors, warnings };
        }

        // Insert sale items
        const saleItems = salesToInsert.flatMap((sale, index) => ({
          sale_id: salesData[index]?.id,
          product_name: sale._productName,
          quantity: sale._quantity,
          unit_price: sale._unitPrice,
          subtotal: sale._subtotal,
          cost: sale._cost,
        }));

        const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);

        if (itemsError) {
          warnings.push(`Sales inserted but failed to insert items: ${itemsError.message}`);
        }

        inserted = salesData.length;
        return { success: true, inserted, errors, warnings };
      } catch (err) {
        errors.push(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return { success: false, inserted, errors, warnings };
      }
    },
    [validateHeaders]
  );

  return {
    parseCSV,
    validateHeaders,
    uploadSalesData,
  };
};
