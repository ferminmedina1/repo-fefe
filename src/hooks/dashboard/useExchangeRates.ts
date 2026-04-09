import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExchangeRate {
  id: string;
  currency: string;
  rate: number;
  updated_at: string;
}

export interface HistoricalRate {
  date: string;
  [key: string]: any;
}

export function useExchangeRates(companyId: string | undefined, enabled = true) {
  return useQuery<ExchangeRate[]>({
    queryKey: ["dashboard-exchange-rates", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("company_id", companyId)
        .order("currency", { ascending: true });

      if (error) throw error;
      return (data as ExchangeRate[]) || [];
    },
    enabled: enabled && !!companyId,
  });
}

export function useHistoricalRates(companyId: string | undefined, enabled = true) {
  return useQuery<HistoricalRate[]>({
    queryKey: ["dashboard-historical-rates", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const { subDays } = await import("date-fns");
      const { format } = await import("date-fns");

      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("company_id", companyId)
        .gte("updated_at", thirtyDaysAgo.toISOString())
        .in("currency", ["USD", "EUR"])
        .order("updated_at", { ascending: true });

      if (error) throw error;

      const grouped: any = {};
      (data as ExchangeRate[])?.forEach((rate) => {
        const dateKey = format(new Date(rate.updated_at), "dd/MM");
        if (!grouped[dateKey]) {
          grouped[dateKey] = { date: dateKey };
        }
        grouped[dateKey][rate.currency] = rate.rate;
      });

      return Object.values(grouped);
    },
    enabled: enabled && !!companyId,
  });
}
