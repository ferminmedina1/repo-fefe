/**
 * DASHBOARD QUICK START
 * ====================
 * Quick action to apply popular metric templates
 * Used when dashboard is empty
 */

import { Button } from "@/components/ui/button";
import { WidgetDefinition, WIDGET_CATALOG } from "@/lib/dashboard/widgets";
import { TrendingUp, BarChart3, Users, DollarSign } from "lucide-react";

interface DashboardQuickStartProps {
  onApplyMetric: (metricId: string) => void;
  disabled?: boolean;
}

/**
 * Popular metrics for quick start
 * Users can apply these instantly with one click
 */
const QUICK_START_METRICS = [
  {
    id: 'sales-monthly-total',
    name: 'Ventas del Mes',
    icon: DollarSign,
    color: 'text-green-600',
  },
  {
    id: 'sales-today',
    name: 'Ventas Hoy',
    icon: TrendingUp,
    color: 'text-blue-600',
  },
  {
    id: 'chart-sales-7days',
    name: 'Últimos 7 Días',
    icon: BarChart3,
    color: 'text-purple-600',
  },
  {
    id: 'chart-top-customers',
    name: 'Top Clientes',
    icon: Users,
    color: 'text-indigo-600',
  },
];

export function DashboardQuickStart({
  onApplyMetric,
  disabled = false,
}: DashboardQuickStartProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {QUICK_START_METRICS.map((metric) => {
        const Icon = metric.icon;
        return (
          <Button
            key={metric.id}
            variant="outline"
            size="sm"
            onClick={() => onApplyMetric(metric.id)}
            disabled={disabled}
            className="flex flex-col items-center justify-center h-auto py-3 gap-2 hover:bg-primary/10 hover:border-primary transition-all"
          >
            <Icon className={`h-4 w-4 ${metric.color}`} />
            <span className="text-xs font-medium text-center line-clamp-2">
              {metric.name}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
