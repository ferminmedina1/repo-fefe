import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomMetric {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  formula: string;
  data_source: "monthly-comparison" | "top-products" | "top-customers" | "receivables" | "critical-stock" | "seven-days-sales" | "exchange-rates";
  operation: "sum" | "avg" | "max" | "min" | "count" | "custom";
  field?: string;
  created_at: string;
  updated_at: string;
}

export interface MetricValue {
  metric_id: string;
  date: string;
  value: number;
  timestamp: string;
}

export const useMetrics = (companyId: string | undefined, enabled = true) => {
  return useQuery<CustomMetric[]>({
    queryKey: ["dashboard-custom-metrics", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("custom_metrics")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as CustomMetric[]) || [];
    },
    enabled: enabled && !!companyId,
  });
};

export const useCreateMetric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metric: Omit<CustomMetric, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("custom_metrics")
        .insert([metric])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard-custom-metrics", data.company_id],
      });
    },
  });
};

export const useUpdateMetric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      metric: Omit<CustomMetric, "created_at" | "updated_at">
    ) => {
      const { id, ...updates } = metric;
      const { data, error } = await supabase
        .from("custom_metrics")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard-custom-metrics", data.company_id],
      });
    },
  });
};

export const useDeleteMetric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase
        .from("custom_metrics")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard-custom-metrics", variables.companyId],
      });
    },
  });
};

export const useSaveMetricValue = () => {
  return useMutation({
    mutationFn: async (value: Omit<MetricValue, "timestamp">) => {
      const { data, error } = await supabase
        .from("metric_values")
        .insert([{ ...value, timestamp: new Date().toISOString() }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
};

export const useMetricHistory = (metricId: string | undefined) => {
  return useQuery<MetricValue[]>({
    queryKey: ["metric-history", metricId],
    queryFn: async () => {
      if (!metricId) throw new Error("Metric ID is required");

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("metric_values")
        .select("*")
        .eq("metric_id", metricId)
        .gte("timestamp", thirtyDaysAgo.toISOString())
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return (data as MetricValue[]) || [];
    },
    enabled: !!metricId,
  });
};
