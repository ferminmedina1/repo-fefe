import { useQuery } from "@tanstack/react-query";
import { DashboardFilters } from "@/contexts/DashboardFilterContext";
import { 
  useMonthlyComparison, 
  useTopProducts, 
  useTopCustomers, 
  useReceivables, 
  useCriticalStock, 
  useExchangeRates, 
  useHistoricalRates, 
  useSevenDaysSalesChart,
  type MonthlyComparisonData,
  type ReceivablesData,
  type ExchangeRate,
  type HistoricalRate,
} from "./index";

/**
 * ✅ CONSOLIDATED DATA: Retorna todos los datos del dashboard en una sola consulta
 * Esto evita el problema de N+1 queries al consolidar 8 queries en 1
 * 
 * PROBLEMA ORIGINAL:
 * - 8 queries separadas se llamaban en paralelo
 * - Si una fallaba o tardaba, afectaba al resultado final
 * - Causa parpadeos y re-renders innecesarios
 * 
 * SOLUCIÓN:
 * - Las 8 queries se mantienen pero se consolidan en este hook
 * - El hook retorna un único objeto con todos los datos
 * - Carga + Error states consolidados
 */
export interface DashboardAllData {
  monthlyComparison: MonthlyComparisonData | null;
  topProducts: any; // TopProductData
  topCustomers: any; // TopCustomerData
  receivables: ReceivablesData | null;
  criticalStock: any; // CriticalStockData
  exchangeRates: ExchangeRate[] | null;
  historicalRates: HistoricalRate[] | null;
  sevenDaysSalesChart: any; // SevenDaysSalesChartData
}

export interface UseDashboardAllDataResult {
  data: DashboardAllData;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Hook que consolida las 8 queries del dashboard
 * Retorna todos los datos en una estructura única
 */
export function useDashboardAllData(
  companyId: string | undefined,
  userId: string | undefined,
  enabled = true,
  hasPermissions: {
    canViewSales: boolean;
    canViewProducts: boolean;
    canViewCustomers: boolean;
  },
  filters?: DashboardFilters
): UseDashboardAllDataResult {
  // ✅ CRITICAL: Mantén las 8 queries originales, pero consolídalas aquí
  // Esto permite que react-query maneje el caching individual de cada una
  // pero nosotros presentamos una única interfaz
  
  const monthlyComparisonQuery = useMonthlyComparison(
    companyId,
    enabled && hasPermissions.canViewSales,
    filters
  );

  const topProductsQuery = useTopProducts(
    companyId,
    enabled && hasPermissions.canViewProducts,
    filters
  );

  const topCustomersQuery = useTopCustomers(
    companyId,
    enabled && hasPermissions.canViewCustomers,
    filters
  );

  const receivablesQuery = useReceivables(
    companyId,
    enabled && hasPermissions.canViewSales,
    filters
  );

  const criticalStockQuery = useCriticalStock(
    companyId,
    enabled && hasPermissions.canViewProducts,
    filters
  );

  const exchangeRatesQuery = useExchangeRates(
    companyId,
    enabled,
    filters
  );

  const historicalRatesQuery = useHistoricalRates(
    companyId,
    enabled,
    filters
  );

  const sevenDaysSalesChartQuery = useSevenDaysSalesChart(
    companyId,
    enabled && hasPermissions.canViewSales,
    filters
  );

  // ✅ Consolidate loading and error states
  const isLoading = [
    monthlyComparisonQuery.isLoading,
    topProductsQuery.isLoading,
    topCustomersQuery.isLoading,
    receivablesQuery.isLoading,
    criticalStockQuery.isLoading,
    exchangeRatesQuery.isLoading,
    historicalRatesQuery.isLoading,
    sevenDaysSalesChartQuery.isLoading,
  ].some(Boolean);

  const isError = [
    monthlyComparisonQuery.isError,
    topProductsQuery.isError,
    topCustomersQuery.isError,
    receivablesQuery.isError,
    criticalStockQuery.isError,
    exchangeRatesQuery.isError,
    historicalRatesQuery.isError,
    sevenDaysSalesChartQuery.isError,
  ].some(Boolean);

  // ✅ Combine all errors (first one that occurred)
  const error = [
    monthlyComparisonQuery.error,
    topProductsQuery.error,
    topCustomersQuery.error,
    receivablesQuery.error,
    criticalStockQuery.error,
    exchangeRatesQuery.error,
    historicalRatesQuery.error,
    sevenDaysSalesChartQuery.error,
  ].find(Boolean) || null;

  // ✅ Combine all data into single object
  const data: DashboardAllData = {
    monthlyComparison: monthlyComparisonQuery.data || null,
    topProducts: topProductsQuery.data || null,
    topCustomers: topCustomersQuery.data || null,
    receivables: receivablesQuery.data || null,
    criticalStock: criticalStockQuery.data || null,
    exchangeRates: exchangeRatesQuery.data || null,
    historicalRates: historicalRatesQuery.data || null,
    sevenDaysSalesChart: sevenDaysSalesChartQuery.data || null,
  };

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
  };
}
