import { Button } from "@/components/ui/button";
import { RotateCw, Zap } from "lucide-react";
import { useState } from "react";
import { useInvalidateDashboardQueries } from "@/hooks/dashboard/useInvalidateDashboard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
        title: "✨ Dashboard actualizado",
        description: "Todos los datos se han sincronizado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error en la actualización",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing || disabled}
      className={cn(
        "relative h-9 gap-2 px-4 overflow-hidden font-medium text-sm",
        // Base gradient
        "bg-gradient-to-r from-cyan-500/20 to-blue-500/20",
        "hover:from-cyan-500/30 hover:to-blue-500/30",
        // Border gradient effect
        "border border-cyan-500/40 hover:border-cyan-500/70",
        // Shadow and glow
        "shadow-[0_0_20px_rgba(34,211,238,0.3)]",
        "hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]",
        // Text color
        "text-cyan-300 hover:text-cyan-200",
        // Smooth transitions
        "transition-all duration-300 ease-out",
        // Disabled state
        disabled && "opacity-50 cursor-not-allowed",
        // Active state
        isRefreshing && "shadow-[0_0_40px_rgba(34,211,238,0.7)]"
      )}
      title="Actualizar todos los widgets"
    >
      {/* Background shimmer effect */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-white/5 to-blue-400/0 animate-shimmer" />
      </div>

      {/* Content */}
      <div className="relative flex items-center gap-2 z-10">
        <Zap className={cn(
          "w-4 h-4 transition-all duration-500",
          isRefreshing && "animate-pulse text-yellow-300"
        )} />
        {isRefreshing ? (
          <>
            <RotateCw className="w-4 h-4 animate-spin" />
            <span>Actualizando...</span>
          </>
        ) : (
          <span>Actualizar</span>
        )}
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-full blur-xl bg-cyan-500/20 rounded-full" />
      </div>
    </Button>
  );
}
