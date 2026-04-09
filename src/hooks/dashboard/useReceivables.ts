import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReceivablesData {
  overdue: number;
  total: number;
  overduePercentage: number;
  overdueCount: number;
}

export function useReceivables(companyId: string | undefined, enabled = true) {
  return useQuery<ReceivablesData>({
    queryKey: ["dashboard-receivables", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("customer_account_movements")
        .select("debit_amount, status, due_date")
        .eq("company_id", companyId)
        .eq("movement_type", "sale")
        .in("status", ["pending", "partial"]);

      if (error) throw error;

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
    },
    enabled: enabled && !!companyId,
  });
}
