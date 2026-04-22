import { useState } from "react";
import { WidgetWrapper } from "./WidgetWrapper";
import { WidgetConfigModal, WidgetConfig } from "./WidgetConfigModal";
import { useWidgetContext } from "@/contexts/WidgetContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { WidgetDefinition } from "@/lib/dashboard/widgets";
import { MonthlyComparisonData } from "@/hooks/dashboard/useMonthlyComparison";
import { ReceivablesData } from "@/hooks/dashboard/useReceivables";

interface KpiWidgetProps {
  definition: WidgetDefinition;
  // ✅ Removed: data, isLoading, onRemove, isDragging (now come from context)
}

export function KpiWidget({
  definition,
}: KpiWidgetProps) {
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

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-1">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      );
    }

    if (!data) {
      return <p className="text-[11px] text-muted-foreground">Sin datos disponibles</p>;
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
              <div className="text-2xl font-bold">${currentMonth.toFixed(0)}</div>
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
              <div className="text-2xl font-bold">${grossMargin.toFixed(0)}</div>
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
              <div className="text-2xl font-bold">${total.toFixed(0)}</div>
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
