import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import { migrateWidgetId } from "@/lib/dashboard/widgets";

// ✅ NEW: Normalize widget types from database (migrate old naming to new format)
const normalizeWidgetType = (type: string): string => {
  // Use the migration function from widgets.ts for consistency
  try {
    return migrateWidgetId(type);
  } catch {
    return type; // Fallback to original type if migration fails
  }
};

// ✅ NEW: Normalize all widgets in a layout
const normalizeLayoutWidgets = (widgets: DashboardWidget[]): DashboardWidget[] => {
  return widgets.map((w) => ({
    ...w,
    type: normalizeWidgetType(w.type),
  }));
};

export interface WidgetMetricConfig {
  metricId?: string;
  customFormula?: string;
  customFormat?: 'currency' | 'number' | 'percentage' | 'decimal';
  customUnit?: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardWidget {
  id: string;
  type: string;
  size?: "full" | "half" | "quarter";
  order: number;
  position?: WidgetPosition;
  metricConfig?: WidgetMetricConfig;
}

export interface DashboardLayoutData {
  id: string;
  user_id: string;
  company_id: string;
  name: string; // ✅ NEW: Nombre del dashboard
  widgets: DashboardWidget[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to manage a specific dashboard or the default one
 * @param companyId - Company ID
 * @param userId - User ID
 * @param dashboardId - Optional: Load a specific dashboard. If not provided, loads the default.
 */
export function useDashboardLayout(
  companyId: string | undefined,
  userId: string | undefined,
  dashboardId?: string
) {
  const queryClient = useQueryClient();
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>([]);
  const [dashboardName, setDashboardName] = useState("Mi Panel de Control");
  const [history, setHistory] = useState<DashboardWidget[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const autoSaveTimeout = useAutoSaveTimeout();

  // ✅ NEW: Fetch a specific dashboard or the default one
  const { data: layoutData, isLoading } = useQuery<DashboardLayoutData | null>({
    queryKey: ["dashboard-layout", userId, companyId, dashboardId],
    queryFn: async () => {
      if (!userId || !companyId) return null;

      try {
        let query = supabase
          .from("dashboard_layouts")
          .select("*")
          .eq("user_id", userId)
          .eq("company_id", companyId);

        // If dashboardId provided, load that specific one
        // Otherwise load the default one
        if (dashboardId) {
          query = query.eq("id", dashboardId);
        } else {
          query = query.eq("is_default", true);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          if (error.code !== "PGRST116" && error.code !== "42P01" && error.code !== "406") {
            console.error("Error fetching dashboard layout:", error);
          }
          return null;
        }

        return (data as DashboardLayoutData) || null;
      } catch (err) {
        console.error("Unexpected error fetching dashboard layout:", err);
        return null;
      }
    },
    enabled: !!userId && !!companyId,
    retry: false,
  });

  // Sync layout data to local state
  useEffect(() => {
    if (layoutData?.widgets) {
      // ✅ Normalize widget types from database
      const normalizedWidgets = normalizeLayoutWidgets(layoutData.widgets);
      setLocalWidgets(normalizedWidgets);
      setDashboardName(layoutData.name);
    }
  }, [layoutData?.widgets, layoutData?.name]);

  // Mutation: Save layout to Supabase
  const saveLayoutMutation = useMutation({
    mutationFn: async (widgets: DashboardWidget[]) => {
      if (!userId || !companyId) throw new Error("User ID and Company ID are required");

      // ✅ Normalize widget types before saving to database
      const normalizedWidgets = normalizeLayoutWidgets(widgets);

      if (layoutData?.id) {
        // Update existing layout
        const { error } = await supabase
          .from("dashboard_layouts")
          .update({ widgets: normalizedWidgets, updated_at: new Date().toISOString() })
          .eq("id", layoutData.id);

        if (error) throw error;
        return { id: layoutData.id, widgets: normalizedWidgets };
      } else {
        // Create new layout (only happens if no default exists)
        const { data, error } = await supabase
          .from("dashboard_layouts")
          .insert({
            user_id: userId,
            company_id: companyId,
            name: "Mi Panel de Control",
            widgets: normalizedWidgets,
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
        queryKey: ["dashboard-layout", userId, companyId, dashboardId],
      });
      // Also invalidate the list of dashboards
      queryClient.invalidateQueries({
        queryKey: ["dashboards-list", userId, companyId],
      });
    },
  });

  // Auto-save with debounce
  useEffect(() => {
    if (!layoutData?.id && localWidgets.length === 0) return;

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
        .map((w, idx) => ({ ...w, order: idx }))
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

  // ✅ NEW: Update widget position or other properties (with history)
  const updateWidget = (widgetId: string, updates: Partial<DashboardWidget>) => {
    setLocalWidgets((prev) => {
      // Save current state to history before making changes
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(prev);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // Now apply the update
      return prev.map((w) =>
        w.id === widgetId
          ? { ...w, ...updates }
          : w
      );
    });
  };

  // ✅ NEW: Undo function
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setLocalWidgets(history[newIndex]);
    }
  };

  // ✅ NEW: Redo function
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setLocalWidgets(history[newIndex]);
    }
  };

  // ✅ NEW: Check if undo/redo are available
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // ✅ NEW: Update metric config for a widget
  const updateWidgetMetricConfig = (widgetId: string, metricConfig: WidgetMetricConfig) => {
    setLocalWidgets((prev) =>
      prev.map((w) =>
        w.id === widgetId
          ? { ...w, metricConfig }
          : w
      )
    );
  };

  // Manually save
  const save = async () => {
    await saveLayoutMutation.mutateAsync(localWidgets);
  };

  return {
    widgets: localWidgets,
    dashboardName,
    dashboardId: layoutData?.id,
    isLoading: isLoading,
    isSaving: saveLayoutMutation.isPending,
    hasLayout: !!layoutData,
    addWidget,
    removeWidget,
    reorderWidgets,
    resetLayout,
    updateWidget,
    updateWidgetMetricConfig,
    save,
    layoutId: layoutData?.id,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

/**
 * ✅ NEW: Hook to fetch all dashboards for a user-company
 * Returns a list of dashboards to display in the selector
 */
export function useMultipleDashboards(
  companyId: string | undefined,
  userId: string | undefined
) {
  return useQuery<DashboardLayoutData[]>({
    queryKey: ["dashboards-list", userId, companyId],
    queryFn: async () => {
      if (!userId || !companyId) return [];

      try {
        const { data, error } = await supabase
          .from("dashboard_layouts")
          .select("id, name, is_default, created_at, updated_at")
          .eq("user_id", userId)
          .eq("company_id", companyId)
          .order("is_default", { ascending: false })
          .order("updated_at", { ascending: false });

        if (error) {
          if (error.code !== "PGRST116" && error.code !== "42P01" && error.code !== "406") {
            console.error("Error fetching dashboards list:", error);
          }
          return [];
        }

        return (data as DashboardLayoutData[]) || [];
      } catch (err) {
        console.error("Unexpected error fetching dashboards list:", err);
        return [];
      }
    },
    enabled: !!userId && !!companyId,
    retry: false,
  });
}

/**
 * ✅ NEW: Create a new dashboard for a user-company
 */
export function useCreateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      companyId,
      name,
    }: {
      userId: string;
      companyId: string;
      name: string;
    }) => {
      if (!userId || !companyId) throw new Error("User ID and Company ID are required");

      const { data, error } = await supabase
        .from("dashboard_layouts")
        .insert({
          user_id: userId,
          company_id: companyId,
          name,
          widgets: [],
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DashboardLayoutData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["dashboards-list", data.user_id, data.company_id],
      });
    },
  });
}

