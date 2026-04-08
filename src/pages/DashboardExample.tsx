// DashboardExample - Example page showing how to use the dashboard system

import React, { useState } from 'react';
import { DashboardConfig, DashboardWidget } from '@/types/dashboard';
import DashboardBuilder from '@/components/dashboard-builder/DashboardBuilder';
import DashboardViewer from '@/components/dashboard-widgets/DashboardViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

// Sample data for testing
const SAMPLE_DATA = {
  revenue: [
    { date: '2026-01-01', value: 45000, category: 'Sales' },
    { date: '2026-01-02', value: 52000, category: 'Sales' },
    { date: '2026-01-03', value: 48000, category: 'Sales' },
    { date: '2026-01-04', value: 61000, category: 'Sales' },
    { date: '2026-01-05', value: 55000, category: 'Sales' }
  ],
  users: [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', created_at: '2026-01-01' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active', created_at: '2026-01-02' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive', created_at: '2026-01-03' }
  ],
  locations: [
    { latitude: 40.7128, longitude: -74.0060, label: 'NYC', value: 15000 },
    { latitude: 34.0522, longitude: -118.2437, label: 'LA', value: 12000 },
    { latitude: 41.8781, longitude: -87.6298, label: 'Chicago', value: 10000 }
  ],
  currentMetrics: {
    totalRevenue: 261000,
    activeUsers: 45,
    conversionRate: 0.35,
    progress: 72
  }
};

const EXAMPLE_DASHBOARD: DashboardConfig = {
  id: 'example-dashboard-001',
  name: 'Sales Dashboard',
  description: 'Real-time sales and performance metrics',
  company_id: 'example-company',
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
  widgets: [
    {
      id: 'widget-1',
      name: 'Total Revenue',
      description: 'Sum of all sales',
      type: 'kpi',
      config: {
        metric: 'Sales',
        formula: '[totalRevenue]',
        format: 'currency'
      },
      position: { x: 0, y: 0 },
      size: { width: 3, height: 2 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'widget-2',
      name: 'Active Users',
      description: 'Number of active users',
      type: 'kpi',
      config: {
        metric: 'Users',
        formula: '[activeUsers]',
        format: 'number'
      },
      position: { x: 3, y: 0 },
      size: { width: 3, height: 2 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'widget-3',
      name: 'Conversion Rate',
      description: 'Current conversion percentage',
      type: 'gauge',
      config: {
        formula: '[conversionRate]',
        min: 0,
        max: 1
      },
      position: { x: 6, y: 0 },
      size: { width: 3, height: 2 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'widget-4',
      name: 'Progress',
      description: 'Current progress towards goal',
      type: 'number',
      config: {
        value: 72,
        format: 'number'
      },
      position: { x: 9, y: 0 },
      size: { width: 3, height: 2 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'widget-5',
      name: 'Revenue Trend',
      description: 'Daily revenue over time',
      type: 'chart',
      config: {
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'value'
      },
      position: { x: 0, y: 2 },
      size: { width: 6, height: 4 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'widget-6',
      name: 'Users List',
      description: 'All registered users',
      type: 'table',
      config: {
        columns: ['name', 'email', 'status', 'created_at'],
        rowsPerPage: 10
      },
      position: { x: 6, y: 2 },
      size: { width: 6, height: 4 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'widget-7',
      name: 'Locations Map',
      description: 'Regional sales distribution',
      type: 'map',
      config: {
        latitude: 'latitude',
        longitude: 'longitude',
        zoom: 4
      },
      position: { x: 0, y: 6 },
      size: { width: 6, height: 4 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'widget-8',
      name: 'Total vs Active',
      description: 'Comparison of metrics',
      type: 'formula',
      config: {
        formula: '[totalRevenue] / [activeUsers]',
        format: 'currency'
      },
      position: { x: 6, y: 6 },
      size: { width: 6, height: 4 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  version: 1
};

const DashboardExample: React.FC = () => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [dashboard, setDashboard] = useState<DashboardConfig>(EXAMPLE_DASHBOARD);

  // Mock data fetcher - in production would fetch from API
  const dataFetcher = async (widget: DashboardWidget) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return appropriate data based on widget type
    switch (widget.type) {
      case 'chart':
        return SAMPLE_DATA.revenue;
      case 'table':
        return SAMPLE_DATA.users;
      case 'map':
        return SAMPLE_DATA.locations;
      case 'kpi':
      case 'gauge':
      case 'formula':
      case 'number':
      default:
        return SAMPLE_DATA.currentMetrics;
    }
  };

  const handleSave = async (updatedConfig: DashboardConfig) => {
    // In production, would save to API
    console.log('Saving dashboard:', updatedConfig);
    setDashboard(updatedConfig);
    setMode('view');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {mode === 'view' ? (
        <>
          {/* View Mode */}
          <DashboardViewer
            config={dashboard}
            dataFetcher={dataFetcher}
            onEditClick={() => setMode('edit')}
            autoRefreshInterval={30000} // Refresh every 30 seconds
          />
        </>
      ) : (
        <>
          {/* Edit Mode */}
          <DashboardBuilder
            dashboardId={dashboard.id}
            initialConfig={dashboard}
            onSave={handleSave}
            onCancel={() => setMode('view')}
          />
        </>
      )}
    </div>
  );
};

export default DashboardExample;
