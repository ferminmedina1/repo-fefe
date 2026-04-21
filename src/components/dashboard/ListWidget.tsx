import { WidgetWrapper } from "./WidgetWrapper";
import { useWidgetContext } from "@/contexts/WidgetContext";
import { WidgetDefinition } from "@/lib/dashboard/widgets";
import { CheckCircle2 } from "lucide-react";

interface ListItem {
  name: string;
  stock: number;
  min_stock?: number;
}

interface ListWidgetProps {
  definition: WidgetDefinition;
  // ✅ Removed: data, isLoading, onRemove, isDragging (now come from context)
}

export function ListWidget({
  definition,
}: ListWidgetProps) {
  // ✅ NEW: Get data from context instead of props
  const context = useWidgetContext();
  const widgetData = context.dataMap[definition.id];
  const data = widgetData?.data;
  const isLoading = widgetData?.isLoading ?? false;
  const onRemove = () => context.onWidgetRemove(definition.id);
  const isDragging = context.isDragging;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <p className="text-sm text-muted-foreground text-center">
            {definition.id === "list-critical-stock"
              ? "Sin productos con stock crítico"
              : "Sin elementos"}
          </p>
        </div>
      );
    }

    // Standard rendering for all lists
    // Note: Virtual scrolling optimization disabled due to react-window build issues
    // Can be re-enabled in future when react-window export issue is resolved
    return (
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
          >
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">{item.name}</p>
              {item.min_stock && (
                <p className="text-xs text-muted-foreground">
                  Stock mínimo: {item.min_stock}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-warning">{item.stock}</p>
              <p className="text-xs text-muted-foreground">
                {definition.id === "list-critical-stock" ? "unidades" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <WidgetWrapper
      title={definition.name}
      description={definition.description}
      icon={<definition.icon className="h-5 w-5" />}
      accentColor={definition.color}
      isDragging={isDragging}
    >
      {renderContent()}
    </WidgetWrapper>
  );
}
