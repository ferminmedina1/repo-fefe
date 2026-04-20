import { useMemo } from 'react';
import {
  useMonthlyComparison,
  useTopProducts,
  useTopCustomers,
  useReceivables,
  useCriticalStock,
  useExchangeRates,
  useSevenDaysSalesChart,
} from './index';
import { useHistoricalRates } from './useExchangeRates';
import { DashboardFilters } from '@/contexts/DashboardFilterContext';
import { CACHE_TIMES } from '@/lib/dashboard/queryOptimization';

/**
 * Consolidated dashboard data hook
 * Combines all individual dashboard hooks into a single centralized interface
 * Reduces prop drilling and simplifies query management
 */
export interface DashboardData {
  monthlyComparison: any;
  topProducts: any[];
  topCustomers: any[];
  receivables: any;
  criticalStock: any[];
  exchangeRates: any[];
  historicalRates: any[];
  sevenDaysSales: any[];
}

export interface DashboardDataState {
  data: DashboardData;
  isLoading: boolean;
  error: {
    monthlyComparison?: Error | null;
    topProducts?: Error | null;
    topCustomers?: Error | null;
    receivables?: Error | null;
    criticalStock?: Error | null;
    exchangeRates?: Error | null;
    historicalRates?: Error | null;
    sevenDaysSales?: Error | null;
  };
  refetch: () => Promise<void>;
}

/**
 * Centralized hook for all dashboard data
 * ✅ Simplifies DashboardBuilder by consolidating 8+ queries
 * ✅ Provides single source of truth for dashboard state
 * ✅ Easier to add/remove metrics without prop drilling
 * ✅ All queries run in parallel (not sequential)
 * ✅ Phase 5: Uses CACHE_TIMES configuration for optimal caching
 *
 * @param companyId - The company ID for filtering data
 * @param permissions - Optional permission flags for conditional fetching
 * @param filters - Optional filters to apply to queries
 * @returns Consolidated dashboard data state
 *
 * Performance:
 * - Request Deduplication: Same queryKey = 1 actual request
 * - Stale-while-revalidate: Instant load from cache + background updates
 * - Parallel Execution: All 8 queries fire simultaneously (Promise.all)
 * - Cache Strategy: DASHBOARD cache (5min stale, 10min retention)
 *
 * @example
 * const dashboard = useDashboardData(companyId, {
 *   canViewSales: true,
 *   canViewProducts: true,
 * });
 *
 * // Access data:
 * dashboard.data.monthlyComparison
 * dashboard.isLoading
 * dashboard.error.topProducts
 * dashboard.refetch()
 */
export function useDashboardData(
  companyId?: string,
  permissions?: {
    canViewSales?: boolean;
    canViewProducts?: boolean;
    canViewCustomers?: boolean;
  },
  filters?: DashboardFilters
): DashboardDataState {
  // ✅ Fetch all queries in parallel (not sequential)
  const monthlyComparisonQuery = useMonthlyComparison(
    companyId,
    permissions?.canViewSales,
    filters
  );

  const topProductsQuery = useTopProducts(
    companyId,
    permissions?.canViewSales && permissions?.canViewProducts,
    filters
  );

  const topCustomersQuery = useTopCustomers(
    companyId,
    permissions?.canViewSales && permissions?.canViewCustomers,
    filters
  );

  const receivablesQuery = useReceivables(
    companyId,
    permissions?.canViewSales,
    filters
  );

  const criticalStockQuery = useCriticalStock(
    companyId,
    permissions?.canViewProducts,
    filters
  );

  const exchangeRatesQuery = useExchangeRates(
    companyId,
    true, // Always fetch exchange rates
    filters
  );

  const historicalRatesQuery = useHistoricalRates(
    companyId,
    true, // Always fetch historical rates
    filters
  );

  const sevenDaysSalesQuery = useSevenDaysSalesChart(
    companyId,
    permissions?.canViewSales,
    filters
  );

  // ✅ Consolidate all data into single object
  const data = useMemo(
    () => ({
      monthlyComparison: monthlyComparisonQuery.data,
      topProducts: topProductsQuery.data ?? [],
      topCustomers: topCustomersQuery.data ?? [],
      receivables: receivablesQuery.data,
      criticalStock: criticalStockQuery.data ?? [],
      exchangeRates: exchangeRatesQuery.data ?? [],
      historicalRates: historicalRatesQuery.data ?? [],
      sevenDaysSales: sevenDaysSalesQuery.data ?? [],
    }),
    [
      monthlyComparisonQuery.data,
      topProductsQuery.data,
      topCustomersQuery.data,
      receivablesQuery.data,
      criticalStockQuery.data,
      exchangeRatesQuery.data,
      historicalRatesQuery.data,
      sevenDaysSalesQuery.data,
    ]
  );

  // ✅ Consolidate all loading states
  const isLoading = useMemo(
    () =>
      monthlyComparisonQuery.isLoading ||
      topProductsQuery.isLoading ||
      topCustomersQuery.isLoading ||
      receivablesQuery.isLoading ||
      criticalStockQuery.isLoading ||
      exchangeRatesQuery.isLoading ||
      historicalRatesQuery.isLoading ||
      sevenDaysSalesQuery.isLoading,
    [
      monthlyComparisonQuery.isLoading,
      topProductsQuery.isLoading,
      topCustomersQuery.isLoading,
      receivablesQuery.isLoading,
      criticalStockQuery.isLoading,
      exchangeRatesQuery.isLoading,
      historicalRatesQuery.isLoading,
      sevenDaysSalesQuery.isLoading,
    ]
  );

  // ✅ Consolidate all errors
  const error = useMemo(
    () => ({
      monthlyComparison: monthlyComparisonQuery.error,
      topProducts: topProductsQuery.error,
      topCustomers: topCustomersQuery.error,
      receivables: receivablesQuery.error,
      criticalStock: criticalStockQuery.error,
      exchangeRates: exchangeRatesQuery.error,
      historicalRates: historicalRatesQuery.error,
      sevenDaysSales: sevenDaysSalesQuery.error,
    }),
    [
      monthlyComparisonQuery.error,
      topProductsQuery.error,
      topCustomersQuery.error,
      receivablesQuery.error,
      criticalStockQuery.error,
      exchangeRatesQuery.error,
      historicalRatesQuery.error,
      sevenDaysSalesQuery.error,
    ]
  );

  // ✅ Refetch function - refetch all queries
  const refetch = async () => {
    await Promise.all([
      monthlyComparisonQuery.refetch(),
      topProductsQuery.refetch(),
      topCustomersQuery.refetch(),
      receivablesQuery.refetch(),
      criticalStockQuery.refetch(),
      exchangeRatesQuery.refetch(),
      historicalRatesQuery.refetch(),
      sevenDaysSalesQuery.refetch(),
    ]);
  };

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for getting data from useDashboardData with a specific key
 * Useful for widgets that need a specific piece of data
 *
 * @example
 * const monthlyData = useDashboardDataValue('monthlyComparison', dashboard);
 */
export function useDashboardDataValue<K extends keyof DashboardData>(
  key: K,
  state: DashboardDataState
): DashboardData[K] {
  return state.data[key];
}
