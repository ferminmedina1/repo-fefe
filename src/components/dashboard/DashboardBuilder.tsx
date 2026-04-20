import { useMemo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import {
  useDashboardLayout,
  useMonthlyComparison,
  useTopProducts,
  useTopCustomers,
  useReceivables,
  useCriticalStock,
  useExchangeRates,
  useSevenDaysSalesChart,
} from "@/hooks/dashboard";
import { useHistoricalRates } from "@/hooks/dashboard/useExchangeRates";
import { WIDGET_CATALOG, WidgetType, getAvailableWidgets } from "@/lib/dashboard/widgets";
import { WidgetPicker } from "./WidgetPicker";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { DragDropWidgetContainer, SortableWidget } from "./DragDropWidgetContainer";
import { KpiWidget } from "./KpiWidget";
import { ChartWidget } from "./ChartWidget";
import { ListWidget } from "./ListWidget";
import { CurrencyWidget } from "./CurrencyWidget";
import { ExportButton } from "./ExportButton";
import { ImportButton } from "./ImportButton";
import { DashboardFilters } from "./DashboardFilters";
import { TemplateGallery } from "./TemplateGallery";
import { ShareModal } from "./ShareModal";
import { RefreshButton } from "./RefreshButton";
import { CSVUploader } from "./CSVUploader";
import { MetricBuilderModal } from "./MetricBuilderModal";
import { AlertTriangle, RefreshCw, Upload, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function DashboardBuilder() {
  const { currentCompany } = useCompany();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { filters } = useDashboardFilters();
  const [userId, setUserId] = useState<string | undefined>();
  const [showCSVUploader, setShowCSVUploader] = useState(false);
  const [showMetricBuilder, setShowMetricBuilder] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // ✅ For WidgetProvider

  // Get user ID from Supabase session
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data?.session?.user?.id);
    };
    getUser();
  }, []);

  // Load dashboard layout
  const {
    widgets,
    isLoading: layoutLoading,
    isSaving,
    addWidget,
    removeWidget,
    reorderWidgets,
    resetLayout,
    hasLayout,
    layoutId,
  } = useDashboardLayout(currentCompany?.id, userId);

  // Fetch all data with filters
  const monthlyComparisonQuery = useMonthlyComparison(
    currentCompany?.id,
    hasPermission("sales", "view"),
    filters
  );
  const topProductsQuery = useTopProducts(
    currentCompany?.id,
    hasPermission("sales", "view") && hasPermission("products", "view"),
    filters
  );
  const topCustomersQuery = useTopCustomers(
    currentCompany?.id,
    hasPermission("sales", "view") && hasPermission("customers", "view"),
    filters
  );
  const receivablesQuery = useReceivables(
    currentCompany?.id,
    hasPermission("sales", "view"),
    filters
  );
  const criticalStockQuery = useCriticalStock(
    currentCompany?.id,
    hasPermission("products", "view"),
    filters
  );
  const exchangeRatesQuery = useExchangeRates(currentCompany?.id, true, filters);
  const historicalRatesQuery = useHistoricalRates(currentCompany?.id, true, filters);
  const sevenDaysSalesChartQuery = useSevenDaysSalesChart(
    currentCompany?.id,
    hasPermission("sales", "view"),
    filters
  );

  // ✅ NEW: Create centralized dataMap with WidgetData structure
  // Each widget gets {data, isLoading, error} - no more prop drilling!
  const contextDataMap = useMemo(
    () => ({
      "kpi-monthly-sales": {
        data: monthlyComparisonQuery.data,
        isLoading: monthlyComparisonQuery.isLoading,
        error: monthlyComparisonQuery.error,
      },
      "kpi-gross-margin": {
        data: monthlyComparisonQuery.data,
        isLoading: monthlyComparisonQuery.isLoading,
        error: monthlyComparisonQuery.error,
      },
      "kpi-receivables": {
        data: receivablesQuery.data,
        isLoading: receivablesQuery.isLoading,
        error: receivablesQuery.error,
      },
      "kpi-sales-today": {
        data: monthlyComparisonQuery.data ? { today: monthlyComparisonQuery.data.currentMonth } : null,
        isLoading: monthlyComparisonQuery.isLoading,
        error: monthlyComparisonQuery.error,
      },
      "chart-top-products": {
        data: topProductsQuery.data,
        isLoading: topProductsQuery.isLoading,
        error: topProductsQuery.error,
      },
      "chart-top-customers": {
        data: topCustomersQuery.data,
        isLoading: topCustomersQuery.isLoading,
        error: topCustomersQuery.error,
      },
      "chart-sales-7days": {
        data: sevenDaysSalesChartQuery.data,
        isLoading: sevenDaysSalesChartQuery.isLoading,
        error: sevenDaysSalesChartQuery.error,
      },
      "list-critical-stock": {
        data: criticalStockQuery.data,
        isLoading: criticalStockQuery.isLoading,
        error: criticalStockQuery.error,
      },
      "currency-rates": {
        data: historicalRatesQuery.data,
        isLoading: historicalRatesQuery.isLoading,
        error: historicalRatesQuery.error,
      },
      "currency-summary": {
        data: exchangeRatesQuery.data || [],
        isLoading: exchangeRatesQuery.isLoading,
        error: exchangeRatesQuery.error,
      },
    }),
    [
      monthlyComparisonQuery.data,
      monthlyComparisonQuery.isLoading,
      monthlyComparisonQuery.error,
      receivablesQuery.data,
      receivablesQuery.isLoading,
      receivablesQuery.error,
      topProductsQuery.data,
      topProductsQuery.isLoading,
      topProductsQuery.error,
      topCustomersQuery.data,
      topCustomersQuery.isLoading,
      topCustomersQuery.error,
      sevenDaysSalesChartQuery.data,
      sevenDaysSalesChartQuery.isLoading,
      sevenDaysSalesChartQuery.error,
      criticalStockQuery.data,
      criticalStockQuery.isLoading,
      criticalStockQuery.error,
      historicalRatesQuery.data,
      historicalRatesQuery.isLoading,
      historicalRatesQuery.error,
      exchangeRatesQuery.data,
      exchangeRatesQuery.isLoading,
      exchangeRatesQuery.error,
    ]
  );

  const canViewSales = hasPermission("sales", "view");
  const canViewProducts = hasPermission("products", "view");
  const hasAnyPermission = canViewSales || hasPermission("customers", "view");

  // Wrapper for addWidget to match WidgetPicker's interface
  const handleAddWidget = (widgetType: WidgetType, size?: 'full' | 'half' | 'quarter') => {
    addWidget({
      id: `${widgetType}-${Date.now()}`, // Generate unique ID
      type: widgetType,
      size: size || 'full',
    });
  };

  if (permissionsLoading || layoutLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Cargando Panel de Control...</p>
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
            <h1 className="text-3xl font-bold text-foreground">Panel de Control Personalizado</h1>
            <p className="text-muted-foreground">Crea tu Panel de Control agregando widgets</p>
          </div>
          <WidgetPicker
            addedWidgetIds={widgets.map((w) => w.type)}
            onAddWidget={addWidget}
          />
        </div>
        <DashboardEmptyState
          onChooseTemplate={() => setShowTemplateGallery(true)}
          onChooseFreeBuilder={() => {
            // Open widget picker or add first widget
            handleAddWidget("kpi-monthly-sales" as WidgetType);
          }}
        />
        {showTemplateGallery && (
          <TemplateGallery
            onSelectTemplate={async (widgets) => {
              // Add each widget from template
              widgets.forEach((widget) => {
                addWidget({
                  id: `${widget.type}-${Date.now()}-${Math.random()}`,
                  type: widget.type,
                  size: widget.size || 'full',
                });
              });
              setShowTemplateGallery(false);
            }}
            onClose={() => setShowTemplateGallery(false)}
          />
        )}
      </div>
    );
  }

  const addedWidgetTypes = widgets.map((w) => w.type);
  const availableWidgets = getAvailableWidgets(addedWidgetTypes);

  return (
    <WidgetProvider
      dataMap={contextDataMap}
      definitions={WIDGET_CATALOG}
      onWidgetRemove={removeWidget}
      onWidgetUpdate={(widgetId, config) => {
        // TODO: Implement widget config updates if needed
        console.log("Widget update requested:", widgetId, config);
      }}
      isDragging={isDragging}
      setIsDragging={setIsDragging}
    >
      <div className="space-y-6">
      {/* Global Filters */}
      <DashboardFilters />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Control Personalizado</h1>
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
          {widgets.length > 0 && (
            <>
              <RefreshButton disabled={isSaving} />
              <ExportButton widgets={widgets} dashboardName="My Dashboard" />
              <ImportButton onImport={async (newWidgets) => {
                resetLayout();
                newWidgets.forEach(w => addWidget(w));
              }} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateGallery(true)}
                disabled={isSaving}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Explorar templates
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCSVUploader(true)}
                disabled={isSaving}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Importar datos CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMetricBuilder(true)}
                disabled={isSaving}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Crear métrica
              </Button>
              {layoutId && <ShareModal layoutId={layoutId} />}
            </>
          )}
          {availableWidgets.length > 0 && (
            <WidgetPicker
              addedWidgetIds={addedWidgetTypes}
              onAddWidget={handleAddWidget}
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
      <DragDropWidgetContainer
        widgets={widgets}
        onReorder={reorderWidgets}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
          {widgets.map((widget) => {
            const definition = WIDGET_CATALOG[widget.type as WidgetType];

            if (!definition) {
              return null;
            }

            // ✅ All widgets now get data from context - no more prop drilling!
            const widgetContent = (() => {
              switch (definition.category) {
                case "kpi":
                  return <KpiWidget definition={definition} />;

                case "chart":
                  return <ChartWidget definition={definition} />;

                case "list":
                  return <ListWidget definition={definition} />;

                case "currency":
                  return <CurrencyWidget definition={definition} />;

                default:
                  return null;
              }
            })();

            if (!widgetContent) return null;

            return (
              <SortableWidget key={widget.id} id={widget.id}>
                <div
                  className={cn(
                    widget.size === "half" ? "md:col-span-1 lg:col-span-1" : "col-span-1 md:col-span-2 lg:col-span-3"
                  )}
                >
                  {/* ✅ Wrap widget with error boundary to prevent cascade failures */}
                  <WidgetErrorBoundary widgetName={definition.name}>
                    {widgetContent}
                  </WidgetErrorBoundary>
                </div>
              </SortableWidget>
            );
          })}
        </div>
      </DragDropWidgetContainer>

      {/* Footer info */}
      <div className="text-xs text-muted-foreground text-center py-4">
        {availableWidgets.length > 0 ? (
          <p>{availableWidgets.length} widget(s) disponibles para agregar</p>
        ) : (
          <p>Todos los widgets están agregados</p>
        )}
      </div>

      {/* CSV Uploader Modal */}
      {showCSVUploader && (
        <CSVUploader
          onSuccess={(inserted) => {
            setShowCSVUploader(false);
            // Optionally refetch data or show success toast
          }}
          onClose={() => setShowCSVUploader(false)}
        />
      )}

      {/* Metric Builder Modal */}
      {showMetricBuilder && (
        <MetricBuilderModal onClose={() => setShowMetricBuilder(false)} />
      )}
      </div>
    </WidgetProvider>
  );
}
