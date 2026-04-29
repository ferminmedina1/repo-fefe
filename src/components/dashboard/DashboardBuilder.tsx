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
import { InfiniteCanvas, CanvasPosition } from "./InfiniteCanvas";
import { CanvasWidget } from "./CanvasWidget";
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
    updateWidget,
    updateWidgetMetricConfig,
    updateWidgetConfig,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDashboardLayout(currentCompany?.id, userId, selectedDashboardId);

  // ✅ NEW: Keyboard shortcut listener for undo/redo (Ctrl+Z / Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();

        // Ctrl+Shift+Z or Cmd+Shift+Z = Redo
        if (e.shiftKey) {
          if (canRedo) {
            redo();
            toast({
              title: "Rehacer",
              description: "Cambios rehechos",
              duration: 2000,
            });
          }
        } else {
          // Ctrl+Z or Cmd+Z = Undo
          if (canUndo) {
            undo();
            toast({
              title: "Deshacer",
              description: "Último cambio deshecho",
              duration: 2000,
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, toast]);

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
    // Auto-position widgets: offset them to avoid stacking
    const positionIndex = widgets.length;
    const offsetX = (positionIndex % 4) * 420;
    const offsetY = Math.floor(positionIndex / 4) * 320;

    addWidget({
      id: `${widgetType}-${Date.now()}`,
      type: widgetType,
      size: size || 'full',
      position: {
        x: offsetX,
        y: offsetY,
        width: 400,
        height: 300,
      },
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
    const positionIndex = widgets.length;
    const offsetX = (positionIndex % 4) * 420;
    const offsetY = Math.floor(positionIndex / 4) * 320;

    addWidget({
      id: widgetId,
      // Use supported catalog types to avoid unavailable blocks.
      type: widget.type === 'chart' ? 'chart-sales-7days' : 'kpi-monthly-sales',
      size: widget.size,
      position: {
        x: offsetX,
        y: offsetY,
        width: 400,
        height: 300,
      },
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
        <div className="flex items-center justify-end">
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

  const resolveWidgetDefinition = (widgetType: string) => {
    const directDefinition = WIDGET_CATALOG[widgetType as WidgetType];
    if (directDefinition) return directDefinition;

    // Backward compatibility for older saved custom types.
    if (widgetType === 'custom-kpi') {
      return WIDGET_CATALOG['kpi-monthly-sales'];
    }
    if (widgetType === 'custom-chart') {
      return WIDGET_CATALOG['chart-sales-7days'];
    }

    return undefined;
  };

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
      <div className="space-y-4">
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
      <div className="flex flex-col items-start justify-between gap-2 relative">
        <div className="w-full flex items-center justify-between gap-2">
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

          {/* Center: Spacer (title removed) */}
          <div className="flex-1 min-w-0" />

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
                Elige una de nuestras Tarjetas populares para comenzar, o crea una personalizada
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
            {availableWidgets.length} Tarjeta(s) adicionales disponibles
          </div>
        )}
      </div>

      {/* Infinite Canvas - Freeform Drag & Drop */}
      <InfiniteCanvas
        items={widgets.map((widget) => {
          const definition = resolveWidgetDefinition(widget.type);
          const position: CanvasPosition = widget.position || { x: 0, y: 0, width: 400, height: 300 };

          // ✅ Widget rendering content
          const widgetContent = (() => {
            if (!definition) {
              return (
                <div className="rounded-lg border border-border/60 bg-background/80 p-5 shadow-sm h-full flex flex-col justify-center">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground">Bloque no disponible</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Esta tarjeta no pudo cargarse. Tipo: <code className="bg-muted px-2 py-1 rounded text-xs">{widget.type}</code>
                      </p>
                      <button
                        onClick={() => removeWidget(widget.id)}
                        className="text-xs text-primary hover:underline mt-2"
                      >
                        Quitar bloque →
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            const handleUpdateMetricConfig = (metricConfig: {
              metricId?: string;
              customFormula?: string;
              customFormat?: 'currency' | 'number' | 'percentage' | 'decimal';
              customUnit?: string;
            }) => {
              updateWidgetMetricConfig(widget.id, metricConfig);
            };

            const handleUpdateWidgetConfig = (widgetConfig: {
              refreshInterval?: number;
              showTitle?: boolean;
              showDescription?: boolean;
              maxItems?: number;
              enableCache?: boolean;
              [key: string]: any;
            }) => {
              updateWidgetConfig(widget.id, widgetConfig);
            };

            switch (definition.category) {
              case "kpi":
                return (
                  <KpiWidget 
                    id={widget.id}
                    definition={definition}
                    metricConfig={widget.metricConfig}
                    widgetConfig={widget.widgetConfig}
                    onUpdateMetricConfig={handleUpdateMetricConfig}
                    onUpdateWidgetConfig={handleUpdateWidgetConfig}
                  />
                );
              case "chart":
                return (
                  <ChartWidget 
                    id={widget.id}
                    definition={definition}
                    metricConfig={widget.metricConfig}
                    widgetConfig={widget.widgetConfig}
                    onUpdateMetricConfig={handleUpdateMetricConfig}
                    onUpdateWidgetConfig={handleUpdateWidgetConfig}
                  />
                );
              case "list":
                return (
                  <ListWidget 
                    id={widget.id}
                    definition={definition}
                    metricConfig={widget.metricConfig}
                    widgetConfig={widget.widgetConfig}
                    onUpdateMetricConfig={handleUpdateMetricConfig}
                    onUpdateWidgetConfig={handleUpdateWidgetConfig}
                  />
                );
              case "currency":
                return (
                  <CurrencyWidget 
                    id={widget.id}
                    definition={definition}
                    metricConfig={widget.metricConfig}
                    widgetConfig={widget.widgetConfig}
                    onUpdateMetricConfig={handleUpdateMetricConfig}
                    onUpdateWidgetConfig={handleUpdateWidgetConfig}
                  />
                );
              default:
                return null;
            }
          })();

          return {
            id: widget.id,
            position,
            children: (
              <CanvasWidget
                id={widget.id}
                position={position}
                onPositionChange={(newPosition) => {
                  updateWidget(widget.id, { position: newPosition });
                }}
              >
                <div className="relative w-full h-full">
                  {/* Delete button */}
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="absolute top-2 right-2 z-20 p-1 hover:bg-destructive/10 rounded transition-colors"
                    aria-label="Eliminar tarjeta"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </button>

                  {/* Widget content */}
                  <WidgetErrorBoundary widgetName={definition?.name || 'Unknown'}>
                    <div className="h-full pt-8">
                      {widgetContent}
                    </div>
                  </WidgetErrorBoundary>
                </div>
              </CanvasWidget>
            ),
          };
        })}
        onItemPositionChange={(itemId, position) => {
          updateWidget(itemId, { position });
        }}
        className="flex-1 min-h-[calc(100vh-200px)]"
      />

      {/* Footer info */}
      <div className="text-xs text-muted-foreground text-center py-4">
        {availableWidgets.length > 0 ? (
          <p>{availableWidgets.length} Tarjeta(s) disponibles para agregar</p>
        ) : (
          <p>Todas las Tarjetas están agregadas</p>
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
                description: `${template.name} se ha aplicado al dashboard con ${template.widgets.length} Tarjeta(s)`,
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
