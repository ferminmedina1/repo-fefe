// WidgetLibrary - Select and add widgets to dashboard

import React, { useState } from 'react';
import { DashboardWidget, WidgetType, WIDGET_TYPES } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, BarChart3, LineChart, PieChart, Table as TableIcon, Gauge, CalculatorIcon, MapPin } from 'lucide-react';

export interface WidgetLibraryProps {
  onSelectWidget: (widget: Omit<DashboardWidget, 'id'>) => void;
}

interface WidgetTemplate {
  type: WidgetType;
  name: string;
  description: string;
  icon: React.ReactNode;
  defaultConfig: Record<string, any>;
  defaultSize: { width: number; height: number };
}

const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    type: 'kpi',
    name: 'KPI Card',
    description: 'Display a single metric with value and trend',
    icon: <BarChart3 className="w-6 h-6" />,
    defaultConfig: {
      metric: 'Total Revenue',
      formula: 'SUM([revenue])',
      format: 'currency'
    },
    defaultSize: { width: 3, height: 2 }
  },
  {
    type: 'chart',
    name: 'Chart',
    description: 'Visualize data with line, bar, area, or pie charts',
    icon: <LineChart className="w-6 h-6" />,
    defaultConfig: {
      chartType: 'line',
      xAxis: 'date',
      yAxis: 'SUM([value])'
    },
    defaultSize: { width: 6, height: 4 }
  },
  {
    type: 'table',
    name: 'Table',
    description: 'Display data in tabular format with pagination',
    icon: <TableIcon className="w-6 h-6" />,
    defaultConfig: {
      columns: ['id', 'name', 'value'],
      rowsPerPage: 10
    },
    defaultSize: { width: 12, height: 5 }
  },
  {
    type: 'gauge',
    name: 'Gauge',
    description: 'Show progress or value within a range',
    icon: <Gauge className="w-6 h-6" />,
    defaultConfig: {
      formula: '[currentValue]',
      min: 0,
      max: 100
    },
    defaultSize: { width: 3, height: 2 }
  },
  {
    type: 'formula',
    name: 'Formula Display',
    description: 'Create custom calculations and display results',
    icon: <CalculatorIcon className="w-6 h-6" />,
    defaultConfig: {
      formula: '[field1] + [field2]',
      format: 'number'
    },
    defaultSize: { width: 4, height: 2 }
  },
  {
    type: 'number',
    name: 'Number',
    description: 'Display a single number value',
    icon: <BarChart3 className="w-6 h-6" />,
    defaultConfig: {
      value: 0,
      format: 'number'
    },
    defaultSize: { width: 2, height: 1 }
  },
  {
    type: 'map',
    name: 'Map',
    description: 'Display geographic data on an interactive map',
    icon: <MapPin className="w-6 h-6" />,
    defaultConfig: {
      latitude: 'latitude',
      longitude: 'longitude',
      zoom: 10
    },
    defaultSize: { width: 6, height: 5 }
  }
];

const WidgetLibrary: React.FC<WidgetLibraryProps> = ({ onSelectWidget }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null);
  const [widgetName, setWidgetName] = useState('');

  const handleSelectWidget = (template: WidgetTemplate) => {
    setSelectedTemplate(template);
    setWidgetName(`${template.name} - ${new Date().getTime().toString().slice(-4)}`);
  };

  const handleAddWidget = () => {
    if (!selectedTemplate || !widgetName.trim()) return;

    const newWidget: Omit<DashboardWidget, 'id'> = {
      name: widgetName,
      description: selectedTemplate.description,
      type: selectedTemplate.type,
      config: selectedTemplate.defaultConfig,
      position: { x: 0, y: 0 },
      size: selectedTemplate.defaultSize,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSelectWidget(newWidget);
    setSelectedTemplate(null);
    setWidgetName('');
  };

  if (selectedTemplate) {
    return (
      <div className="h-full flex flex-col p-4 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedTemplate(null)}
          className="self-start h-8 transition-all duration-200 hover:bg-gray-100 hover:scale-110 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex-1 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200/50">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg text-blue-600 transition-transform duration-300 hover:scale-110">
              {selectedTemplate.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{selectedTemplate.name}</h3>
              <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Widget Name</label>
              <Input
                value={widgetName}
                onChange={(e) => setWidgetName(e.target.value)}
                placeholder="Enter widget name"
                autoFocus
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Default Configuration</label>
              <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-200/50 max-h-40 overflow-auto">
                <pre className="text-xs font-mono text-gray-700">
                  {JSON.stringify(selectedTemplate.defaultConfig, null, 2)}
                </pre>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Default Size</label>
              <div className="grid grid-cols-2 gap-4 p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200/50">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Width: {selectedTemplate.defaultSize.width}/12</p>
                  <div className="h-2 bg-gray-300 rounded mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded transition-all duration-300"
                      style={{ width: `${(selectedTemplate.defaultSize.width / 12) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Height: {selectedTemplate.defaultSize.height}</p>
                  <div className="h-2 bg-gray-300 rounded mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded transition-all duration-300"
                      style={{ width: `${(selectedTemplate.defaultSize.height / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <Button
            onClick={handleAddWidget}
            disabled={!widgetName.trim()}
            className="flex-1 transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 text-white font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Widget
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Widget Library</h3>
        <p className="text-sm text-gray-600">Select a widget type to add to your dashboard</p>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {WIDGET_TEMPLATES.map((template) => (
          <Card
            key={template.type}
            className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
            onClick={() => handleSelectWidget(template)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded text-gray-600 flex-shrink-0">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WidgetLibrary;
