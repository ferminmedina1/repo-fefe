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
  // Map color names to Tailwind classes - compact minimal design
  const colorMap: Record<string, { accent: string }> = {
    blue: { accent: "from-blue-500 to-cyan-500" },
    green: { accent: "from-green-500 to-emerald-500" },
    orange: { accent: "from-orange-500 to-amber-500" },
    purple: { accent: "from-purple-500 to-pink-500" },
    red: { accent: "from-red-500 to-rose-500" },
    cyan: { accent: "from-cyan-500 to-blue-500" },
  };

  const accentGradientMap: Record<string, string> = {
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    orange: "from-orange-500 to-amber-500",
    purple: "from-purple-500 to-pink-500",
    red: "from-red-500 to-rose-500",
    cyan: "from-cyan-500 to-blue-500",
  };

  // Validate color with fallback
  const getAccentGradient = (color: string): string => {
    if (!color || !accentGradientMap[color]) {
      return accentGradientMap.blue;
    }
    return accentGradientMap[color];
  };

  return (
    <Card
      className={cn(
        // Base structure - compact
        "overflow-hidden transition-all duration-200 relative",
        // Minimal border - only subtle outline
        "border border-border/50 hover:border-border/80",
        // No background gradient - clean
        "bg-background",
        // Drag state
        isDragging && "opacity-50 scale-95",
        className
      )}
    >
      {/* Top accent bar - color only here */}
      <div
        className={cn(
          "h-0.5 bg-gradient-to-r transition-all duration-200",
          getAccentGradient(accentColor)
        )}
      />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Icon only - minimal */}
          {icon && (
            <div className="flex-shrink-0 text-muted-foreground text-[16px]">
              {icon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold truncate text-foreground">{title}</CardTitle>
            {description && (
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {/* Widget Action Menu - compact */}
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

      <CardContent className="space-y-2 px-3 pb-2.5 pt-1">{children}</CardContent>
    </Card>
  );
}
