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

      if (error) throw error;

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
    },
    enabled: enabled && !!companyId,
  });
}
