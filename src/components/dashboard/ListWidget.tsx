import { WidgetWrapper } from "./WidgetWrapper";
import { WidgetConfigModal, WidgetConfig } from "./WidgetConfigModal";
import { useWidgetState, WidgetLoadingSkeleton, WidgetEmptyState, WidgetErrorState } from "@/hooks/useWidgetState";
import { WidgetDefinition } from "@/lib/dashboard/widgets";
import { VirtualList } from "./VirtualList";
import { CheckCircle2 } from "lucide-react";

interface ListItem {
  name: string;
  stock: number;
  min_stock?: number;
}

interface ListWidgetProps {
  id: string;
  definition: WidgetDefinition;
  metricConfig?: {
    metricId?: string;
    customFormula?: string;
    customFormat?: 'currency' | 'number' | 'percentage' | 'decimal';
    customUnit?: string;
  };
  widgetConfig?: {
    refreshInterval?: number;
    showTitle?: boolean;
    showDescription?: boolean;
    maxItems?: number;
    enableCache?: boolean;
    [key: string]: any;
  };
  onUpdateMetricConfig?: (config: {
    metricId?: string;
    customFormula?: string;
    customFormat?: 'currency' | 'number' | 'percentage' | 'decimal';
    customUnit?: string;
  }) => void;
  onUpdateWidgetConfig?: (config: {
    refreshInterval?: number;
    showTitle?: boolean;
    showDescription?: boolean;
    maxItems?: number;
    enableCache?: boolean;
    [key: string]: any;
  }) => void;
  // ✅ Removed: data, isLoading, onRemove, isDragging (now come from context)
}

export function ListWidget({
  id,
  definition,
  metricConfig,
  widgetConfig,
  onUpdateMetricConfig,
  onUpdateWidgetConfig,
}: ListWidgetProps) {
  // ✅ CONSOLIDATED: Single hook replaces loading, error, and drag state
  const {
    showConfig,
    setShowConfig,
    data,
    isLoading,
    error,
    onRemove,
    isDragging,
  } = useWidgetState(definition, id);

  const renderContent = () => {
    // ✅ CONSOLIDATED: Use centralized loading state
    if (isLoading) {
      return <WidgetLoadingSkeleton height="h-32" />;
    }

    // ✅ CONSOLIDATED: Use centralized empty state (custom message)
    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-4 gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <p className="text-xs text-muted-foreground text-center">
            {definition.id === "list-critical-stock"
              ? "Sin productos con stock crítico"
              : "Sin elementos"}
          </p>
        </div>
      );
    }

    // ✅ CONSOLIDATED: Use centralized error state
    if (error) {
      return <WidgetErrorState error={error} />;
    }

    // ✅ PERFORMANCE: Use virtualization for large lists (100+ items)
    const VIRTUALIZATION_THRESHOLD = 100;
    const shouldUseVirtualization = data.length > VIRTUALIZATION_THRESHOLD;

    if (shouldUseVirtualization) {
      // Virtual scrolling for large datasets
      return (
        <VirtualList
          items={data}
          itemHeight={44} // 32px content + 12px margin
          containerHeight={240} // Default widget height
          gap={6}
          renderItem={(item: ListItem) => (
            <div className="flex items-center justify-between p-2 rounded-lg bg-warning/5 border border-warning/20">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs text-foreground truncate">{item.name}</p>
                {item.min_stock && (
                  <p className="text-[10px] text-muted-foreground">
                    Min: {item.min_stock}
                  </p>
                )}
              </div>
              <div className="text-right ml-2">
                <p className="text-base font-bold text-warning">{item.stock}</p>
                <p className="text-[9px] text-muted-foreground">
                  {definition.id === "list-critical-stock" ? "un." : ""}
                </p>
              </div>
            </div>
          )}
        />
      );
    }

    // Standard rendering for small lists
    return (
      <div className="space-y-1.5">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 rounded-lg bg-warning/5 border border-warning/20"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs text-foreground truncate">{item.name}</p>
              {item.min_stock && (
                <p className="text-[10px] text-muted-foreground">
                  Min: {item.min_stock}
                </p>
              )}
            </div>
            <div className="text-right ml-2">
              <p className="text-base font-bold text-warning">{item.stock}</p>
              <p className="text-[9px] text-muted-foreground">
                {definition.id === "list-critical-stock" ? "un." : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <WidgetConfigModal
        isOpen={showConfig}
        widgetName={definition.name}
        widgetId={id}
        config={widgetConfig}
        onClose={() => setShowConfig(false)}
        onSave={(config) => {
          if (onUpdateWidgetConfig) {
            onUpdateWidgetConfig(config);
          }
          setShowConfig(false);
        }}
      />
      <WidgetWrapper
        id={id}
        title={definition.name}
        description={definition.description}
        icon={<definition.icon className="h-5 w-5" />}
        accentColor={definition.color}
        onConfigure={() => setShowConfig(true)}
        onRemove={onRemove}
        isDragging={isDragging}
      >
        {renderContent()}
      </WidgetWrapper>
    </>
  );
}
