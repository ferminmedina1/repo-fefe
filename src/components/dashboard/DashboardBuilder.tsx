import { useMemo, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import {
  useDashboardLayout,
  useMultipleDashboards,
  useCreateDashboard,
  useDeleteDashboard,
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
import { DashboardSelector } from "./DashboardSelector";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw, Upload, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function DashboardBuilder() {
  const { currentCompany } = useCompany();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { filters } = useDashboardFilters();
  const { toast } = useToast();
  const [searchParams] = useSearchParams(); // ✅ NEW: Get URL search params
  const [userId, setUserId] = useState<string | undefined>();
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | undefined>(() => {
    // ✅ NEW: Initialize from URL parameter if provided
    return searchParams.get("dashboard") || undefined;
  });
  const [showCSVUploader, setShowCSVUploader] = useState(false);
  const [showMetricBuilder, setShowMetricBuilder] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ✅ NEW: Update selectedDashboardId when URL changes
  useEffect(() => {
    const dashboardParam = searchParams.get("dashboard");
    if (dashboardParam) {
      setSelectedDashboardId(dashboardParam);
    }
  }, [searchParams]);

  // Get user ID from Supabase session
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data?.session?.user?.id);
    };
    getUser();
  }, []);

  // ✅ NEW: Fetch all dashboards for the user
  const { 
    data: dashboards = [], 
    isLoading: dashboardsLoading 
  } = useMultipleDashboards(currentCompany?.id, userId);

  // ✅ NEW: Mutation to create new dashboard
  const createDashboardMutation = useCreateDashboard();

  // ✅ NEW: Mutation to delete dashboard
  const deleteDashboardMutation = useDeleteDashboard();

  // ✅ NEW: Load selected dashboard or default
  const {
    widgets,
    dashboardName,
    dashboardId,
    isLoading: layoutLoading,
    isSaving,
    addWidget,
    removeWidget,
    reorderWidgets,
    resetLayout,
    hasLayout,
    layoutId,
  } = useDashboardLayout(currentCompany?.id, userId, selectedDashboardId);

  // ✅ NEW: Handle dashboard changes
  const handleDashboardChange = (newDashboardId: string) => {
    setSelectedDashboardId(newDashboardId);
  };

  // ✅ NEW: Handle create new dashboard
  const handleCreateNewDashboard = async (name: string) => {
    if (!userId || !currentCompany?.id) return;
    
    const newDashboard = await createDashboardMutation.mutateAsync({
      userId,
      companyId: currentCompany.id,
      name,
    });
    
    setSelectedDashboardId(newDashboard.id);
  };

  // ✅ NEW: Handle delete dashboard
  const handleDeleteDashboard = async (dashboardId: string) => {
    await deleteDashboardMutation.mutateAsync(dashboardId);
    // Switch to first available dashboard or default
    if (selectedDashboardId === dashboardId) {
      const remainingDashboards = dashboards.filter(d => d.id !== dashboardId);
      setSelectedDashboardId(remainingDashboards[0]?.id);
    }
  };

  // ✅ NEW: Handle duplicate dashboard
  const handleDuplicateDashboard = async (sourceDashboardId: string) => {
    const sourceDashboard = dashboards.find(d => d.id === sourceDashboardId);
    if (!sourceDashboard) return;

    if (!userId || !currentCompany?.id) return;

    const newDashboard = await createDashboardMutation.mutateAsync({
      userId,
      companyId: currentCompany.id,
      name: `${sourceDashboard.name} (Copia)`,
    });

    // TODO: Copy widgets from source to new dashboard
    // For now, just create empty dashboard
  };

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
              // ✅ FIXED: Preserve all widget data from template, not just type/size
              widgets.forEach((widget) => {
                addWidget({
                  id: `${widget.type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  type: widget.type,
                  size: widget.size || 'full',
                  // ✅ Preserve template configuration if it exists
                  ...(widget.config && { config: widget.config }),
                  ...(widget.description && { description: widget.description }),
                  ...(widget.title && { title: widget.title }),
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

      {/* ✅ NEW: Dashboard Selector - Always visible at top */}
      {dashboards.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg border border-border">
          <span className="text-sm font-medium text-muted-foreground">Panel de Control:</span>
          <DashboardSelector
            currentDashboardId={selectedDashboardId || dashboardId}
            dashboards={dashboards}
            isLoading={dashboardsLoading}
            onDashboardChange={handleDashboardChange}
            onCreateNew={handleCreateNewDashboard}
            onDeleteDashboard={handleDeleteDashboard}
            onDuplicateDashboard={handleDuplicateDashboard}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Panel de Control Personalizado</h1>
          <p className="text-muted-foreground">
            {widgets.length} widget{widgets.length !== 1 ? "s" : ""} agregado
            {widgets.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
                className="gap-2 whitespace-nowrap"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Explorar templates</span>
                <span className="sm:hidden">Templates</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCSVUploader(true)}
                disabled={isSaving}
                className="gap-2 whitespace-nowrap"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMetricBuilder(true)}
                disabled={isSaving}
                className="gap-2 whitespace-nowrap"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Crear métrica</span>
                <span className="sm:hidden">Métrica</span>
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
              className="gap-2 whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Resetear</span>
              <span className="sm:hidden">Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Widgets Grid */}
      <DragDropWidgetContainer
        widgets={widgets}
        onReorder={reorderWidgets}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
          {widgets.map((widget) => {
            const definition = WIDGET_CATALOG[widget.type as WidgetType];

            // ✅ FIXED: Show error instead of silently failing if widget type not found
            if (!definition) {
              return (
                <SortableWidget key={widget.id} id={widget.id}>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-900">Widget no encontrado</h4>
                        <p className="text-sm text-red-700 mt-1">
                          Tipo de widget desconocido: <code className="bg-red-100 px-2 py-1 rounded text-xs">{widget.type}</code>
                        </p>
                        <button
                          onClick={() => removeWidget(widget.id)}
                          className="text-xs text-red-600 hover:text-red-700 hover:underline mt-2"
                        >
                          Eliminar widget →
                        </button>
                      </div>
                    </div>
                  </div>
                </SortableWidget>
              );
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
                    "rounded-lg border bg-card p-6 shadow-sm",
                    widget.size === "half" ? "col-span-1" : "col-span-1 md:col-span-2 lg:col-span-3"
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
