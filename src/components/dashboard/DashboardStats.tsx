/**
 * DashboardStats Component
 * Muestra estadísticas y métricas del Panel de Control en tiempo real
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, Zap, Database, Clock } from 'lucide-react';
import { WidgetHealthStatus, WidgetValidator } from '@/lib/dashboard/widgetValidator';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  widgetCount: number;
  widgetStatuses: Record<string, WidgetHealthStatus>;
  isLoading?: boolean;
}

export function DashboardStats({ widgetCount, widgetStatuses, isLoading = false }: DashboardStatsProps) {
  const [health, setHealth] = useState<ReturnType<typeof WidgetValidator.calculateDashboardHealth> | null>(null);

  useEffect(() => {
    const statuses = Object.values(widgetStatuses);
    if (statuses.length === 0) return;
    setHealth(WidgetValidator.calculateDashboardHealth(statuses));
  }, [widgetStatuses]);

  if (!health || isLoading) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-background/80 to-muted/30">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Estadísticas del Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted/50 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const getHealthColor = () => {
    if (health.status === 'critical') return 'text-red-500';
    if (health.status === 'warning') return 'text-amber-500';
    return 'text-green-500';
  };

  const getHealthBg = () => {
    if (health.status === 'critical') return 'bg-red-500/10 border-red-500/20';
    if (health.status === 'warning') return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-green-500/10 border-green-500/20';
  };

  const getHealthIcon = () => {
    if (health.status === 'critical') return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (health.status === 'warning') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  };

  return (
    <Card className={cn('border', getHealthBg())}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {getHealthIcon()}
              <CardTitle className="text-sm">Estadísticas del Panel</CardTitle>
            </div>
          </div>
          <Badge
            variant={health.status === 'critical' ? 'destructive' : health.status === 'warning' ? 'secondary' : 'default'}
            className="text-xs"
          >
            {health.status === 'critical' ? 'Crítico' : health.status === 'warning' ? 'Alerta' : 'Saludable'}
          </Badge>
        </div>
        <CardDescription className="text-xs">Métricas en tiempo real</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Grid de métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Widgets */}
            <div className="p-3 rounded-lg bg-background/40 border border-border/30">
              <div className="text-xs text-muted-foreground mb-1">Widgets</div>
              <div className="text-lg font-semibold">{health.healthy}</div>
              <div className="text-xs text-muted-foreground">de {widgetCount}</div>
            </div>

            {/* Health Percentage */}
            <div className="p-3 rounded-lg bg-background/40 border border-border/30">
              <div className="text-xs text-muted-foreground mb-1">Salud</div>
              <div className={cn('text-lg font-semibold', getHealthColor())}>
                {health.healthPercentage.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">general</div>
            </div>

            {/* Errors */}
            <div className="p-3 rounded-lg bg-background/40 border border-border/30">
              <div className="text-xs text-muted-foreground mb-1">Errores</div>
              <div className={cn('text-lg font-semibold', health.errors > 0 && 'text-red-500')}>
                {health.errors}
              </div>
              <div className="text-xs text-muted-foreground">detectados</div>
            </div>

            {/* Warnings */}
            <div className="p-3 rounded-lg bg-background/40 border border-border/30">
              <div className="text-xs text-muted-foreground mb-1">Advertencias</div>
              <div className={cn('text-lg font-semibold', health.warnings > 0 && 'text-amber-500')}>
                {health.warnings}
              </div>
              <div className="text-xs text-muted-foreground">activas</div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="pt-2 border-t border-border/30">
            <div className="grid grid-cols-3 gap-3 text-xs">
              {/* Load Time */}
              <div className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-muted-foreground">Carga promedio</div>
                  <div className="font-semibold text-foreground">
                    {health.performance.avgLoadTime.toFixed(0)}ms
                  </div>
                </div>
              </div>

              {/* Render Time */}
              <div className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-muted-foreground">Render promedio</div>
                  <div className="font-semibold text-foreground">
                    {health.performance.avgRenderTime.toFixed(0)}ms
                  </div>
                </div>
              </div>

              {/* Data Size */}
              <div className="flex items-start gap-2">
                <Database className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-muted-foreground">Tamaño datos</div>
                  <div className="font-semibold text-foreground">
                    {(health.performance.totalDataSize / 1024).toFixed(0)}KB
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Health Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-medium text-muted-foreground">Barra de salud</div>
              <div className="text-xs font-semibold text-foreground">{health.healthPercentage.toFixed(1)}%</div>
            </div>
            <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden border border-border/30">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  health.status === 'critical'
                    ? 'bg-red-500'
                    : health.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                )}
                style={{ width: `${health.healthPercentage}%` }}
              />
            </div>
          </div>

          {/* Issues Summary */}
          {(health.errors > 0 || health.warnings > 0) && (
            <div className="pt-2 border-t border-border/30">
              <div className="text-xs font-medium text-muted-foreground mb-2">Problemas detectados</div>
              <div className="space-y-1 text-xs">
                {health.errors > 0 && (
                  <div className="flex items-center gap-2 text-red-500">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>{health.errors} error(es) que requieren atención</span>
                  </div>
                )}
                {health.warnings > 0 && (
                  <div className="flex items-center gap-2 text-amber-500">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{health.warnings} advertencia(s)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
