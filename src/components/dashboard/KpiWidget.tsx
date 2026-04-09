import { WidgetWrapper } from "./WidgetWrapper";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { WidgetDefinition } from "@/lib/dashboard/widgets";
import { MonthlyComparisonData } from "@/hooks/dashboard/useMonthlyComparison";
import { ReceivablesData } from "@/hooks/dashboard/useReceivables";

interface KpiWidgetProps {
  definition: WidgetDefinition;
  data?: MonthlyComparisonData | ReceivablesData | { today: number } | null;
  isLoading?: boolean;
  onRemove?: () => void;
  isDragging?: boolean;
}

export function KpiWidget({
  definition,
  data,
  isLoading = false,
  onRemove,
  isDragging,
}: KpiWidgetProps) {
  const renderContent = () => {
    if (isLoading) {
      return <div className="h-12 bg-muted animate-pulse rounded" />;
    }

    if (!data) {
      return <p className="text-xs text-muted-foreground">Sin datos disponibles</p>;
    }

    switch (definition.id) {
      case "kpi-monthly-sales": {
        const monthlyData = data as MonthlyComparisonData;
        return (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">${monthlyData.currentMonth.toFixed(0)}</div>
              {monthlyData && (
                <Badge
                  variant="outline"
                  className={`${
                    monthlyData.isPositive
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                      : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                  } flex items-center gap-1`}
                >
                  {monthlyData.isPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(monthlyData.percentageChange).toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              vs mes pasado: ${monthlyData.lastMonth.toFixed(0)}
            </p>
          </div>
        );
      }

      case "kpi-gross-margin": {
        const marginData = data as MonthlyComparisonData;
        return (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">${marginData.grossMargin.toFixed(0)}</div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                {marginData.marginPercentage.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Rentabilidad del mes</p>
          </div>
        );
      }

      case "kpi-receivables": {
        const receivablesData = data as ReceivablesData;
        return (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">${receivablesData.total.toFixed(0)}</div>
              {receivablesData.overduePercentage > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30">
                  {receivablesData.overduePercentage.toFixed(0)}% venc.
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Vencidas: ${receivablesData.overdue.toFixed(0)} ({receivablesData.overdueCount})
            </p>
          </div>
        );
      }

      case "kpi-sales-today": {
        const todayData = data as { today: number };
        return (
          <div className="space-y-2">
            <div className="text-3xl font-bold">${todayData.today.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Ingresos del día actual</p>
          </div>
        );
      }

      default:
        return <p className="text-xs text-muted-foreground">Widget no configurado</p>;
    }
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
