import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useMetricFormula } from "@/hooks/dashboard/useMetricFormula";
import { useMetricHistory } from "@/hooks/dashboard/useMetricBuilder";
import { CustomMetric } from "@/hooks/dashboard/useMetricBuilder";

export interface CustomMetricWidgetProps {
  metric: CustomMetric;
}

export const CustomMetricWidget = ({ metric }: CustomMetricWidgetProps) => {
  const { evaluateFormula, isLoading } = useMetricFormula();
  const { data: history } = useMetricHistory(metric.id);

  // Calculate current value
  const currentValue = useMemo(() => {
    return evaluateFormula(metric.formula);
  }, [metric.formula, evaluateFormula]);

  // Calculate trend
  const trend = useMemo(() => {
    if (!history || history.length < 2) return null;

    const sorted = [...history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const current = sorted[0]?.value || 0;
    const previous = sorted[1]?.value || 0;

    if (previous === 0) return null;

    const percentChange = ((current - previous) / Math.abs(previous)) * 100;
    return {
      change: current - previous,
      percentChange,
      isPositive: current > previous,
    };
  }, [history]);

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    if (value % 1 !== 0) return value.toFixed(2);
    return value.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 text-sm truncate">
            {metric.name}
          </h3>
          {metric.description && (
            <p className="text-xs text-gray-600 mt-1 truncate">
              {metric.description}
            </p>
          )}
        </div>
      </div>

      {/* Value Display */}
      <div className="flex-1 flex items-center justify-center py-4">
        {isLoading ? (
          <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        ) : currentValue === null ? (
          <div className="text-center">
            <p className="text-sm text-red-600">Error al calcular</p>
            <code className="text-xs text-gray-600 mt-2 block break-words">
              {metric.formula}
            </code>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {formatValue(currentValue)}
            </p>

            {/* Trend Indicator */}
            {trend && (
              <div
                className={`flex items-center justify-center gap-1 mt-2 text-sm ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>
                  {trend.percentChange > 0 ? "+" : ""}
                  {trend.percentChange.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t pt-3 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-600" />
          <p className="text-xs text-gray-600">
            {metric.data_source.replace("-", " ")}
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-2 font-mono truncate hover:text-clip">
          {metric.formula}
        </p>
      </div>
    </div>
  );
};
