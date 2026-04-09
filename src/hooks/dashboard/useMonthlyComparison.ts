import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

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

export function useMonthlyComparison(companyId: string | undefined, enabled = true) {
  return useQuery<MonthlyComparisonData>({
    queryKey: ["dashboard-monthly-comparison", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const currentMonthStart = startOfMonth(new Date());
      const currentMonthEnd = endOfMonth(new Date());
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
      const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

      const { data: currentMonth, error: currentError } = await supabase
        .from("sales")
        .select("total, sale_items(quantity, unit_price, subtotal, cost)")
        .eq("company_id", companyId)
        .gte("created_at", currentMonthStart.toISOString())
        .lte("created_at", currentMonthEnd.toISOString());

      const { data: lastMonth, error: lastError } = await supabase
        .from("sales")
        .select("total")
        .eq("company_id", companyId)
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());

      if (currentError || lastError) throw currentError || lastError;

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
    },
    enabled: enabled && !!companyId,
  });
}
