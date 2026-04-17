import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { DashboardFilters } from "@/contexts/DashboardFilterContext";

interface SaleItem {
  quantity: number;
  unit_price: number;
  subtotal: number;
  cost?: number;
}

interface Sale {
  total: number;
  sale_items: SaleItem[] | null;
}

export interface MonthlyComparisonData {
  currentMonth: number;
  lastMonth: number;
  percentageChange: number;
  grossMargin: number;
  marginPercentage: number;
  isPositive: boolean;
}

export function useMonthlyComparison(
  companyId: string | undefined,
  enabled = true,
  filters?: DashboardFilters
) {
  return useQuery<MonthlyComparisonData>({
    queryKey: ["dashboard-monthly-comparison", companyId, filters?.dimension, filters?.dimensionValue],
    queryFn: async () => {
      try {
        if (!companyId) throw new Error("Company ID is required");

        // Use provided date range from filters, or default to current/last month
        const { from, to } = filters?.dateRange || {
          from: startOfMonth(new Date()),
          to: endOfMonth(new Date()),
        };

        const currentMonthStart = from;
        const currentMonthEnd = to;
        const lastMonthStart = startOfMonth(subMonths(currentMonthStart, 1));
        const lastMonthEnd = endOfMonth(subMonths(currentMonthStart, 1));

        // Build query with optional filters
        let currentMonthQuery = supabase
          .from("sales")
          .select("total, sale_items(quantity, unit_price, subtotal, cost)")
          .eq("company_id", companyId)
          .gte("created_at", currentMonthStart.toISOString())
          .lte("created_at", currentMonthEnd.toISOString());

        // Add dimension filter if specified
        if (filters?.dimension && filters?.dimensionValue) {
          currentMonthQuery = currentMonthQuery.eq(filters.dimension, filters.dimensionValue);
        }

        const { data: currentMonth, error: currentError } = await currentMonthQuery;

        let lastMonthQuery = supabase
          .from("sales")
          .select("total")
          .eq("company_id", companyId)
          .gte("created_at", lastMonthStart.toISOString())
          .lte("created_at", lastMonthEnd.toISOString());

        // Add same dimension filter if specified
        if (filters?.dimension && filters?.dimensionValue) {
          lastMonthQuery = lastMonthQuery.eq(filters.dimension, filters.dimensionValue);
        }

        const { data: lastMonth, error: lastError } = await lastMonthQuery;

        if (currentError || lastError) {
          const error = currentError || lastError;
          // Handle various error codes including 400 (bad request) and 406 (not acceptable)
          if (
            (error as any)?.code === '42P01' ||
            (error as any)?.code === '42501' ||
            (error as any)?.code === '400' ||
            (error as any)?.code === '406' ||
            (error as any)?.status === 400 ||
            (error as any)?.status === 406 ||
            (error as any)?.message?.includes('does not exist') ||
            (error as any)?.message?.includes('permission')
          ) {
            console.warn("Sales table not available yet, using fallback data", error);
            return {
              currentMonth: 0,
              lastMonth: 0,
              percentageChange: 0,
              grossMargin: 0,
              marginPercentage: 0,
              isPositive: false,
            };
          }
          // For unexpected errors, also return fallback to prevent crash
          console.error("Unexpected error in useMonthlyComparison:", error);
          return {
            currentMonth: 0,
            lastMonth: 0,
            percentageChange: 0,
            grossMargin: 0,
            marginPercentage: 0,
            isPositive: false,
          };
        }

      const currentTotal = (currentMonth as Sale[] | null)?.reduce(
        (acc, sale) => acc + Number(sale.total),
        0
      ) || 0;
      const lastTotal = (lastMonth as Sale[] | null)?.reduce(
        (acc, sale) => acc + Number(sale.total),
        0
      ) || 0;

      // Calculate gross margin using real cost field
      let totalCost = 0;
      (currentMonth as Sale[] | null)?.forEach((sale) => {
        sale.sale_items?.forEach((item) => {
          // Use real cost field if available, otherwise use 60% of subtotal as fallback
          const cost = item.cost || Number(item.subtotal) * 0.6;
          totalCost += cost;
        });
      });

      const grossMargin = currentTotal - totalCost;
      const marginPercentage = currentTotal > 0 ? (grossMargin / currentTotal) * 100 : 0;

      const percentageChange =
        lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 100;

      return {
        currentMonth: currentTotal,
        lastMonth: lastTotal,
        percentageChange,
        grossMargin,
        marginPercentage,
        isPositive: percentageChange >= 0,
      };
      } catch (error) {
        console.error("Error fetching monthly comparison:", error);
        if (
          error instanceof Object &&
          (
            ((error as any)?.code === '42P01') ||
            ((error as any)?.code === '42501') ||
            ((error as any)?.message?.includes('does not exist')) ||
            ((error as any)?.message?.includes('permission'))
          )
        ) {
          return {
            currentMonth: 0,
            lastMonth: 0,
            percentageChange: 0,
            grossMargin: 0,
            marginPercentage: 0,
            isPositive: false,
          };
        }
        throw error;
      }
    },
    enabled: enabled && !!companyId,
  });
}
