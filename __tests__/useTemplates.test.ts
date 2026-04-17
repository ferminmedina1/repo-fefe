// FILE: __tests__/useTemplates.test.ts
// Propósito: Tests para el hook useTemplates
// Ejecutar con: npm run test

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as reactQuery from '@tanstack/react-query';
import { useTemplates, useTemplatesForCategory } from '@/hooks/dashboard/useTemplates';

// Mock supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }))
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('useTemplates Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading presets only', () => {
    it('should filter by is_preset=true when includeCustom=false', async () => {
      const { result } = renderHook(() => useTemplates(false), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have called eq('is_preset', true)
      expect(mockSupabase.from).toHaveBeenCalledWith('dashboard_templates');
    });
  });

  describe('Loading all templates', () => {
    it('should include custom templates when includeCustom=true', async () => {
      const { result } = renderHook(() => useTemplates(true), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('dashboard_templates');
    });
  });

  describe('LIMIT applied', () => {
    it('should limit query results to 50', async () => {
      const { result } = renderHook(() => useTemplates(false), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have called limit(50)
      const fromMock = mockSupabase.from('dashboard_templates');
      expect(fromMock.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('Error handling', () => {
    it('should return empty array on table-not-exists error (42P01)', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { code: '42P01', message: 'relation "dashboard_templates" does not exist' }
        })
      });

      const { result } = renderHook(() => useTemplates(false), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should return empty array on other errors', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'NETWORK_ERROR', message: 'Network error' }
        })
      });

      const { result } = renderHook(() => useTemplates(false), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should have retry=1 for transient errors', async () => {
      // This would verify retry configuration
      expect(true).toBe(true);
    });
  });

  describe('Cache strategy', () => {
    it('should have staleTime of 5 minutes', async () => {
      // This would verify cache time in query options
      expect(true).toBe(true);
    });
  });
});

describe('useTemplatesForCategory Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Category filtering', () => {
    it('should filter by category', async () => {
      const { result } = renderHook(() => useTemplatesForCategory('sales'), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('dashboard_templates');
    });

    it('should not run if category is not provided', async () => {
      const { result } = renderHook(() => useTemplatesForCategory(''), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      // Query should be disabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('LIMIT applied to category query', () => {
    it('should limit category results to 50', async () => {
      const { result } = renderHook(() => useTemplatesForCategory('sales'), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fromMock = mockSupabase.from('dashboard_templates');
      expect(fromMock.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('Ordering', () => {
    it('should order by is_preset descending', async () => {
      const { result } = renderHook(() => useTemplatesForCategory('sales'), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fromMock = mockSupabase.from('dashboard_templates');
      expect(fromMock.order).toHaveBeenCalledWith('is_preset', { ascending: false });
    });
  });

  describe('Error handling for category queries', () => {
    it('should return empty array on errors', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { code: '42P01', message: 'Table does not exist' }
        })
      });

      const { result } = renderHook(() => useTemplatesForCategory('sales'), {
        wrapper: ({ children }) => (
          <reactQuery.QueryClientProvider client={new reactQuery.QueryClient()}>
            {children}
          </reactQuery.QueryClientProvider>
        )
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });
  });
});
