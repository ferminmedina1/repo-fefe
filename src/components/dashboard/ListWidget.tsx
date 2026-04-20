import { WidgetWrapper } from "./WidgetWrapper";
import { useWidgetContext } from "@/contexts/WidgetContext";
import { WidgetDefinition } from "@/lib/dashboard/widgets";
import { CheckCircle2 } from "lucide-react";
import { VirtualizedList } from "./VirtualizedList";

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

    // ✅ NEW: Use VirtualizedList for large datasets (>50 items)
    const USE_VIRTUALIZATION_THRESHOLD = 50;
    const isLargeList = data.length > USE_VIRTUALIZATION_THRESHOLD;

    if (isLargeList) {
      return (
        <VirtualizedList
          items={data}
          itemHeight={56}
          listHeight={400}
          renderItem={(item) => (
            <div className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
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
          )}
          className="space-y-3"
        />
      );
    }

    // Standard rendering for small lists
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
      onRemove={onRemove}
      isDragging={isDragging}
    >
      {renderContent()}
    </WidgetWrapper>
  );
}
