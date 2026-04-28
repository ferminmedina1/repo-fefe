import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";

/**
 * ✅ SINGLE SOURCE OF TRUTH: Dashboard Selection
 * 
 * PROBLEM: selectedDashboardId exists in 3 places:
 * 1. State (useState)
 * 2. URL params (searchParams)
 * 3. localStorage (potential)
 * 
 * Causes bugs:
 * - State goes out of sync with URL
 * - Page refresh loses selection
 * - Back button doesn't work
 * - URL doesn't reflect current state
 * 
 * SOLUTION: Single hook that manages everything
 * - URL is the source of truth (survives refresh)
 * - State is derived from URL (always in sync)
 * - No separate useState needed
 */

interface UseDashboardSelectionResult {
  // Current selected dashboard ID
  selectedDashboardId: string | undefined;
  
  // Change selection and update URL
  setSelectedDashboardId: (dashboardId: string | undefined) => void;
  
  // Check if dashboard is selected
  isDashboardSelected: (dashboardId: string) => boolean;
}

/**
 * Hook for managing dashboard selection with URL as source of truth
 * @returns Selected dashboard ID and setters
 */
export function useDashboardSelection(): UseDashboardSelectionResult {
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ Get current selection from URL (source of truth)
  const selectedDashboardId = useMemo(
    () => searchParams.get("dashboard") || undefined,
    [searchParams]
  );

  // ✅ Update selection and URL
  const setSelectedDashboardId = useCallback(
    (dashboardId: string | undefined) => {
      const newParams = new URLSearchParams(searchParams);
      
      if (dashboardId) {
        newParams.set("dashboard", dashboardId);
      } else {
        newParams.delete("dashboard");
      }
      
      setSearchParams(newParams, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  // ✅ Helper: Check if a dashboard is selected
  const isDashboardSelected = useCallback(
    (dashboardId: string) => selectedDashboardId === dashboardId,
    [selectedDashboardId]
  );

  return {
    selectedDashboardId,
    setSelectedDashboardId,
    isDashboardSelected,
  };
}
