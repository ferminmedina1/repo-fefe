import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth } from "date-fns";
import { DashboardFilters } from "@/contexts/DashboardFilterContext";

interface TopCustomerItem {
  cliente: string;
  total: number;
  compras: number;
}

export function useTopCustomers(
  companyId: string | undefined,
  enabled = true,
  filters?: DashboardFilters
) {
  return useQuery<TopCustomerItem[]>({
    queryKey: ["dashboard-top-customers", companyId, filters?.dimension, filters?.dimensionValue],
    queryFn: async () => {
      try {
        if (!companyId) throw new Error("Company ID is required");

        const currentMonthStart = filters?.dateRange?.from || startOfMonth(new Date());

        let query = supabase
          .from("sales")
          .select("customer_id, total, customers(name)")
          .eq("company_id", companyId)
          .gte("created_at", currentMonthStart.toISOString())
          .not("customer_id", "is", null);

        if (filters?.dimension && filters?.dimensionValue) {
          query = query.eq(filters.dimension, filters.dimensionValue);
        }

        const { data, error } = await query;

        if (error) {
          // Handle various error codes gracefully
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
            console.warn("Sales table not available yet, using fallback data");
            return [];
          }
          // For unexpected errors, return empty array instead of throwing
          console.error("Unexpected error in useTopCustomers:", error);
          return [];
        }

      const customerMap = new Map<string, { name: string; total: number; count: number }>();

      (data as any[])?.forEach((sale) => {
        const customerId = sale.customer_id;
        const customerName = sale.customers?.name || "Sin nombre";
        const existing =
          customerMap.get(customerId) || { name: customerName, total: 0, count: 0 };
        customerMap.set(customerId, {
          name: customerName,
          total: existing.total + Number(sale.total),
          count: existing.count + 1,
        });
      });

        return Array.from(customerMap.values())
          .map((c) => ({
            cliente: c.name,
            total: c.total,
            compras: c.count,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
      } catch (error) {
        console.error("Error fetching top customers:", error);
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
