// DashboardViewer - Display a read-only dashboard with live data

import React, { useState, useCallback, useEffect } from 'react';
import { DashboardConfig, DashboardWidget } from '@/types/dashboard';
import WidgetRenderer from './WidgetRenderer';
import { RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DashboardViewerProps {
  config: DashboardConfig;
  dataFetcher?: (widget: DashboardWidget) => Promise<Record<string, any>>;
  onEditClick?: () => void;
  autoRefreshInterval?: number; // milliseconds, 0 = no auto refresh
}

interface WidgetState {
  data?: Record<string, any>;
  isLoading: boolean;
  error?: Error;
  lastFetch?: Date;
}

const DashboardViewer: React.FC<DashboardViewerProps> = ({
  config,
  dataFetcher,
  onEditClick,
  autoRefreshInterval = 0
}) => {
  const [widgetsState, setWidgetsState] = useState<Map<string, WidgetState>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch data for a widget
  const fetchWidgetData = useCallback(
    async (widget: DashboardWidget) => {
      if (!dataFetcher) {
        return {};
      }

      try {
        setWidgetsState(prev => new Map(prev).set(widget.id, {
          ...(prev.get(widget.id) || {}),
          isLoading: true,
          error: undefined
        }));

        const data = await dataFetcher(widget);

        setWidgetsState(prev => new Map(prev).set(widget.id, {
          data,
          isLoading: false,
          error: undefined,
          lastFetch: new Date()
        }));
      } catch (error) {
        setWidgetsState(prev => new Map(prev).set(widget.id, {
          ...(prev.get(widget.id) || {}),
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error))
        }));
      }
    },
    [dataFetcher]
  );

  // Refresh all widgets
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all(config.widgets.map(widget => fetchWidgetData(widget)));
    } finally {
      setIsRefreshing(false);
    }
  }, [config.widgets, fetchWidgetData]);

  // Initial fetch
  useEffect(() => {
    refreshAll();
  }, [config.id]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      refreshAll();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, refreshAll]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{config.name}</h1>
              {config.description && (
                <p className="text-gray-600 mt-1">{config.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {widgetsState.size > 0
                  ? `Last updated: ${widgetsState.get(config.widgets[0]?.id)?.lastFetch
                    ?.toLocaleTimeString() || 'never'}`
                  : ''}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={refreshAll}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              {onEditClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditClick}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div
        className="max-w-7xl mx-auto p-4"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${config.layout.columns}, minmax(0, 1fr))`,
          gap: `${config.layout.gap}px`,
          padding: `${config.layout.padding}px`
        }}
      >
        {config.widgets.length === 0 ? (
          <div className="col-span-full flex items-center justify-center h-96 text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Empty Dashboard</p>
              <p className="text-sm">No widgets have been added yet</p>
            </div>
          </div>
        ) : (
          config.widgets.map(widget => {
            const widgetState = widgetsState.get(widget.id) || {
              data: {},
              isLoading: false
            };

            return (
              <div
                key={widget.id}
                style={{
                  gridColumn: `span ${widget.size?.width || 4}`,
                  gridRow: `span ${widget.size?.height || 3}`,
                  minHeight: '200px'
                }}
              >
                <WidgetRenderer
                  widget={widget}
                  data={widgetState.data}
                  isLoading={widgetState.isLoading}
                  error={widgetState.error}
                  onRefresh={() => fetchWidgetData(widget)}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="max-w-7xl mx-auto p-4 mt-8 text-xs text-gray-600 bg-gray-100 rounded p-4">
          <details>
            <summary className="cursor-pointer font-medium">Dashboard Debug Info</summary>
            <pre className="mt-2 overflow-auto max-h-40 bg-white p-2 rounded">
              {JSON.stringify(
                {
                  config: {
                    id: config.id,
                    name: config.name,
                    widgets_count: config.widgets.length,
                    layout: config.layout
                  },
                  widgets: config.widgets.map(w => ({
                    id: w.id,
                    name: w.name,
                    type: w.type
                  }))
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default DashboardViewer;
