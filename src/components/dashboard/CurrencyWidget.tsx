import { WidgetWrapper } from "./WidgetWrapper";
import { WidgetConfigModal, WidgetConfig } from "./WidgetConfigModal";
import { MetricEditorModal } from "./MetricEditorModal";
import { useWidgetState, WidgetLoadingSkeleton, WidgetEmptyState, WidgetErrorState } from "@/hooks/useWidgetState";
import { WidgetDefinition } from "@/lib/dashboard/widgets";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface CurrencyData {
  id?: string;
  currency?: string;
  rate?: number;
  date?: string;
  USD?: number;
  EUR?: number;
  totalValue?: number;
  totalCost?: number;
  productCount?: number;
  valueInARS?: number;
}

interface CurrencyWidgetProps {
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
}

export function CurrencyWidget({
  id,
  definition,
  metricConfig,
  onUpdateMetricConfig,
}: CurrencyWidgetProps) {
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
  } = useWidgetState(definition);

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

    switch (definition.id) {
      case "currency-rates":
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
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="USD"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="EUR"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "currency-summary":
        return (
          <div className="space-y-1.5">
            {data.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.currency}</Badge>
                  <span className="text-xs font-semibold text-foreground">
                    ${item.valueInARS?.toFixed(0) || 0}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div>
                    <p className="text-muted-foreground text-[9px]">Valor</p>
                    <p className="font-medium">${item.totalValue?.toFixed(0) || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[9px]">Productos</p>
                    <p className="font-medium">{item.productCount || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return <p className="text-sm text-muted-foreground">Widget no configurado</p>;
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
        {renderContent()}
      </WidgetWrapper>
    </>
  );
}
