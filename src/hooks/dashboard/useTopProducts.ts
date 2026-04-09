import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth } from "date-fns";

interface TopProductItem {
  producto: string;
  rentabilidad: number;
  unidades: number;
}

export function useTopProducts(companyId: string | undefined, enabled = true) {
  return useQuery<TopProductItem[]>({
    queryKey: ["dashboard-top-products", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const currentMonthStart = startOfMonth(new Date());

      const { data: saleItems, error } = await supabase
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

      if (error) throw error;

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
    },
    enabled: enabled && !!companyId,
  });
}
