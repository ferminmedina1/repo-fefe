import { useCallback } from 'react';
import { DashboardWidget, isValidWidgetType } from '@/lib/dashboard/widgets';

interface ExportedDashboard {
  version: string;
  exportedAt: string;
  widgets: DashboardWidget[];
  metadata?: {
    name?: string;
    description?: string;
    widgetCount?: number;
  };
}

interface ImportResult {
  success: boolean;
  widgets: DashboardWidget[];
  errors: string[];
  warnings: string[];
}

export const useImportDashboard = () => {
  const validateDashboard = useCallback((data: unknown): ImportResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let widgets: DashboardWidget[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Invalid file format');
      return { success: false, widgets: [], errors, warnings };
    }

    const dashboard = data as Record<string, unknown>;

    // Check version
    if (dashboard.version !== '1.0.0') {
      warnings.push(`Dashboard version ${dashboard.version} may not be fully compatible`);
    }

    // Validate widgets array
    if (!Array.isArray(dashboard.widgets)) {
      errors.push('No widgets found in file');
      return { success: false, widgets: [], errors, warnings };
    }

    // Filter valid widgets, skip invalid ones
    dashboard.widgets.forEach((widget: unknown, index: number) => {
      if (!widget || typeof widget !== 'object') {
        warnings.push(`Widget ${index} is malformed, skipping`);
        return;
      }

      const w = widget as Record<string, unknown>;
      if (!isValidWidgetType(w.type as string)) {
        warnings.push(`Widget ${index} has invalid type "${w.type}", skipping`);
        return;
      }

      widgets.push(widget as DashboardWidget);
    });

    if (widgets.length === 0) {
      errors.push('No valid widgets found after validation');
      return { success: false, widgets: [], errors, warnings };
    }

    return {
      success: true,
      widgets,
      errors,
      warnings,
    };
  }, []);

  const importFromJSON = useCallback(
    (jsonString: string): ImportResult => {
      try {
        const data = JSON.parse(jsonString);
        return validateDashboard(data);
      } catch (error) {
        return {
          success: false,
          widgets: [],
          errors: [`JSON parse error: ${error instanceof Error ? error.message : 'Unknown'}`],
          warnings: [],
        };
      }
    },
    [validateDashboard]
  );

  return { importFromJSON, validateDashboard };
};
