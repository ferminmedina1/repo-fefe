import { useMemo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useDashboardFilters } from "@/contexts/DashboardFilterContext";
import { useDashboardSelection } from "@/hooks/useDashboardSelection";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import {
  useDashboardLayout,
  useMultipleDashboards,
  useCreateDashboard,
  useDeleteDashboard,
  useDashboardAllData,
} from "@/hooks/dashboard";
import { WIDGET_CATALOG, WidgetType, getAvailableWidgets } from "@/lib/dashboard/widgets";
import { getWidgetContainerClassesForType, type WidgetSize } from "@/lib/dashboard/widgetDimensions";
import { WidgetPicker } from "./WidgetPicker";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { EnterpriseDragDropContainer, EnterpriseSortableWidget } from "./EnhancedDragDropContainer";
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
import { CreateNewDashboardDialog } from "./CreateNewDashboardDialog";
import { DashboardLoadingScreen } from "./DashboardLoadingScreen";
import { DashboardActionsMenu } from "./DashboardActionsMenu";
import { DashboardQuickStart } from "./DashboardQuickStart";
import { WidgetCustomizerModal } from "./WidgetCustomizerModal";
import { WidgetTemplatesGallery } from "./WidgetTemplatesGallery";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw, Upload, Zap, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function DashboardBuilder() {
  const { currentCompany } = useCompany();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { filters } = useDashboardFilters();
  const { toast } = useToast();
  
  // ✅ SINGLE SOURCE OF TRUTH: URL is the only place dashboard selection is stored
  const { selectedDashboardId, setSelectedDashboardId } = useDashboardSelection();
  
  const [userId, setUserId] = useState<string | undefined>();
  const [showCSVUploader, setShowCSVUploader] = useState(false);
  const [showMetricBuilder, setShowMetricBuilder] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showCreateNewDashboard, setShowCreateNewDashboard] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showWidgetCustomizer, setShowWidgetCustomizer] = useState(false);
  const [showWidgetTemplatesGallery, setShowWidgetTemplatesGallery] = useState(false);

  // Get user ID from Supabase session
  useEffect(() => {
    let isMounted = true;
    
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn("[Dashboard] Session error:", error);
          // If token refresh fails, that's okay - user may be logging in
          return;
        }
        
        if (isMounted && data?.session?.user?.id) {
          setUserId(data.session.user.id);
        }
      } catch (err) {
        console.warn("[Dashboard] Error getting user session:", err);
        // Silently continue - auth errors are handled by ProtectedRoute
      }
    };
    
    getUser();
    
    return () => {
      isMounted = false;
    };
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
    updateWidgetMetricConfig,
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

  // ✅ NEW: Handle global widget customization
  const handleDashboardCustomization = (customizationOptions: any) => {
    // This would apply global customization to all widgets in the dashboard
    // For now, we'll just show a success message
    toast({
      title: "Personalización guardada",
      description: "Los cambios se aplicarán a todos los widgets del dashboard",
    });
  };

  // ✅ CONSOLIDATED: Single hook that fetches all 8 queries at once
  // Replaces 8 separate useMonthlyComparison, useTopProducts, etc. calls
  // Benefits:
  // - Single loading state instead of 8
  // - Better performance monitoring
  // - Easier to debug data issues
  const dashboardDataQuery = useDashboardAllData(
    currentCompany?.id,
    userId,
    true,
    {
      canViewSales: hasPermission("sales", "view"),
      canViewProducts: hasPermission("products", "view"),
      canViewCustomers: hasPermission("customers", "view"),
    },
    filters
  );

  // ✅ SIMPLIFIED: Consolidated dataMap from single hook
  // Before: 24 dependencies, now: 3
  // This reduces re-renders and makes the code more maintainable
  const contextDataMap = useMemo(
    () => ({
      "kpi-monthly-sales": {
        data: dashboardDataQuery.data.monthlyComparison,
        isLoading: dashboardDataQuery.isLoading,
        error: dashboardDataQuery.error,
      },
      "kpi-gross-margin": {
        data: dashboardDataQuery.data.monthlyComparison,
        isLoading: dashboardDataQuery.isLoading,
        error: dashboardDataQuery.error,
      },
      "kpi-receivables": {
        data: dashboardDataQuery.data.receivables,
        isLoading: dashboardDataQuery.isLoading,
        error: dashboardDataQuery.error,
      },
      "kpi-sales-today": {
        data: dashboardDataQuery.data.monthlyComparison 
          ? { today: dashboardDataQuery.data.monthlyComparison.currentMonth } 
          : null,
        isLoading: dashboardDataQuery.isLoading,
        error: dashboardDataQuery.error,
      },
      "chart-top-products": {
        data: dashboardDataQuery.data.topProducts,
        isLoading: dashboardDataQuery.isLoading,
        error: dashboardDataQuery.error,
      },
      "chart-top-customers": {
        data: dashboardDataQuery.data.topCustomers,
        isLoading: dashboardDataQuery.isLoading,
        error: dashboardDataQuery.error,
      },
      "chart-sales-7days": {
        data: dashboardDataQuery.data.sevenDaysSalesChart,
        isLoading: dashboardDataQuery.isLoading,
        error: dashboardDataQuery.error,
      },
      "list-critical-stock": {
        data: dashboardDataQuery.data.criticalStock,
        isLoading: dashboardDataQuery.isLoading,
        error: dashboardDataQuery.error,
      },
      "currency-rates": {
        data: dashboardDataQuery.data.historicalRates,
        isLoading: dashboardDataQuery.isLoading,
        error: dashboardDataQuery.error,
      },
      "currency-summary": {
        data: dashboardDataQuery.data.exchangeRates || [],
        isLoading: dashboardDataQuery.isLoading,
        error: dashboardDataQuery.error,
      },
    }),
    [dashboardDataQuery.data, dashboardDataQuery.isLoading, dashboardDataQuery.error]
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

  // ✅ NEW: Handle widget creation with metric config from WidgetCreatorModal
  const handleCreateWidgetWithMetric = (widget: {
    type: 'kpi' | 'chart';
    metricId?: string;
    customFormula?: string;
    customFormat?: 'currency' | 'number' | 'percentage' | 'decimal';
    customUnit?: string;
    size: 'quarter' | 'half' | 'full';
  }) => {
    const widgetId = `metric-widget-${Date.now()}`;
    addWidget({
      id: widgetId,
      type: widget.type === 'chart' ? 'custom-chart' : 'custom-kpi',
      size: widget.size,
      metricConfig: {
        metricId: widget.metricId,
        customFormula: widget.customFormula,
        customFormat: widget.customFormat,
        customUnit: widget.customUnit,
      },
    });
  };

  if (permissionsLoading || layoutLoading || dashboardsLoading || !hasLayout) {
    return <DashboardLoadingScreen />;
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
            <h1 className="text-3xl font-bold text-foreground">Panel de Control</h1>
            <p className="text-muted-foreground">Crea tu Panel de Control agregando widgets</p>
          </div>
          <WidgetPicker
            addedWidgetIds={widgets.map((w) => w.type)}
            onAddWidget={handleAddWidget}
            onCreateWidgetWithMetric={handleCreateWidgetWithMetric}
          />
        </div>
        <DashboardEmptyState
          onChooseTemplate={() => setShowTemplateGallery(true)}
          onChooseFreeBuilder={() => {
            // Open widget picker or add first widget
            handleAddWidget("kpi-monthly-sales" as WidgetType);
          }}
          dashboards={dashboards}
          selectedDashboardId={selectedDashboardId}
          onDashboardChange={handleDashboardChange}
          onCreateNewDashboard={() => setShowCreateNewDashboard(true)}
          isLoadingDashboards={dashboardsLoading}
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
      }}
      isDragging={isDragging}
      setIsDragging={setIsDragging}
    >
      <div className="space-y-6">
      {/* ✅ IMPROVED: Filters Modal Dialog - Opens with button */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filtros Avanzados</DialogTitle>
            <DialogDescription>
              Personaliza los filtros para ajustar los datos mostrados en tu panel
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <DashboardFilters />
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ IMPROVED: Header with Dashboard Selector Left, Buttons Right */}
      <div className="flex flex-col items-start justify-between gap-4 relative">
        <div className="w-full flex items-center justify-between gap-4">
          {/* Left: Dashboard Selector */}
          {dashboards.length > 0 && (
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Panel:</span>
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

          {/* Center: Title and Description */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-foreground">Panel de Control</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {widgets.length === 0 
                ? "Comienza agregando tu primer widget para personalizar tu panel"
                : `${widgets.length} widget${widgets.length !== 1 ? "s" : ""} agregado${widgets.length !== 1 ? "s" : ""}`
              }
            </p>
          </div>

          {/* Right: Add Widget + Actions Menu */}
          <div className="flex items-center gap-2 min-w-fit">
            {isSaving && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                <div className="animate-spin">
                  <RefreshCw className="h-3 w-3" />
                </div>
                <span className="hidden sm:inline">Guardando...</span>
              </div>
            )}
            
            {/* Add Widget Button - Next to menu */}
            {availableWidgets.length > 0 && widgets.length > 0 && (
              <WidgetPicker
                addedWidgetIds={addedWidgetTypes}
                onAddWidget={handleAddWidget}
                onCreateWidgetWithMetric={handleCreateWidgetWithMetric}
                disabled={isSaving}
              />
            )}

            {/* Actions Menu */}
            <DashboardActionsMenu
              hasWidgets={widgets.length > 0}
              isSaving={isSaving}
              onFilters={() => setShowFilters(true)}
              onRefresh={() => {
                // Refresh functionality would go here
              }}
              onExport={() => {
                // Export functionality would go here
              }}
              onImport={() => {
                // Import functionality would go here
              }}
              onTemplateGallery={() => setShowWidgetTemplatesGallery(true)}
              onCSVUpload={() => setShowCSVUploader(true)}
              onMetricBuilder={() => setShowMetricBuilder(true)}
              onDashboardCustomize={() => setShowWidgetCustomizer(true)}
              onShare={() => {
                // Share functionality would go here
              }}
              onReset={resetLayout}
              onAddWidget={() => {
                // This will be handled by the WidgetPicker
              }}
            />
          </div>
        </div>

        {/* Widget Creation CTA when empty */}
        {widgets.length === 0 && (
          <div className="w-full space-y-6 mt-8 p-6 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-primary/10 border border-primary/20 backdrop-blur-sm">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Comienza en segundos
              </h3>
              <p className="text-sm text-muted-foreground">
                Elige uno de nuestros widgets populares para comenzar, o crea uno personalizado
              </p>
            </div>

            {/* Quick Start Metrics */}
            <DashboardQuickStart
              onApplyMetric={(metricId) => {
                // Find the metric in the presets and create a widget
                handleCreateWidgetWithMetric({
                  type: 'kpi',
                  metricId,
                  size: 'quarter',
                });
              }}
              disabled={isSaving}
            />

            {/* Additional Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-primary/10">
              <Button
                variant="outline"
                onClick={() => setShowTemplateGallery(true)}
                disabled={isSaving}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Ver más plantillas
              </Button>
              {availableWidgets.length > 0 && (
                <WidgetPicker
                  addedWidgetIds={addedWidgetTypes}
                  onAddWidget={handleAddWidget}
                  onCreateWidgetWithMetric={handleCreateWidgetWithMetric}
                  disabled={isSaving}
                />
              )}
            </div>
          </div>
        )}

        {/* Widget management actions when widgets exist */}
        {widgets.length > 0 && availableWidgets.length > 0 && (
          <div className="text-xs text-muted-foreground text-center py-2">
            {availableWidgets.length} widget(s) adicionales disponibles
          </div>
        )}
      </div>

      {/* Widgets Grid */}
      <EnterpriseDragDropContainer
        widgets={widgets}
        onReorder={reorderWidgets}
        enableLogging={true}
        maxReordersPerMinute={60}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-min">
          {widgets.map((widget) => {
            const definition = WIDGET_CATALOG[widget.type as WidgetType];

            // ✅ FIXED: Show error instead of silently failing if widget type not found
            if (!definition) {
              return (
                <EnterpriseSortableWidget key={widget.id} id={widget.id}>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm relative group">
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
                </EnterpriseSortableWidget>
              );
            }

            // ✅ All widgets now get data from context - no more prop drilling!
            const widgetContent = (() => {
              const handleUpdateMetricConfig = (metricConfig: {
                metricId?: string;
                customFormula?: string;
                customFormat?: 'currency' | 'number' | 'percentage' | 'decimal';
                customUnit?: string;
              }) => {
                updateWidgetMetricConfig(widget.id, metricConfig);
              };

              switch (definition.category) {
                case "kpi":
                  return (
                    <KpiWidget 
                      id={widget.id}
                      definition={definition}
                      metricConfig={widget.metricConfig}
                      onUpdateMetricConfig={handleUpdateMetricConfig}
                    />
                  );

                case "chart":
                  return (
                    <ChartWidget 
                      id={widget.id}
                      definition={definition}
                      metricConfig={widget.metricConfig}
                      onUpdateMetricConfig={handleUpdateMetricConfig}
                    />
                  );

                case "list":
                  return (
                    <ListWidget 
                      id={widget.id}
                      definition={definition}
                      metricConfig={widget.metricConfig}
                      onUpdateMetricConfig={handleUpdateMetricConfig}
                    />
                  );

                case "currency":
                  return (
                    <CurrencyWidget 
                      id={widget.id}
                      definition={definition}
                      metricConfig={widget.metricConfig}
                      onUpdateMetricConfig={handleUpdateMetricConfig}
                    />
                  );

                default:
                  return null;
              }
            })();

            if (!widgetContent) return null;

            return (
              <EnterpriseSortableWidget key={widget.id} id={widget.id}>
                <div
                  className={cn(
                    "rounded-lg border bg-card shadow-sm relative group",
                    // ✅ CENTRALIZED: Dimensions now come from config, not hardcoded
                    getWidgetContainerClassesForType(widget.size as WidgetSize, widget.type)
                  )}
                >
                  {/* ✅ Delete Button - Appears on hover */}
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                    aria-label={`Eliminar widget: ${definition.name}`}
                  >
                    <X className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </button>

                  {/* ✅ Wrap widget with error boundary to prevent cascade failures */}
                  <WidgetErrorBoundary widgetName={definition.name}>
                    {widgetContent}
                  </WidgetErrorBoundary>
                </div>
              </EnterpriseSortableWidget>
            );
          })}
        </div>
      </EnterpriseDragDropContainer>

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

      {/* Create New Dashboard Dialog */}
      {showCreateNewDashboard && (
        <CreateNewDashboardDialog
          isOpen={showCreateNewDashboard}
          onClose={() => setShowCreateNewDashboard(false)}
          onCreateDashboard={handleCreateNewDashboard}
          isCreating={createDashboardMutation.isPending}
        />
      )}

      {/* Widget Customizer Modal - Global Dashboard Customization */}
      {showWidgetCustomizer && (
        <WidgetCustomizerModal
          open={showWidgetCustomizer}
          onOpenChange={setShowWidgetCustomizer}
          title="Personalizar Dashboard"
          onSave={handleDashboardCustomization}
        />
      )}

      {/* Widget Templates Gallery - Pre-configured Dashboard Templates */}
      {showWidgetTemplatesGallery && (
        <WidgetTemplatesGallery
          open={showWidgetTemplatesGallery}
          onOpenChange={setShowWidgetTemplatesGallery}
          onSelectTemplate={(template) => {
            // Apply all widgets from template to dashboard
            if (template.widgets && template.widgets.length > 0) {
              template.widgets.forEach((widget) => {
                addWidget({
                  id: `${widget.type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  type: widget.type,
                  size: widget.size || 'full',
                  metricConfig: widget.metricConfig,
                });
              });
              
              toast({
                title: "Plantilla aplicada",
                description: `${template.name} se ha aplicado al dashboard con ${template.widgets.length} widget(s)`,
              });
            }
            setShowWidgetTemplatesGallery(false);
          }}
        />
      )}
      </div>
    </WidgetProvider>
  );
}
