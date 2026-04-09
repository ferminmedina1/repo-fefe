import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth } from "date-fns";
import { DashboardFilters } from "@/contexts/DashboardFilterContext";

interface TopProductItem {
  producto: string;
  rentabilidad: number;
  unidades: number;
}

export function useTopProducts(
  companyId: string | undefined,
  enabled = true,
  filters?: DashboardFilters
) {
  return useQuery<TopProductItem[]>({
    queryKey: ["dashboard-top-products", companyId, filters?.dimension, filters?.dimensionValue],
    queryFn: async () => {
      try {
        if (!companyId) throw new Error("Company ID is required");

        const currentMonthStart = filters?.dateRange?.from || startOfMonth(new Date());

        let query = supabase
          .from("sale_items")
          .select(`
            product_id,
            product_name,
            quantity,
            unit_price,
            subtotal,
            sales!inner(created_at, company_id)
          `)
          .eq("sales.company_id", companyId)
          .gte("sales.created_at", currentMonthStart.toISOString());

        if (filters?.dimension && filters?.dimensionValue) {
          query = query.eq(filters.dimension, filters.dimensionValue);
        }

        const { data: saleItems, error } = await query;

        if (error) {
          if (
            error.code === '42P01' ||
            error.code === '42501' ||
            error.message?.includes('does not exist') ||
            error.message?.includes('permission')
          ) {
            console.warn("Sale items table not available yet, using fallback data");
            return [];
          }
          throw error;
        }

      const productMap = new Map<string, { name: string; revenue: number; quantity: number }>();

      (saleItems as any[])?.forEach((item) => {
        const existing =
          productMap.get(item.product_id) || { name: item.product_name, revenue: 0, quantity: 0 };
        productMap.set(item.product_id, {
          name: item.product_name,
          revenue: existing.revenue + Number(item.subtotal),
          quantity: existing.quantity + item.quantity,
        });
      });

        return Array.from(productMap.values())
          .map((p) => ({
            producto: p.name,
            rentabilidad: p.revenue,
            unidades: p.quantity,
          }))
          .sort((a, b) => b.rentabilidad - a.rentabilidad)
          .slice(0, 5);
      } catch (error) {
        console.error("Error fetching top products:", error);
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
