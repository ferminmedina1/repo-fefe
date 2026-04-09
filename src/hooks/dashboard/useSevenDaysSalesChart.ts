import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay, format } from "date-fns";
import { es } from "date-fns/locale";
import { DashboardFilters } from "@/contexts/DashboardFilterContext";

interface ChartDataPoint {
  date: string;
  ventas: number;
}

export function useSevenDaysSalesChart(
  companyId: string | undefined,
  enabled = true,
  filters?: DashboardFilters
) {
  return useQuery<ChartDataPoint[]>({
    queryKey: ["dashboard-seven-days-sales", companyId, filters?.dimension, filters?.dimensionValue],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return startOfDay(date);
      });

      let query = supabase
        .from("sales")
        .select("total, created_at")
        .eq("company_id", companyId)
        .gte("created_at", last7Days[0].toISOString());

      if (filters?.dimension && filters?.dimensionValue) {
        query = query.eq(filters.dimension, filters.dimensionValue);
      }

      const { data, error } = await query;

      if (error) throw error;

      return last7Days.map((date) => {
        const dayTotal =
          (data as any[])
            ?.filter((sale) => {
              const saleDate = startOfDay(new Date(sale.created_at));
              return saleDate.getTime() === date.getTime();
            })
            .reduce((acc, sale) => acc + Number(sale.total), 0) || 0;

        return {
          date: format(date, "dd/MM", { locale: es }),
          ventas: dayTotal,
        };
      });
    },
    enabled: enabled && !!companyId,
  });
}
