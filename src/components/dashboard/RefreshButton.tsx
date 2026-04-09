import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { useState } from "react";
import { useInvalidateDashboardQueries } from "@/hooks/dashboard/useInvalidateDashboard";
import { useToast } from "@/hooks/use-toast";

interface RefreshButtonProps {
  disabled?: boolean;
}

export function RefreshButton({ disabled = false }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const invalidateQueries = useInvalidateDashboardQueries();
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await invalidateQueries();
      toast({
        title: "✓ Dashboard refreshed",
        description: "All widgets updated with latest data",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing || disabled}
      className="gap-2"
      title="Refresh all widgets"
    >
      <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );
}
