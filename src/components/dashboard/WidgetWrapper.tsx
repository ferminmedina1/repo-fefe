import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WidgetActionMenu } from "./WidgetActionMenu";

interface WidgetWrapperProps {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  accentColor: string;
  onEditMetric?: () => void;
  onConfigure?: () => void;
  onRemove?: () => void;
  isDragging?: boolean;
  children: ReactNode;
  className?: string;
}

export function WidgetWrapper({
  id,
  title,
  description,
  icon,
  accentColor,
  onEditMetric,
  onRemove,
  onConfigure,
  isDragging,
  children,
  className,
}: WidgetWrapperProps) {
  // Map color names to Tailwind classes
  const colorMap: Record<string, string> = {
    blue: "border-blue-500/30 bg-blue-500/5",
    green: "border-green-500/30 bg-green-500/5",
    orange: "border-orange-500/30 bg-orange-500/5",
    purple: "border-purple-500/30 bg-purple-500/5",
    red: "border-red-500/30 bg-red-500/5",
    cyan: "border-cyan-500/30 bg-cyan-500/5",
  };

  const accentGradientMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600",
    cyan: "from-cyan-500 to-cyan-600",
  };

  // Validate color with fallback (prevent invalid colors from breaking UI)
  const getColorClass = (color: string): string => {
    if (!color) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WidgetWrapper] Missing accentColor prop, using default');
      }
      return colorMap.blue;
    }
    if (colorMap[color]) {
      return colorMap[color];
    }
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WidgetWrapper] Unknown accentColor: ${color}, using default`);
    }
    return colorMap.blue;
  };

  const getGradientClass = (color: string): string => {
    if (!color || !accentGradientMap[color]) {
      return accentGradientMap.blue;
    }
    return accentGradientMap[color];
  };

  return (
    <Card
      className={cn(
        "shadow-sm border-l-2 overflow-hidden transition-all duration-200 relative group",
        getColorClass(accentColor),
        isDragging && "opacity-50 scale-95 ring-2 ring-primary/50 shadow-lg",
        className
      )}
    >
      {/* Drag hint - visible on hover */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-60 transition-opacity duration-150 pointer-events-none">
        <span className="text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded whitespace-nowrap">
          Arrastra para mover
        </span>
      </div>

      {/* Accent gradient bar */}
      <div
        className={cn(
          "h-0.5 bg-gradient-to-r",
          getGradientClass(accentColor)
        )}
      />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-2">
        <div className="flex items-center gap-1.5 flex-1">
          {icon && <div className="text-muted-foreground text-[16px]">{icon}</div>}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xs font-semibold truncate">{title}</CardTitle>
            {description && (
              <p className="text-[11px] text-muted-foreground mt-0">{description}</p>
            )}
          </div>
        </div>

        {/* Widget Action Menu - arriba a la derecha, discreto */}
        <WidgetActionMenu
          widgetId={id}
          widgetName={title}
          onEditMetric={onEditMetric || (() => {})}
          onConfigure={onConfigure || (() => {})}
          onRemove={onRemove || (() => {})}
        />
      </CardHeader>

      <CardContent className="space-y-1 px-3 pb-2 pt-0">{children}</CardContent>
    </Card>
  );
}
