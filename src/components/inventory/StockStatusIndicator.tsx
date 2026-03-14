import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockStatusIndicatorProps {
  stock: number;
  minStock: number;
  maxStock?: number;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StockStatusIndicator({
  stock,
  minStock,
  maxStock,
  showIcon = true,
  size = "md",
  className,
}: StockStatusIndicatorProps) {
  // Determinar estado
  const isCritical = minStock > 0 && stock <= minStock;
  const isLow = minStock > 0 && stock <= minStock * 1.5;
  const isOptimal = minStock === 0 || (stock > minStock * 1.5);
  const isOverstock = maxStock && stock > maxStock;

  // Determinar variante y mensaje
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let statusText = "Óptimo";
  let Icon = CheckCircle2;

  if (isOverstock) {
    variant = "secondary";
    statusText = "Exceso";
    Icon = TrendingUp;
  } else if (isCritical) {
    variant = "destructive";
    statusText = "Crítico";
    Icon = AlertTriangle;
  } else if (isLow) {
    variant = "secondary";
    statusText = "Bajo";
    Icon = AlertCircle;
  }

  // Tamaños
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Badge
      variant={variant}
      className={cn(sizeClasses[size], "flex items-center gap-2 w-fit", className)}
    >
      {showIcon && <Icon className={iconSize[size]} />}
      <span>{statusText}</span>
      {size !== "sm" && <span className="ml-1 opacity-75">({stock}/{minStock})</span>}
    </Badge>
  );
}
