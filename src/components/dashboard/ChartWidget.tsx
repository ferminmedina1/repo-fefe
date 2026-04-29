import { WidgetWrapper } from "./WidgetWrapper";
import { WidgetConfigModal, WidgetConfig } from "./WidgetConfigModal";
import { MetricEditorModal } from "./MetricEditorModal";
import { useWidgetState, WidgetLoadingSkeleton, WidgetEmptyState, WidgetErrorState } from "@/hooks/useWidgetState";
import { WidgetDefinition } from "@/lib/dashboard/widgets";
import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ChartData {
  producto?: string;
  cliente?: string;
  date?: string;
  rentabilidad?: number;
  total?: number;
  ventas?: number;
  unidades?: number;
  compras?: number;
}

interface ChartWidgetProps {
  id: string;
  definition: WidgetDefinition;
  metricConfig?: {
    metricId?: string;
    customFormula?: string;
    customFormat?: 'currency' | 'number' | 'percentage' | 'decimal';
    customUnit?: string;
  };
  onUpdateMetricConfig?: (config: {
    metricId?: string;
    customFormula?: string;
    customFormat?: 'currency' | 'number' | 'percentage' | 'decimal';
    customUnit?: string;
  }) => void;
  // ✅ Removed: data, isLoading, onRemove, isDragging (now come from context)
}

export function ChartWidget({
  id,
  definition,
  metricConfig,
  onUpdateMetricConfig,
}: ChartWidgetProps) {
  const [showMetricEditor, setShowMetricEditor] = useState(false);
  // ✅ CONSOLIDATED: Single hook replaces 8 lines of state management
  const {
    showConfig,
    setShowConfig,
    widgetConfig,
    setWidgetConfig,
    data,
    isLoading,
    error,
    onRemove,
    isDragging,
  } = useWidgetState(definition, id);

  const renderContent = () => {
    // ✅ CONSOLIDATED: Use centralized loading state
    if (isLoading) {
      return <WidgetLoadingSkeleton height="h-48" />;
    }

    // ✅ CONSOLIDATED: Use centralized empty state
    if (!data || data.length === 0) {
      return <WidgetEmptyState message="Sin datos disponibles" />;
    }

    // ✅ CONSOLIDATED: Use centralized error state
    if (error) {
      return <WidgetErrorState error={error} />;
    }

    try {
      switch (definition.id) {
        case "chart-top-products":
        case "chart-top-customers":
          return (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis
                  dataKey={definition.id === "chart-top-products" ? "producto" : "cliente"}
                  type="category"
                  width={100}
                  className="text-xs"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
                />
                <Bar
                  dataKey={definition.id === "chart-top-products" ? "rentabilidad" : "total"}
                  fill={`hsl(var(--primary))`}
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          );

        case "chart-sales-7days":
          return (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Ventas"]}
                />
                <Line
                  type="monotone"
                  dataKey="ventas"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          );

        default:
          console.warn(`Unknown chart widget type: ${definition.id}`);
          return (
            <div className="h-80 flex flex-col items-center justify-center gap-2">
              <p className="text-sm text-red-600 font-medium">Tipo de gráfico no soportado</p>
              <p className="text-xs text-muted-foreground">{definition.id}</p>
            </div>
          );
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return <WidgetErrorState error={error} />;
    }
  };

  return (
    <>
      <MetricEditorModal
        open={showMetricEditor}
        onOpenChange={setShowMetricEditor}
        currentConfig={metricConfig || {}}
        onSave={(config) => {
          if (onUpdateMetricConfig) {
            onUpdateMetricConfig(config);
          }
          setShowMetricEditor(false);
        }}
      />
      <WidgetConfigModal
        isOpen={showConfig}
        widgetName={definition.name}
        widgetId={id}
        config={widgetConfig}
        onClose={() => setShowConfig(false)}
        onSave={(config) => {
          setWidgetConfig(config);
          // TODO: Persist config to database if needed
        }}
      />
      <WidgetWrapper
        id={id}
        title={definition.name}
        description={definition.description}
        icon={<definition.icon className="h-5 w-5" />}
        accentColor={definition.color}
        onEditMetric={() => setShowMetricEditor(true)}
        onConfigure={() => setShowConfig(true)}
        isDragging={isDragging}
      >
        {renderContent()}
      </WidgetWrapper>
    </>
  );
}
