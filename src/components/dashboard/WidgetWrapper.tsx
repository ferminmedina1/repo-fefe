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
  // Map color names to Tailwind classes - improved with gradient effects
  const colorMap: Record<string, { border: string; bg: string; glow: string }> = {
    blue: {
      border: "border-blue-500/40 hover:border-blue-500/70",
      bg: "bg-gradient-to-br from-blue-500/8 to-cyan-500/8 hover:from-blue-500/12 hover:to-cyan-500/12",
      glow: "shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]"
    },
    green: {
      border: "border-green-500/40 hover:border-green-500/70",
      bg: "bg-gradient-to-br from-green-500/8 to-emerald-500/8 hover:from-green-500/12 hover:to-emerald-500/12",
      glow: "shadow-[0_0_30px_rgba(34,197,94,0.2)] hover:shadow-[0_0_40px_rgba(34,197,94,0.3)]"
    },
    orange: {
      border: "border-orange-500/40 hover:border-orange-500/70",
      bg: "bg-gradient-to-br from-orange-500/8 to-amber-500/8 hover:from-orange-500/12 hover:to-amber-500/12",
      glow: "shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:shadow-[0_0_40px_rgba(249,115,22,0.3)]"
    },
    purple: {
      border: "border-purple-500/40 hover:border-purple-500/70",
      bg: "bg-gradient-to-br from-purple-500/8 to-pink-500/8 hover:from-purple-500/12 hover:to-pink-500/12",
      glow: "shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]"
    },
    red: {
      border: "border-red-500/40 hover:border-red-500/70",
      bg: "bg-gradient-to-br from-red-500/8 to-rose-500/8 hover:from-red-500/12 hover:to-rose-500/12",
      glow: "shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:shadow-[0_0_40px_rgba(239,68,68,0.3)]"
    },
    cyan: {
      border: "border-cyan-500/40 hover:border-cyan-500/70",
      bg: "bg-gradient-to-br from-cyan-500/8 to-blue-500/8 hover:from-cyan-500/12 hover:to-blue-500/12",
      glow: "shadow-[0_0_30px_rgba(34,211,238,0.2)] hover:shadow-[0_0_40px_rgba(34,211,238,0.3)]"
    },
  };

  const accentGradientMap: Record<string, string> = {
    blue: "from-blue-500 to-cyan-600",
    green: "from-green-500 to-emerald-600",
    orange: "from-orange-500 to-amber-600",
    purple: "from-purple-500 to-pink-600",
    red: "from-red-500 to-rose-600",
    cyan: "from-cyan-500 to-blue-600",
  };

  // Validate color with fallback
  const getColorClasses = (color: string): { border: string; bg: string; glow: string } => {
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

  const colorClasses = getColorClasses(accentColor);

  return (
    <Card
      className={cn(
        // Base structure
        "overflow-hidden transition-all duration-300 relative group",
        // Border and background with gradients
        "border",
        colorClasses.border,
        colorClasses.bg,
        // Glow effect
        colorClasses.glow,
        // Drag state
        isDragging && "opacity-50 scale-95 ring-2 ring-primary/50 shadow-xl",
        className
      )}
    >
      {/* Background shimmer on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 rounded-lg" />
      </div>

      {/* Top accent gradient bar - animated */}
      <div
        className={cn(
          "h-1 bg-gradient-to-r transition-all duration-300 group-hover:h-1.5",
          getGradientClass(accentColor)
        )}
      />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
        <div className="flex items-center gap-2.5 flex-1">
          {/* Icon with animated glow */}
          {icon && (
            <div className={cn(
              "p-1.5 rounded-lg transition-all duration-300",
              "bg-gradient-to-br from-current/10 to-current/5",
              "group-hover:from-current/20 group-hover:to-current/10",
              "text-muted-foreground group-hover:text-foreground",
              "text-[16px]"
            )}>
              {icon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-bold truncate text-foreground">{title}</CardTitle>
            {description && (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {/* Widget Action Menu - right side, with better spacing */}
        <div className="ml-2 flex-shrink-0">
          <WidgetActionMenu
            widgetId={id}
            widgetName={title}
            onEditMetric={onEditMetric || (() => {})}
            onConfigure={onConfigure || (() => {})}
            onRemove={onRemove || (() => {})}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-3 pt-1">{children}</CardContent>
    </Card>
  );
}
