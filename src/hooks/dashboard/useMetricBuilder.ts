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

      try {
        const { data, error } = await supabase
          .from("custom_metrics")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        if (error) {
          // Handle table not existing gracefully
          if (
            error.code === '42P01' ||
            error.code === '42501' ||
            error.message?.includes('does not exist') ||
            error.message?.includes('permission')
          ) {
            console.warn("Custom metrics table not available yet");
            return [];
          }
          throw error;
        }
        return (data as CustomMetric[]) || [];
      } catch (err) {
        console.error("Error fetching metrics:", err);
        return [];
      }
    },
    enabled: enabled && !!companyId,
  });
};

export const useCreateMetric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metric: Omit<CustomMetric, "id" | "created_at" | "updated_at">) => {
      try {
        const { data, error } = await supabase
          .from("custom_metrics")
          .insert([metric])
          .select()
          .single();

        if (error) {
          if (
            error.code === '42P01' ||
            error.message?.includes('does not exist')
          ) {
            console.warn("Custom metrics table not available yet");
            throw new Error('Custom metrics feature not yet initialized. Tables will be created on next migration.');
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.error("Error creating metric:", err);
        throw err;
      }
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
      try {
        const { id, ...updates } = metric;
        const { data, error } = await supabase
          .from("custom_metrics")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          if (
            error.code === '42P01' ||
            error.message?.includes('does not exist')
          ) {
            console.warn("Custom metrics table not available");
            throw new Error('Custom metrics table not initialized.');
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.error("Error updating metric:", err);
        throw err;
      }
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
      try {
        const { error } = await supabase
          .from("custom_metrics")
          .delete()
          .eq("id", id);

        if (error) {
          if (
            error.code === '42P01' ||
            error.message?.includes('does not exist')
          ) {
            console.warn("Custom metrics table not available");
            return; // Silently continue
          }
          throw error;
        }
      } catch (err) {
        console.error("Error deleting metric:", err);
        throw err;
      }
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
      try {
        const { data, error } = await supabase
          .from("metric_values")
          .insert([{ ...value, timestamp: new Date().toISOString() }])
          .select()
          .single();

        if (error) {
          // Gracefully handle table not existing
          if (
            error.code === '42P01' ||
            error.message?.includes('does not exist')
          ) {
            console.warn("Metric values table not available yet");
            return null;
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.error("Error saving metric value:", err);
        throw err;
      }
    },
  });
};

export const useMetricHistory = (metricId: string | undefined) => {
  return useQuery<MetricValue[]>({
    queryKey: ["metric-history", metricId],
    queryFn: async () => {
      if (!metricId) throw new Error("Metric ID is required");

      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from("metric_values")
          .select("*")
          .eq("metric_id", metricId)
          .gte("timestamp", thirtyDaysAgo.toISOString())
          .order("timestamp", { ascending: true });

        if (error) {
          // Handle table not existing
          if (
            error.code === '42P01' ||
            error.code === '42501' ||
            error.message?.includes('does not exist') ||
            error.message?.includes('permission')
          ) {
            console.warn("Metric history table not available yet");
            return [];
          }
          throw error;
        }
        return (data as MetricValue[]) || [];
      } catch (err) {
        console.error("Error fetching metric history:", err);
        return [];
      }
    },
    enabled: !!metricId,
  });
};
