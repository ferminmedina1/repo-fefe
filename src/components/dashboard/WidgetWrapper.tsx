import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Settings, GripVertical } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WidgetWrapperProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  accentColor: string;
  onRemove?: () => void;
  onConfigure?: () => void;
  isDragging?: boolean;
  children: ReactNode;
  className?: string;
}

export function WidgetWrapper({
  title,
  description,
  icon,
  accentColor,
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

  return (
    <Card
      className={cn(
        "shadow-sm border-l-2 overflow-hidden transition-all duration-200 relative group",
        colorMap[accentColor] || colorMap.blue,
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
          accentGradientMap[accentColor] || accentGradientMap.blue
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

        <div className="flex gap-0.5">
          {onConfigure && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onConfigure}
              className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
              title="Configurar widget"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
              title="Eliminar widget"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-1 px-3 pb-2 pt-0">{children}</CardContent>
    </Card>
  );
}
