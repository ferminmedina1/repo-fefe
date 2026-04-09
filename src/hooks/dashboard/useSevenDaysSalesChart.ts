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
      try {
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

        if (error) {
          if (
            error.code === '42P01' ||
            error.code === '42501' ||
            error.message?.includes('does not exist') ||
            error.message?.includes('permission')
          ) {
            console.warn("Sales table not available yet, using fallback data");
            return last7Days.map((date) => ({
              date: format(date, "dd/MM", { locale: es }),
              ventas: 0,
            }));
          }
          throw error;
        }

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
      } catch (error) {
        console.error("Error fetching seven days sales:", error);
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i);
          return startOfDay(date);
        });
        if (
          error instanceof Object &&
          (
            ((error as any)?.code === '42P01') ||
            ((error as any)?.code === '42501') ||
            ((error as any)?.message?.includes('does not exist')) ||
            ((error as any)?.message?.includes('permission'))
          )
        ) {
          return last7Days.map((date) => ({
            date: format(date, "dd/MM", { locale: es }),
            ventas: 0,
          }));
        }
        throw error;
      }
    },
    enabled: enabled && !!companyId,
  });
}
