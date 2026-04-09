import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CriticalStockItem {
  name: string;
  stock: number;
  min_stock: number;
}

export function useCriticalStock(companyId: string | undefined, enabled = true) {
  return useQuery<CriticalStockItem[]>({
    queryKey: ["critical-stock-list", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("products")
        .select("name, stock, min_stock")
        .eq("company_id", companyId)
        .lte("stock", 10)
        .order("stock", { ascending: true })
        .limit(5);

      if (error) throw error;
      return (data as CriticalStockItem[]) || [];
    },
    enabled: enabled && !!companyId,
  });
}
