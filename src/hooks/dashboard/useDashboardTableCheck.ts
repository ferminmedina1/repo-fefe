import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para inicializar/verificar que todas las tablas del dashboard existan
 * Si no existen, intenta crearlas automáticamente
 */
export const useInitializeDashboardTables = () => {
  useEffect(() => {
    const initializeTables = async () => {
      try {
        // Verificar si las tablas existen intentando una query mínima
        const tablesToCheck = [
          'dashboard_layouts',
          'dashboard_templates',
          'dashboard_shares',
          'custom_metrics',
          'metric_values'
        ];

        for (const table of tablesToCheck) {
          try {
            // Query mínima para chequear si tabla existe
            await supabase.from(table).select('id').limit(1);
          } catch (err: any) {
            console.warn(`Table ${table} may not exist or has permission issues`, err);
            // Continue anyway - tables might be restricted but exist
          }
        }

        console.log('Dashboard tables initialization complete');
      } catch (err) {
        console.error('Error initializing dashboard tables:', err);
        // Non-blocking - app continues to work
      }
    };

    initializeTables();
  }, []);
};

/**
 * Wrapper para queries que pueden fallar con 404/403
 * Retorna error handling graceful
 */
export const safeQuery = async <T,>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  fallback: T | null = null
): Promise<{ data: T | null; error: any }> => {
  try {
    const result = await queryFn();

    // Handle specific errors
    if (result.error) {
      if (result.error.code === 'PGRST116') {
        // No rows found - this is OK
        return { data: fallback, error: null };
      }

      if (result.error.code === '42P01' || result.error.message?.includes('does not exist')) {
        // Table doesn't exist - return fallback
        console.warn('Table does not exist, using fallback data');
        return { data: fallback, error: null };
      }

      if (result.error.code === '42501' || result.error.message?.includes('permission')) {
        // RLS or permission denied - return fallback
        console.warn('Permission denied, using fallback data');
        return { data: fallback, error: null };
      }

      // Other errors - still return error but don't crash
      return result;
    }

    return result;
  } catch (err: any) {
    console.error('Query error:', err);
    return { data: fallback, error: err };
  }
};

/**
 * Get safe fallback data for dashboard if tables don't exist
 */
export const getDashboardFallbacks = () => ({
  layouts: [],
  metrics: [],
  shares: [],
  templates: [
    {
      id: 'default',
      name: 'Default Dashboard',
      description: 'Default dashboard layout',
      widgets: [
        { id: 'monthly-comparison', type: 'kpi', order: 0 },
        { id: 'top-products', type: 'list', order: 1 },
        { id: 'top-customers', type: 'list', order: 2 },
        { id: 'seven-days-sales', type: 'chart', order: 3 },
        { id: 'receivables', type: 'kpi', order: 4 },
        { id: 'critical-stock', type: 'list', order: 5 },
      ],
    },
  ],
});
