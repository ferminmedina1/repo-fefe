import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardFilters } from "@/contexts/DashboardFilterContext";

interface CriticalStockItem {
  name: string;
  stock: number;
  min_stock: number;
}

export function useCriticalStock(
  companyId: string | undefined,
  enabled = true,
  filters?: DashboardFilters
) {
  return useQuery<CriticalStockItem[]>({
    queryKey: ["dashboard-critical-stock", companyId, filters?.dimension, filters?.dimensionValue],
    queryFn: async () => {
      try {
        if (!companyId) throw new Error("Company ID is required");

        let query = supabase
          .from("products")
          .select("name, stock, min_stock")
          .eq("company_id", companyId)
          .lte("stock", 10)
          .order("stock", { ascending: true })
          .limit(5);

        if (filters?.dimension && filters?.dimensionValue) {
          query = query.eq(filters.dimension, filters.dimensionValue);
        }

        const { data, error } = await query;

        if (error) {
          if (
            error.code === '42P01' ||
            error.code === '42501' ||
            error.message?.includes('does not exist') ||
            error.message?.includes('permission')
          ) {
            console.warn("Products table not available yet, using fallback data");
            return [];
          }
          throw error;
        }
        return (data as CriticalStockItem[]) || [];
      } catch (error) {
        console.error("Error fetching critical stock:", error);
        if (
          error instanceof Object &&
          (
            ((error as any)?.code === '42P01') ||
            ((error as any)?.code === '42501') ||
            ((error as any)?.message?.includes('does not exist')) ||
            ((error as any)?.message?.includes('permission'))
          )
        ) {
          return [];
        }
        throw error;
      }
    },
    enabled: enabled && !!companyId,
  });
}
