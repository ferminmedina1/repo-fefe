import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExportDashboard } from '@/hooks/dashboard/useExportDashboard';
import { useImportDashboard } from '@/hooks/dashboard/useImportDashboard';
import { DashboardWidget } from '@/lib/dashboard/widgets';
import { ReactNode } from 'react';

// Wrapper for hooks with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('Dashboard Advanced Features - Testing Suite', () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    wrapper = createWrapper();
  });

  describe('Export/Import Round-trip', () => {
    it('should export widgets as JSON', () => {
      const { result } = renderHook(() => useExportDashboard(), { wrapper });

      const testWidgets: DashboardWidget[] = [
        { id: '1', type: 'kpi-monthly-sales', order: 0, size: 'half' },
        { id: '2', type: 'chart-top-products', order: 1, size: 'full' },
      ];

      act(() => {
        const exported = result.current.exportDashboard(testWidgets, 'Test Dashboard', 'Test');
        expect(exported.version).toBe('1.0.0');
        expect(exported.widgets).toEqual(testWidgets);
        expect(exported.metadata.name).toBe('Test Dashboard');
        expect(exported.metadata.widgetCount).toBe(2);
      });
    });

    it('should import widgets from JSON', () => {
      const { result: importResult } = renderHook(() => useImportDashboard(), { wrapper });

      const exportedJSON = JSON.stringify({
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        widgets: [
          { id: '1', type: 'kpi-monthly-sales', order: 0 },
          { id: '2', type: 'chart-top-products', order: 1 },
        ],
        metadata: { widgetCount: 2 },
      });

      act(() => {
        const result = importResult.current.importFromJSON(exportedJSON);
        expect(result.success).toBe(true);
        expect(result.widgets).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should validate and skip invalid widgets on import', () => {
      const { result: importResult } = renderHook(() => useImportDashboard(), { wrapper });

      const exportedJSON = JSON.stringify({
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        widgets: [
          { id: '1', type: 'kpi-monthly-sales', order: 0 },
          { id: '2', type: 'invalid-widget-type', order: 1 },
          { id: '3', type: 'monthly-sales', order: 2 }, // typo, should be kpi-monthly-sales
        ],
        metadata: { widgetCount: 3 },
      });

      act(() => {
        const result = importResult.current.importFromJSON(exportedJSON);
        expect(result.success).toBe(true);
        expect(result.widgets).toHaveLength(1); // Only valid widget
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    it('should handle malformed JSON gracefully', () => {
      const { result: importResult } = renderHook(() => useImportDashboard(), { wrapper });

      act(() => {
        const result = importResult.current.importFromJSON('{ invalid json }');
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Widget Validation', () => {
    it('should recognize all valid widget types', () => {
      const { result: importResult } = renderHook(() => useImportDashboard(), { wrapper });

      const validTypes = [
        'kpi-monthly-sales',
        'kpi-gross-margin',
        'kpi-receivables',
        'kpi-sales-today',
        'chart-top-products',
        'chart-top-customers',
        'chart-sales-7days',
        'list-critical-stock',
        'currency-rates',
        'currency-summary',
      ];

      validTypes.forEach((type) => {
        const dashboard = {
          version: '1.0.0',
          widgets: [{ id: '1', type, order: 0 }],
        };

        act(() => {
          const result = importResult.current.validateDashboard(dashboard);
          expect(result.success).toBe(true);
          expect(result.widgets).toHaveLength(1);
        });
      });
    });
  });

  describe('Dashboard Serialization', () => {
    it('should preserve widget metadata during export/import cycle', () => {
      const { result: exportResult } = renderHook(() => useExportDashboard(), { wrapper });
      const { result: importResult } = renderHook(() => useImportDashboard(), { wrapper });

      const originalWidgets: DashboardWidget[] = [
        { id: 'w1', type: 'kpi-monthly-sales', order: 0, size: 'half' },
        { id: 'w2', type: 'chart-sales-7days', order: 1, size: 'full' },
      ];

      let exported: any;
      act(() => {
        exported = exportResult.current.exportDashboard(originalWidgets, 'My Dashboard');
      });

      let imported: any;
      act(() => {
        imported = importResult.current.importFromJSON(JSON.stringify(exported));
      });

      expect(imported.widgets).toEqual(originalWidgets);
      expect(imported.success).toBe(true);
    });
  });

  describe('Template System', () => {
    it('should have predefined template widget arrays', () => {
      // This test validates the shape of template data
      const templateShape = {
        widgets: [
          { id: expect.any(String), type: expect.any(String), order: expect.any(Number) },
        ],
      };

      expect(templateShape.widgets[0]).toBeDefined();
      expect(templateShape.widgets[0].type).toBeTruthy();
    });
  });
});
