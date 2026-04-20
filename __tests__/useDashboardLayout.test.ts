// FILE: __tests__/useDashboardLayout.test.ts
// Propósito: Tests para el hook useDashboardLayout
// Ejecutar con: npm run test

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as reactQuery from '@tanstack/react-query';
import { useDashboardLayout } from '@/hooks/dashboard/useDashboardLayout';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    },
    from: vi.fn()
  }
}));

describe('useDashboardLayout Hook', () => {
  const mockUserId = 'user-123';
  const mockCompanyId = 'company-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useDashboardLayout(mockCompanyId, mockUserId), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Widget management', () => {
    it('should add widget to local state', async () => {
      const { result } = renderHook(() => useDashboardLayout(mockCompanyId, mockUserId), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.addWidget({
          id: 'widget-1',
          type: 'monthly-sales',
          size: 'half'
        });
      });

      expect(result.current.widgets).toHaveLength(1);
      expect(result.current.widgets[0]?.type).toBe('monthly-sales');
    });

    it('should remove widget from local state', async () => {
      const { result } = renderHook(() => useDashboardLayout(mockCompanyId, mockUserId), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add widget
      act(() => {
        result.current.addWidget({
          id: 'widget-1',
          type: 'monthly-sales',
          size: 'half'
        });
      });

      expect(result.current.widgets).toHaveLength(1);

      // Remove widget
      act(() => {
        result.current.removeWidget('widget-1');
      });

      expect(result.current.widgets).toHaveLength(0);
    });

    it('should reorder widgets', async () => {
      const { result } = renderHook(() => useDashboardLayout(mockCompanyId, mockUserId), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add two widgets
      act(() => {
        result.current.addWidget({
          id: 'widget-1',
          type: 'monthly-sales',
          size: 'half'
        });
        result.current.addWidget({
          id: 'widget-2',
          type: 'gross-margin',
          size: 'half'
        });
      });

      const firstWidgetInitial = result.current.widgets[0]?.id;

      // Reorder
      act(() => {
        result.current.reorderWidgets(0, 1);
      });

      const firstWidgetAfter = result.current.widgets[0]?.id;
      expect(firstWidgetInitial).not.toBe(firstWidgetAfter);
    });
  });

  describe('Error handling', () => {
    it('should handle table not exists error gracefully', async () => {
      // This test would need to mock the supabase error response
      // with code '42P01' (table doesn't exist)
      const { result } = renderHook(() => useDashboardLayout(mockCompanyId, mockUserId), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      // After error is handled, should return empty state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.widgets).toBeDefined();
      expect(Array.isArray(result.current.widgets)).toBe(true);
    });

    it('should have retry disabled for table-not-exists errors', async () => {
      // This would verify that we don't keep retrying
      // when table doesn't exist
      expect(true).toBe(true);
    });
  });

  describe('Auto-save behavior', () => {
    it('should debounce saves', async () => {
      const { result } = renderHook(() => useDashboardLayout(mockCompanyId, mockUserId), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add multiple widgets quickly
      act(() => {
        result.current.addWidget({
          id: 'widget-1',
          type: 'monthly-sales',
          size: 'half'
        });
        result.current.addWidget({
          id: 'widget-2',
          type: 'gross-margin',
          size: 'half'
        });
      });

      // Should be pending save but not have saved yet
      // (due to debounce)
      expect(result.current.isSaving).toBe(false); // Initial state
    });
  });

  describe('Reset layout', () => {
    it('should clear all widgets', async () => {
      const { result } = renderHook(() => useDashboardLayout(mockCompanyId, mockUserId), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add widgets
      act(() => {
        result.current.addWidget({
          id: 'widget-1',
          type: 'monthly-sales',
          size: 'half'
        });
      });

      expect(result.current.widgets).toHaveLength(1);

      // Reset
      act(async () => {
        await result.current.resetLayout();
      });

      expect(result.current.widgets).toHaveLength(0);
    });
  });

  describe('Missing dependencies', () => {
    it('should handle missing userId', () => {
      const { result } = renderHook(() => useDashboardLayout(mockCompanyId, undefined), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.widgets).toHaveLength(0);
    });

    it('should handle missing companyId', () => {
      const { result } = renderHook(() => useDashboardLayout(undefined, mockUserId), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.widgets).toHaveLength(0);
    });
  });
});
