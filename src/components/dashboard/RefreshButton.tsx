import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { useState } from "react";

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
}

export function RefreshButton({ onRefresh, isLoading = false }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing || isLoading}
      className="gap-2"
    >
      <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );
}
