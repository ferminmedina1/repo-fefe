import { WidgetWrapper } from "./WidgetWrapper";
import { WidgetConfigModal, WidgetConfig } from "./WidgetConfigModal";
import { useWidgetContext } from "@/contexts/WidgetContext";
import { WidgetDefinition } from "@/lib/dashboard/widgets";
import { useState, Suspense, useEffect } from "react";
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
import { LoadingSkeleton } from "@/lib/dashboard/lazyLoading";

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
  definition: WidgetDefinition;
  // ✅ Removed: data, isLoading, onRemove, isDragging (now come from context)
}

export function ChartWidget({
  definition,
}: ChartWidgetProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({
    refreshInterval: 30,
    showTitle: true,
    showDescription: true,
    enableCache: true,
  });
  
  // ✅ NEW: Get data from context instead of props
  const context = useWidgetContext();
  const widgetData = context.dataMap[definition.id];
  const data = widgetData?.data;
  const isLoading = widgetData?.isLoading ?? false;
  const onRemove = () => context.onWidgetRemove(definition.id);
  const isDragging = context.isDragging;

  const [chartError, setChartError] = useState<string | null>(null);

  // ✅ FIXED: Move error clearing to useEffect instead of during render
  useEffect(() => {
    setChartError(null);
  }, [data, isLoading]);

  const renderChart = () => {
    try {

      if (isLoading) {
        return (
          <div className="h-80 bg-muted animate-pulse rounded" />
        );
      }

      if (!data || data.length === 0) {
        return (
          <div className="h-80 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
          </div>
        );
      }

      switch (definition.id) {
        case "chart-top-products":
        case "chart-top-customers":
          return (
            <ResponsiveContainer width="100%" height={300}>
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
            <ResponsiveContainer width="100%" height={300}>
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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al renderizar el gráfico';
      console.error('ChartWidget render error:', error);
      // ✅ FIXED: Don't call setState during render - log error instead
      return (
        <div className="h-80 flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-red-600 font-medium">Error al renderizar gráfico</p>
          <p className="text-xs text-muted-foreground">{errorMsg}</p>
        </div>
      );
    }
  };

  return (
    <>
      <WidgetConfigModal
        isOpen={showConfig}
        widgetName={definition.name}
        widgetId={definition.id}
        config={widgetConfig}
        onClose={() => setShowConfig(false)}
        onSave={(config) => {
          setWidgetConfig(config);
          // TODO: Persist config to database if needed
        }}
      />
      <WidgetWrapper
        title={definition.name}
        description={definition.description}
        icon={<definition.icon className="h-5 w-5" />}
        accentColor={definition.color}
        onConfigure={() => setShowConfig(true)}
        isDragging={isDragging}
      >
        {/* ✅ NEW: Wrap chart rendering with Suspense for lazy loading */}
        <Suspense fallback={<LoadingSkeleton />}>
          {renderChart()}
        </Suspense>
      </WidgetWrapper>
    </>
  );
}
