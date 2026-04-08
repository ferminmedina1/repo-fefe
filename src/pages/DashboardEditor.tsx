// DashboardEditor - Page for editing dashboards with full UI

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import DashboardBuilder from '@/components/dashboard-builder/DashboardBuilder';
import DashboardViewer from '@/components/dashboard-widgets/DashboardViewer';
import { DashboardConfig, DashboardWidget } from '@/types/dashboard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Edit2 } from 'lucide-react';

export default function DashboardEditor() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'view' | 'edit'>('edit');

  // Fetch dashboard config
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: async () => {
      if (!dashboardId) throw new Error('Dashboard ID is required');

      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('id', dashboardId)
        .single();

      if (error) throw error;
      return data as DashboardConfig;
    },
    enabled: !!dashboardId
  });

  // Save dashboard
  const saveMutation = useMutation({
    mutationFn: async (config: DashboardConfig) => {
      const { error } = await supabase
        .from('dashboard_configs')
        .update({
          name: config.name,
          description: config.description,
          layout: config.layout,
          theme: config.theme,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;

      // Save widgets
      if (config.widgets.length > 0) {
        const { error: widgetError } = await supabase
          .from('dashboard_widgets')
          .upsert(
            config.widgets.map((w) => ({
              id: w.id,
              dashboard_id: config.id,
              name: w.name,
              description: w.description,
              type: w.type,
              config: w.config,
              position: w.position,
              size: w.size,
              created_at: w.created_at,
              updated_at: new Date().toISOString()
            })),
            { onConflict: 'id' }
          );

        if (widgetError) throw widgetError;
      }

      return config;
    },
    onSuccess: () => {
      setMode('view');
    }
  });

  // Mock data fetcher for widget display
  const dataFetcher = async (widget: DashboardWidget) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return sample data based on widget type
    switch (widget.type) {
      case 'chart':
        return [
          { date: '2026-01-01', value: 45000 },
          { date: '2026-01-02', value: 52000 },
          { date: '2026-01-03', value: 48000 },
          { date: '2026-01-04', value: 61000 },
          { date: '2026-01-05', value: 55000 }
        ];
      case 'table':
        return [
          { id: 1, name: 'John Doe', status: 'Active', revenue: '$45,000' },
          { id: 2, name: 'Jane Smith', status: 'Active', revenue: '$52,000' },
          { id: 3, name: 'Bob Johnson', status: 'Inactive', revenue: '$0' }
        ];
      case 'kpi':
      case 'number':
      case 'gauge':
      case 'formula':
      default:
        return { value: 125000, change: 12.5 };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 font-medium">Error al cargar el dashboard</p>
          <Button
            onClick={() => navigate('/dashboards')}
            variant="outline"
            className="mt-4"
          >
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mode Toggle */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'view' | 'edit')}>
          <TabsList className="bg-white border border-gray-200 shadow-lg">
            <TabsTrigger value="view" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Vista previa
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Editar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {mode === 'view' ? (
        <DashboardViewer
          config={dashboard}
          dataFetcher={dataFetcher}
          autoRefreshInterval={30000}
        />
      ) : (
        <DashboardBuilder
          dashboardId={dashboard.id}
          initialConfig={dashboard}
          onSave={(config) => saveMutation.mutateAsync(config)}
          onCancel={() => navigate('/dashboards')}
        />
      )}
    </div>
  );
}
