import { WidgetWrapper } from "./WidgetWrapper";
import { WidgetConfigModal, WidgetConfig } from "./WidgetConfigModal";
import { MetricEditorModal } from "./MetricEditorModal";
import { useWidgetState, WidgetLoadingSkeleton, WidgetEmptyState, WidgetErrorState } from "@/hooks/useWidgetState";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { WidgetDefinition } from "@/lib/dashboard/widgets";
import { MonthlyComparisonData } from "@/hooks/dashboard/useMonthlyComparison";
import { ReceivablesData } from "@/hooks/dashboard/useReceivables";
import { useState } from "react";

interface KpiWidgetProps {
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

export function KpiWidget({
  id,
  definition,
  metricConfig,
  onUpdateMetricConfig,
}: KpiWidgetProps) {
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
      return <WidgetLoadingSkeleton height="h-16" />;
    }

    // ✅ CONSOLIDATED: Use centralized empty state
    if (!data) {
      return <WidgetEmptyState message="Sin datos disponibles" />;
    }

    // ✅ CONSOLIDATED: Use centralized error state
    if (error) {
      return <WidgetErrorState error={error} />;
    }

    switch (definition.id) {
      case "kpi-monthly-sales": {
        const monthlyData = data as MonthlyComparisonData;
        const currentMonth = monthlyData?.currentMonth ?? 0;
        const lastMonth = monthlyData?.lastMonth ?? 0;
        const percentChange = monthlyData?.percentageChange ?? 0;
        const isPositive = monthlyData?.isPositive ?? (currentMonth >= lastMonth);

        return (
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-bold">${(currentMonth ?? 0).toFixed(0)}</div>
              {monthlyData && (
                <Badge
                  variant="outline"
                  className={`${
                    isPositive
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                      : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                  } flex items-center gap-0.5 text-[10px] px-1.5 py-0.5`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  ) : (
                    <ArrowDownRight className="h-2.5 w-2.5" />
                  )}
                  {Math.abs(percentChange).toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              vs mes pasado: ${lastMonth.toFixed(0)}
            </p>
          </div>
        );
      }

      case "kpi-gross-margin": {
        const marginData = data as MonthlyComparisonData;
        const grossMargin = marginData?.grossMargin ?? 0;
        const marginPercentage = marginData?.marginPercentage ?? 0;

        return (
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-bold">${(grossMargin ?? 0).toFixed(0)}</div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-[10px] px-1.5 py-0.5">
                {marginPercentage.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">Rentabilidad del mes</p>
          </div>
        );
      }

      case "kpi-receivables": {
        const receivablesData = data as ReceivablesData;
        const total = receivablesData?.total ?? 0;
        const overdue = receivablesData?.overdue ?? 0;
        const overduePercentage = receivablesData?.overduePercentage ?? 0;
        const overdueCount = receivablesData?.overdueCount ?? 0;

        return (
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-bold">${(total ?? 0).toFixed(0)}</div>
              {overduePercentage > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] px-1.5 py-0.5">
                  {overduePercentage.toFixed(0)}% venc.
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Vencidas: ${overdue.toFixed(0)} ({overdueCount})
            </p>
          </div>
        );
      }

      case "kpi-sales-today": {
        const todayData = data as { today?: number };
        const today = todayData?.today ?? 0;

        return (
          <div className="space-y-1">
            <div className="text-2xl font-bold">${today.toFixed(0)}</div>
            <p className="text-[10px] text-muted-foreground">Ingresos del día actual</p>
          </div>
        );
      }

      default:
        console.warn(`Unknown KPI widget type: ${definition.id}`);
        return <p className="text-[11px] text-red-600">Tipo de widget desconocido</p>;
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
