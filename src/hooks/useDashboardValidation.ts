// FILE: src/hooks/useDashboardValidation.ts
// Propósito: Hook para validar migraciones de dashboard al iniciar
// Uso: Importar en src/main.tsx o src/App.tsx

import { useEffect, useState } from 'react';
import { validateDashboardTables, type ValidationReport } from '@/lib/dashboard/validation';

export function useDashboardValidation() {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const runValidation = async () => {
      setIsChecking(true);
      try {
        const result = await validateDashboardTables();
        setReport(result);

        // Log to console in development
        if (import.meta.env.DEV) {
          console.log('[Dashboard] Validation Report:', result);
          const allPassed = result.results.every(r => r.passed);
          if (!allPassed) {
            console.warn('[Dashboard] Some validations failed - check report above');
          }
        }
      } catch (error) {
        console.error('[Dashboard] Validation error:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Only check in development or if explicitly enabled
    const shouldCheck = import.meta.env.DEV || localStorage.getItem('dashboard_validation') === 'true';
    
    if (shouldCheck) {
      // Run after a short delay to avoid blocking startup
      const timer = setTimeout(runValidation, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  return { report, isChecking };
}

/**
 * Component para mostrar validación en UI (para desarrollo)
 */
export function DashboardValidationDebug() {
  const { report, isChecking } = useDashboardValidation();

  if (!report || isChecking) return null;

  const allPassed = report.results.every(r => r.passed);
  const failedCount = report.results.filter(r => !r.passed).length;

  if (allPassed) return null; // No mostrar si todo está bien

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold text-sm text-red-900">
              Dashboard Validation Issues ({failedCount})
            </p>
            <ul className="mt-2 space-y-1 text-sm text-red-800">
              {report.results
                .filter(r => !r.passed)
                .map(r => (
                  <li key={r.name} className="text-xs">
                    ❌ {r.name}: {r.message}
                  </li>
                ))}
            </ul>
            <p className="mt-2 text-xs text-red-600">
              Open DevTools Console to see full report
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
