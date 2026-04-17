// DashboardExampleBuilder - Simple dashboard builder example without DB dependency

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardBuilder from '@/components/dashboard-builder/DashboardBuilder';
import DashboardViewer from '@/components/dashboard-widgets/DashboardViewer';
import { DashboardConfig, DashboardWidget } from '@/types/dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit2 } from 'lucide-react';

// Sample dashboard configuration
const EXAMPLE_DASHBOARD: DashboardConfig = {
  id: 'dashboard-demo',
  name: 'Demo Dashboard',
  description: 'Interactive dashboard builder example with widgets and animations',
  company_id: 'company-demo',
  widgets: [
    {
      id: 'widget-kpi-1',
      name: 'Total Revenue',
      description: 'Monthly revenue overview',
      type: 'kpi',
      config: {
        metric: 'revenue',
        format: 'currency'
      },
      position: { x: 0, y: 0 },
      size: { width: 3, height: 4 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'widget-chart-1',
      name: 'Revenue Trend',
      description: 'Revenue over time',
      type: 'chart',
      config: {
        chartType: 'line',
        xField: 'date',
        yField: 'value'
      },
      position: { x: 3, y: 0 },
      size: { width: 6, height: 4 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'widget-number-1',
      name: 'Total Sales',
      description: 'Total sales count',
      type: 'number',
      config: {
        value: 1250,
        format: 'number'
      },
      position: { x: 9, y: 0 },
      size: { width: 3, height: 4 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  layout: {
    columns: 12,
    gap: 4,
    padding: 4
  },
  theme: {
    primary: '#3b82f6',
    accent: '#10b981',
    background: '#f9fafb',
    border: '#e5e7eb'
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  version: 1
};

export default function DashboardExampleBuilder() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'view' | 'edit'>('edit');
  const [dashboard, setDashboard] = useState<DashboardConfig>(EXAMPLE_DASHBOARD);

  // Mock data fetcher
  const dataFetcher = async (widget: DashboardWidget) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

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
      default:
        return { value: 125000, change: 12.5 };
    }
  };

  const handleSave = async (config: DashboardConfig) => {
    console.log('Dashboard saved:', config);
    setDashboard(config);
    setMode('view');
  };

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
          onSave={handleSave}
          onCancel={() => navigate('/app')}
        />
      )}
    </div>
  );
}
