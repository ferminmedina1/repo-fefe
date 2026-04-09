import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export const useInvalidateDashboardQueries = () => {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    // Invalidate all dashboard-related queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard-monthly-comparison"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-top-products"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-top-customers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-receivables"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-critical-stock"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-exchange-rates"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-historical-rates"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-seven-days-sales"] }),
    ]);
  }, [queryClient]);
};
