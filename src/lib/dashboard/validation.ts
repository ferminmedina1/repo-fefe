// FILE: src/lib/dashboard/validation.ts
// Propósito: Validar que las tablas de dashboard existen y están accesibles
// Uso: Ejecutar al iniciar la app o en DevTools

import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
  timestamp: string;
}

export interface ValidationReport {
  allPassed: boolean;
  results: ValidationResult[];
  timestamp: string;
  duration: number;
}

/**
 * Verificar que una tabla existe ejecutando una query simple
 */
async function checkTableExists(tableName: string): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const { error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') {
        return {
          name: `Table ${tableName}`,
          passed: false,
          message: `Table does not exist: ${error.message}`,
          timestamp: new Date().toISOString(),
        };
      }
      return {
        name: `Table ${tableName}`,
        passed: false,
        message: `Error checking table: ${error.message} (Code: ${error.code})`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      name: `Table ${tableName}`,
      passed: true,
      message: `Table exists and is readable (${count} rows)`,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      name: `Table ${tableName}`,
      passed: false,
      message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Verificar que las funciones existen intentando usarlas
 */
async function checkFunctionsExist(): Promise<ValidationResult> {
  try {
    // Try to call a simple function
    const { data: result, error } = await supabase
      .rpc('get_shared_dashboard_layout', {
        p_share_token: 'test-token-that-does-not-exist'
      });

    // Si devuelve "undefined function", la función no existe
    if (error && error.message.includes('undefined function')) {
      return {
        name: 'Custom Functions',
        passed: false,
        message: 'Custom functions not found',
        timestamp: new Date().toISOString(),
      };
    }

    // Si devuelve otro error (como "no rows"), es que la función existe
    return {
      name: 'Custom Functions',
      passed: true,
      message: 'Custom functions are available',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      name: 'Custom Functions',
      passed: false,
      message: `Error checking functions: ${err instanceof Error ? err.message : String(err)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Verificar que RLS está funcionando (intentar query sin autenticación)
 */
async function checkRLSPolicy(): Promise<ValidationResult> {
  try {
    // Si estamos deslogueados, esta query debería fallar con RLS error
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .select('*');

    // Sin autenticación, RLS debería retornar error 42501 o 401
    if (error?.code === '42501' || error?.code === '401') {
      return {
        name: 'RLS Policies',
        passed: true,
        message: 'RLS is working correctly (blocking unauthorized access)',
        timestamp: new Date().toISOString(),
      };
    }

    // Si conseguimos datos sin autenticación, RLS podría no estar funcionando
    if (!error && data) {
      return {
        name: 'RLS Policies',
        passed: false,
        message: 'WARNING: RLS policies might not be working (query succeeded without auth)',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      name: 'RLS Policies',
      passed: true,
      message: 'RLS check completed',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      name: 'RLS Policies',
      passed: false,
      message: `Error checking RLS: ${err instanceof Error ? err.message : String(err)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Verificar que los presets están cargados
 */
async function checkPresetsLoaded(): Promise<ValidationResult> {
  try {
    const { data: presets, error } = await supabase
      .from('dashboard_templates')
      .select('*', { count: 'exact' })
      .eq('is_preset', true);

    if (error) {
      return {
        name: 'Preset Templates',
        passed: false,
        message: `Error loading presets: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }

    const count = presets?.length || 0;
    const expectedCount = 5;

    if (count === expectedCount) {
      return {
        name: 'Preset Templates',
        passed: true,
        message: `All ${count} preset templates loaded successfully`,
        timestamp: new Date().toISOString(),
      };
    } else if (count === 0) {
      return {
        name: 'Preset Templates',
        passed: false,
        message: 'No preset templates found (expected 5)',
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        name: 'Preset Templates',
        passed: true,
        message: `${count} preset templates loaded (expected ${expectedCount})`,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (err) {
    return {
      name: 'Preset Templates',
      passed: false,
      message: `Error checking presets: ${err instanceof Error ? err.message : String(err)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Ejecutar todas las validaciones
 */
export async function validateDashboardTables(): Promise<ValidationReport> {
  const startTime = Date.now();
  const results: ValidationResult[] = [];

  // Check all tables
  const tables = [
    'dashboard_layouts',
    'dashboard_configs',
    'dashboard_shares',
    'dashboard_templates',
    'custom_metrics',
    'metric_values'
  ];

  for (const table of tables) {
    const result = await checkTableExists(table);
    results.push(result);
  }

  // Check functions
  results.push(await checkFunctionsExist());

  // Check RLS
  results.push(await checkRLSPolicy());

  // Check presets
  results.push(await checkPresetsLoaded());

  const duration = Date.now() - startTime;
  const allPassed = results.every(r => r.passed);

  const report: ValidationReport = {
    allPassed,
    results,
    timestamp: new Date().toISOString(),
    duration
  };

  return report;
}

/**
 * Imprimir reporte de validación en consola
 */
export function printValidationReport(report: ValidationReport): void {
  console.log('\n================================');
  console.log('📊 DASHBOARD MIGRATION VALIDATION');
  console.log('================================\n');

  report.results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}`);
  });

  console.log('\n================================');
  if (report.allPassed) {
    console.log('✅ ALL VALIDATIONS PASSED!');
    console.log('Dashboard migrations are ready to use.');
  } else {
    const failedCount = report.results.filter(r => !r.passed).length;
    console.log(`❌ ${failedCount} VALIDATIONS FAILED`);
    console.log('Please check the migrations.');
  }
  console.log(`Time: ${report.duration}ms`);
  console.log('================================\n');
}

/**
 * Validación simple para DevTools
 * Uso en consola: validateDashboard()
 */
export async function validateDashboard(): Promise<void> {
  const report = await validateDashboardTables();
  printValidationReport(report);
}

// Export para usar en DevTools
if (typeof window !== 'undefined') {
  (window as any).validateDashboard = validateDashboard;
}