/**
 * ✅ NEW: Delete a dashboard
 */
export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboardId: string) => {
      const { error } = await supabase
        .from("dashboard_layouts")
        .delete()
        .eq("id", dashboardId);

      if (error) throw error;
      return dashboardId;
    },
    onSuccess: () => {
      // Invalidate all dashboard queries
      queryClient.invalidateQueries({
        queryKey: ["dashboard-layout"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboards-list"],
      });
    },
  });
}

/**
 * ✅ NEW: Set a dashboard as default
 */
export function useSetDefaultDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboardId: string) => {
      const { error } = await supabase
        .from("dashboard_layouts")
        .update({ is_default: true })
        .eq("id", dashboardId);

      if (error) throw error;
      return dashboardId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard-layout"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboards-list"],
      });
    },
  });
}

/**
 * ✅ NEW: Rename a dashboard
 */
export function useRenameDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dashboardId,
      newName,
    }: {
      dashboardId: string;
      newName: string;
    }) => {
      if (!newName.trim()) throw new Error("El nombre no puede estar vacío");
      if (newName.length > 255) throw new Error("El nombre es demasiado largo (máx 255 caracteres)");

      const { error } = await supabase
        .from("dashboard_layouts")
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq("id", dashboardId);

      if (error) throw error;
      return dashboardId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard-layout"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboards-list"],
      });
    },
  });
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
