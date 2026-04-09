import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useDashboardLayout,
  useMonthlyComparison,
  useTopProducts,
  useTopCustomers,
  useReceivables,
  useCriticalStock,
  useExchangeRates,
} from "@/hooks/dashboard";
import { useHistoricalRates } from "@/hooks/dashboard/useExchangeRates";
import { WIDGET_CATALOG, WidgetType, getAvailableWidgets } from "@/lib/dashboard/widgets";
import { WidgetPicker } from "./WidgetPicker";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { KpiWidget } from "./KpiWidget";
import { ChartWidget } from "./ChartWidget";
import { ListWidget } from "./ListWidget";
import { CurrencyWidget } from "./CurrencyWidget";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@supabase/auth-helpers-react";

export function DashboardBuilder() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // Load dashboard layout
  const {
    widgets,
    isLoading: layoutLoading,
    isSaving,
    addWidget,
    removeWidget,
    resetLayout,
    hasLayout,
  } = useDashboardLayout(currentCompany?.id, user?.id);

  // Fetch all data (queries only run if needed)
  const monthlyComparisonQuery = useMonthlyComparison(
    currentCompany?.id,
    hasPermission("sales", "view")
  );
  const topProductsQuery = useTopProducts(
    currentCompany?.id,
    hasPermission("sales", "view") && hasPermission("products", "view")
  );
  const topCustomersQuery = useTopCustomers(
    currentCompany?.id,
    hasPermission("sales", "view") && hasPermission("customers", "view")
  );
  const receivablesQuery = useReceivables(currentCompany?.id, hasPermission("sales", "view"));
  const criticalStockQuery = useCriticalStock(
    currentCompany?.id,
    hasPermission("products", "view")
  );
  const exchangeRatesQuery = useExchangeRates(currentCompany?.id, true);
  const historicalRatesQuery = useHistoricalRates(currentCompany?.id, true);

  // Sales stats query (for charts)
  const { data: salesData } = useMonthlyComparison(currentCompany?.id, hasPermission("sales", "view"));

  // Get data map for easy access
  const dataMap = useMemo(
    () => ({
      "kpi-monthly-sales": monthlyComparisonQuery.data,
      "kpi-gross-margin": monthlyComparisonQuery.data,
      "kpi-receivables": receivablesQuery.data,
      "kpi-sales-today": salesData ? { today: salesData.currentMonth } : null,
      "chart-top-products": topProductsQuery.data,
      "chart-top-customers": topCustomersQuery.data,
      "chart-sales-7days": null, // TODO: Add useSevenDaysSalesChart hook
      "list-critical-stock": criticalStockQuery.data,
      "currency-rates": historicalRatesQuery.data,
      "currency-summary": exchangeRatesQuery.data?.map((rate) => ({
        isLoading: false,
      })),
    }),
    [
      monthlyComparisonQuery.data,
      receivablesQuery.data,
      salesData,
      topProductsQuery.data,
      topCustomersQuery.data,
      criticalStockQuery.data,
      historicalRatesQuery.data,
      exchangeRatesQuery.data,
    ]
  );

  // Get loading state map
  const loadingMap = useMemo(
    () => ({
      "kpi-monthly-sales": monthlyComparisonQuery.isLoading,
      "kpi-gross-margin": monthlyComparisonQuery.isLoading,
      "kpi-receivables": receivablesQuery.isLoading,
      "kpi-sales-today": monthlyComparisonQuery.isLoading,
      "chart-top-products": topProductsQuery.isLoading,
      "chart-top-customers": topCustomersQuery.isLoading,
      "chart-sales-7days": false, // TODO
      "list-critical-stock": criticalStockQuery.isLoading,
      "currency-rates": historicalRatesQuery.isLoading,
      "currency-summary": exchangeRatesQuery.isLoading,
    }),
    [
      monthlyComparisonQuery.isLoading,
      receivablesQuery.isLoading,
      topProductsQuery.isLoading,
      topCustomersQuery.isLoading,
      criticalStockQuery.isLoading,
      historicalRatesQuery.isLoading,
      exchangeRatesQuery.isLoading,
    ]
  );

  const canViewSales = hasPermission("sales", "view");
  const canViewProducts = hasPermission("products", "view");
  const hasAnyPermission = canViewSales || hasPermission("customers", "view");

  if (permissionsLoading || layoutLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Cargando dashboard...</p>
      </div>
    );
  }

  if (!hasAnyPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertTriangle className="h-16 w-16 text-warning" />
        <h2 className="text-2xl font-bold text-foreground">Sin permisos de visualización</h2>
        <p className="text-muted-foreground text-center max-w-md">
          No tienes permisos para ver ninguna sección del dashboard. Contacta con tu administrador.
        </p>
      </div>
    );
  }

  // Show empty state if no widgets
  if (widgets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Personalizado</h1>
            <p className="text-muted-foreground">Crea tu dashboard agregando widgets</p>
          </div>
          <WidgetPicker
            addedWidgetIds={widgets.map((w) => w.type)}
            onAddWidget={addWidget}
          />
        </div>
        <DashboardEmptyState
          onChooseTemplate={() => {
            // TODO: Implement template selection
          }}
          onChooseFreeBuilder={() => {
            // Open widget picker
            addWidget("kpi-monthly-sales" as WidgetType);
          }}
        />
      </div>
    );
  }

  const addedWidgetTypes = widgets.map((w) => w.type);
  const availableWidgets = getAvailableWidgets(addedWidgetTypes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Personalizado</h1>
          <p className="text-muted-foreground">
            {widgets.length} widget{widgets.length !== 1 ? "s" : ""} agregado
            {widgets.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <div className="animate-spin">
                <RefreshCw className="h-3 w-3" />
              </div>
              Guardando...
            </div>
          )}
          {availableWidgets.length > 0 && (
            <WidgetPicker
              addedWidgetIds={addedWidgetTypes}
              onAddWidget={addWidget}
              disabled={isSaving}
            />
          )}
          {widgets.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetLayout}
              disabled={isSaving}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Resetear
            </Button>
          )}
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
        {widgets.map((widget) => {
          const definition = WIDGET_CATALOG[widget.type as WidgetType];
          const data = dataMap[widget.type as WidgetType];
          const isLoading = loadingMap[widget.type as WidgetType];

          if (!definition) {
            return null;
          }

          const commonProps = {
            definition,
            data,
            isLoading,
            onRemove: () => removeWidget(widget.id),
            isDragging: false,
          };

          // Render widget based on category
          switch (definition.category) {
            case "kpi":
              return (
                <KpiWidget
                  key={widget.id}
                  {...commonProps}
                />
              );

            case "chart":
              return (
                <div key={widget.id} className="col-span-1 md:col-span-2 lg:col-span-3">
                  <ChartWidget {...commonProps} />
                </div>
              );

            case "list":
              return (
                <div key={widget.id} className="col-span-1 md:col-span-2 lg:col-span-3">
                  <ListWidget {...commonProps} />
                </div>
              );

            case "currency":
              return (
                <div
                  key={widget.id}
                  className={cn(
                    widget.size === "half" ? "md:col-span-1 lg:col-span-1" : "col-span-1 md:col-span-2 lg:col-span-3"
                  )}
                >
                  <CurrencyWidget {...commonProps} />
                </div>
              );

            default:
              return null;
          }
        })}
      </div>

      {/* Footer info */}
      <div className="text-xs text-muted-foreground text-center py-4">
        {availableWidgets.length > 0 ? (
          <p>{availableWidgets.length} widget(s) disponibles para agregar</p>
        ) : (
          <p>Todos los widgets están agregados</p>
        )}
      </div>
    </div>
  );
}
