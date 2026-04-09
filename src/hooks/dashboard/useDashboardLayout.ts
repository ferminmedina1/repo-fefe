import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";

export interface DashboardWidget {
  id: string;
  type: string;
  size?: "full" | "half" | "quarter";
  order: number;
}

export interface DashboardLayoutData {
  id: string;
  user_id: string;
  company_id: string;
  widgets: DashboardWidget[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useDashboardLayout(companyId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>([]);
  const autoSaveTimeout = useAutoSaveTimeout();

  // Fetch user's dashboard layout for this company
  const { data: layoutData, isLoading } = useQuery<DashboardLayoutData | null>({
    queryKey: ["dashboard-layout", userId, companyId],
    queryFn: async () => {
      if (!userId || !companyId) return null;

      const { data, error } = await supabase
        .from("dashboard_layouts")
        .select("*")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching dashboard layout:", error);
        return null;
      }

      return (data as DashboardLayoutData) || null;
    },
    enabled: !!userId && !!companyId,
  });

  // Sync layout data to local state
  useEffect(() => {
    if (layoutData?.widgets) {
      setLocalWidgets(layoutData.widgets);
    }
  }, [layoutData?.widgets]);

  // Mutation: Save layout to Supabase
  const saveLayoutMutation = useMutation({
    mutationFn: async (widgets: DashboardWidget[]) => {
      if (!userId || !companyId) throw new Error("User ID and Company ID are required");

      if (layoutData?.id) {
        // Update existing layout
        const { error } = await supabase
          .from("dashboard_layouts")
          .update({ widgets })
          .eq("id", layoutData.id);

        if (error) throw error;
        return { id: layoutData.id, widgets };
      } else {
        // Create new layout
        const { data, error } = await supabase
          .from("dashboard_layouts")
          .insert({
            user_id: userId,
            company_id: companyId,
            widgets,
            is_default: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard-layout", userId, companyId],
      });
    },
  });

  // Auto-save with debounce
  useEffect(() => {
    if (!layoutData?.id && localWidgets.length === 0) return; // Skip if no layout and no widgets

    autoSaveTimeout.debounce(() => {
      saveLayoutMutation.mutate(localWidgets);
    }, 1000);

    return () => autoSaveTimeout.clear();
  }, [localWidgets, layoutData?.id]);

  // Add widget
  const addWidget = (widget: Omit<DashboardWidget, "order">) => {
    setLocalWidgets((prev) => [
      ...prev,
      {
        ...widget,
        order: prev.length,
      },
    ]);
  };

  // Remove widget
  const removeWidget = (widgetId: string) => {
    setLocalWidgets((prev) =>
      prev
        .filter((w) => w.id !== widgetId)
        .map((w, idx) => ({ ...w, order: idx })) // Re-order
    );
  };

  // Reorder widgets (for drag & drop)
  const reorderWidgets = (startIndex: number, endIndex: number) => {
    setLocalWidgets((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result.map((w, idx) => ({ ...w, order: idx }));
    });
  };

  // Reset layout to empty
  const resetLayout = async () => {
    setLocalWidgets([]);
    if (layoutData?.id) {
      await saveLayoutMutation.mutateAsync([]);
    }
  };

  // Manually save (for urgent saves)
  const save = async () => {
    await saveLayoutMutation.mutateAsync(localWidgets);
  };

  return {
    widgets: localWidgets,
    isLoading: isLoading,
    isSaving: saveLayoutMutation.isPending,
    hasLayout: !!layoutData,
    addWidget,
    removeWidget,
    reorderWidgets,
    resetLayout,
    save,
    layoutId: layoutData?.id,
  };
}

// Helper hook for debounce
function useAutoSaveTimeout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return {
    debounce: (callback: () => void, delay: number) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(callback, delay);
    },
    clear: () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
  };
}
