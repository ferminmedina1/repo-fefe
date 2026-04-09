import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WidgetWrapperProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  accentColor: string;
  onRemove?: () => void;
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
        "shadow-soft border-l-4 overflow-hidden transition-all",
        colorMap[accentColor] || colorMap.blue,
        isDragging && "opacity-50 scale-95",
        className
      )}
    >
      {/* Accent gradient bar */}
      <div
        className={cn(
          "h-1 bg-gradient-to-r",
          accentGradientMap[accentColor] || accentGradientMap.blue
        )}
      />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 flex-1">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}
