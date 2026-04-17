import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardFilters } from "@/contexts/DashboardFilterContext";

export interface ReceivablesData {
  overdue: number;
  total: number;
  overduePercentage: number;
  overdueCount: number;
}

export function useReceivables(
  companyId: string | undefined,
  enabled = true,
  filters?: DashboardFilters
) {
  return useQuery<ReceivablesData>({
    queryKey: ["dashboard-receivables", companyId, filters?.dimension, filters?.dimensionValue],
    queryFn: async () => {
      try {
        if (!companyId) throw new Error("Company ID is required");

        let query = supabase
          .from("customer_account_movements")
          .select("debit_amount, status, due_date")
          .eq("company_id", companyId)
          .eq("movement_type", "sale")
          .in("status", ["pending", "partial"]);

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
            console.warn("Customer account movements table not available yet, using fallback data");
            return {
              overdue: 0,
              total: 0,
              overduePercentage: 0,
              overdueCount: 0,
            };
          }
          // For unexpected errors, return fallback instead of throwing
          console.error("Unexpected error in useReceivables:", error);
          return {
            overdue: 0,
            total: 0,
            overduePercentage: 0,
            overdueCount: 0,
          };
        }

      const today = new Date();
      let overdue = 0;
      let total = 0;

      (data as any[])?.forEach((movement) => {
        const amount = Number(movement.debit_amount);
        total += amount;

        if (movement.due_date && new Date(movement.due_date) < today) {
          overdue += amount;
        }
      });

        const overduePercentage = total > 0 ? (overdue / total) * 100 : 0;

        return {
          overdue,
          total,
          overduePercentage,
          overdueCount: (data as any[])?.filter(
            (m) => m.due_date && new Date(m.due_date) < new Date()
          ).length || 0,
        };
      } catch (error) {
        console.error("Error fetching receivables:", error);
        if (
          error instanceof Object &&
          (
            ((error as any)?.code === '42P01') ||
            ((error as any)?.code === '42501') ||
            ((error as any)?.message?.includes('does not exist')) ||
            ((error as any)?.message?.includes('permission'))
          )
        ) {
          return {
            overdue: 0,
            total: 0,
            overduePercentage: 0,
            overdueCount: 0,
          };
        }
        throw error;
      }
    },
    enabled: enabled && !!companyId,
  });
}
