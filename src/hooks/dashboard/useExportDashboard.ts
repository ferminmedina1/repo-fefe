import { useCallback } from 'react';
import { DashboardWidget } from '@/lib/dashboard/widgets';

interface ExportedDashboard {
  version: '1.0.0';
  exportedAt: string;
  widgets: DashboardWidget[];
  metadata: {
    name?: string;
    description?: string;
    widgetCount: number;
  };
}

export const useExportDashboard = () => {
  const exportDashboard = useCallback(
    (widgets: DashboardWidget[], name?: string, description?: string): ExportedDashboard => {
      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        widgets,
        metadata: {
          name,
          description,
          widgetCount: widgets.length,
        },
      };
    },
    []
  );

  const downloadAsJSON = useCallback((dashboard: ExportedDashboard, filename: string = 'dashboard.json') => {
    const jsonString = JSON.stringify(dashboard, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return { exportDashboard, downloadAsJSON };
};
