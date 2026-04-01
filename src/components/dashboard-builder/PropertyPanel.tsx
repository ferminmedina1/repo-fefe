// PropertyPanel - Edit selected widget properties

import React, { useState } from 'react';
import { DashboardWidget, WidgetType, WIDGET_TYPES } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartConfig } from '@/components/ui/chart';
import { Trash2, Copy } from 'lucide-react';

export interface PropertyPanelProps {
  widget: DashboardWidget;
  allWidgets: DashboardWidget[];
  onUpdate: (updates: Partial<DashboardWidget>) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  widget,
  allWidgets,
  onUpdate,
  onRemove,
  readOnly = false
}) => {
  const [editingName, setEditingName] = useState(widget.name);
  const [editingDescription, setEditingDescription] = useState(widget.description);

  const handleNameChange = (value: string) => {
    setEditingName(value);
    onUpdate({ name: value });
  };

  const handleDescriptionChange = (value: string) => {
    setEditingDescription(value);
    onUpdate({ description: value });
  };

  const handleTypeChange = (type: WidgetType) => {
    onUpdate({ type, config: {} });
  };

  const handleConfigChange = (key: string, value: any) => {
    onUpdate({
      config: {
        ...widget.config,
        [key]: value
      }
    });
  };

  const handlePositionChange = (key: 'x' | 'y', value: number) => {
    onUpdate({
      position: {
        ...widget.position,
        [key]: Math.max(0, value)
      }
    });
  };

  const handleSizeChange = (key: 'width' | 'height', value: number) => {
    onUpdate({
      size: {
        ...widget.size,
        [key]: Math.max(1, value)
      }
    });
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">Widget Name</label>
        <Input
          value={editingName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Enter widget name"
          disabled={readOnly}
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">Description</label>
        <Textarea
          value={editingDescription}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Enter widget description"
          disabled={readOnly}
          className="text-sm h-20"
        />
      </div>

      {/* Widget Type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">Type</label>
        <Select value={widget.type} onValueChange={handleTypeChange} disabled={readOnly}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WIDGET_TYPES.map(type => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4 mt-4">
          {widget.type === 'kpi' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Metric</label>
                <Input
                  value={widget.config?.metric || ''}
                  onChange={(e) => handleConfigChange('metric', e.target.value)}
                  placeholder="e.g., revenue, users, orders"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Formula</label>
                <Textarea
                  value={widget.config?.formula || ''}
                  onChange={(e) => handleConfigChange('formula', e.target.value)}
                  placeholder="e.g., SUM([revenue])"
                  disabled={readOnly}
                  className="font-mono text-xs h-24"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Format</label>
                <Select
                  value={widget.config?.format || 'number'}
                  onValueChange={(value) => handleConfigChange('format', value)}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="currency">Currency</SelectItem>
                    <SelectItem value="percent">Percent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {widget.type === 'chart' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Chart Type</label>
                <Select
                  value={widget.config?.chartType || 'line'}
                  onValueChange={(value) => handleConfigChange('chartType', value)}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="pie">Pie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">X Axis Field</label>
                <Input
                  value={widget.config?.xAxis || ''}
                  onChange={(e) => handleConfigChange('xAxis', e.target.value)}
                  placeholder="e.g., date, category"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Y Axis Formula</label>
                <Textarea
                  value={widget.config?.yAxis || ''}
                  onChange={(e) => handleConfigChange('yAxis', e.target.value)}
                  placeholder="e.g., SUM([value])"
                  disabled={readOnly}
                  className="font-mono text-xs h-20"
                />
              </div>
            </>
          )}

          {widget.type === 'table' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Columns</label>
                <Textarea
                  value={widget.config?.columns?.join('\n') || ''}
                  onChange={(e) => handleConfigChange('columns', e.target.value.split('\n'))}
                  placeholder="One column per line"
                  disabled={readOnly}
                  className="font-mono text-xs h-20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Rows Per Page</label>
                <Input
                  type="number"
                  value={widget.config?.rowsPerPage || 10}
                  onChange={(e) => handleConfigChange('rowsPerPage', parseInt(e.target.value))}
                  min="1"
                  disabled={readOnly}
                />
              </div>
            </>
          )}

          {widget.type === 'gauge' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Current Value Formula</label>
                <Textarea
                  value={widget.config?.formula || ''}
                  onChange={(e) => handleConfigChange('formula', e.target.value)}
                  placeholder="e.g., [currentValue]"
                  disabled={readOnly}
                  className="font-mono text-xs h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900">Min</label>
                  <Input
                    type="number"
                    value={widget.config?.min || 0}
                    onChange={(e) => handleConfigChange('min', parseFloat(e.target.value))}
                    disabled={readOnly}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900">Max</label>
                  <Input
                    type="number"
                    value={widget.config?.max || 100}
                    onChange={(e) => handleConfigChange('max', parseFloat(e.target.value))}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </>
          )}

          {widget.type === 'formula' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Formula Expression</label>
                <Textarea
                  value={widget.config?.formula || ''}
                  onChange={(e) => handleConfigChange('formula', e.target.value)}
                  placeholder="e.g., [revenue] - [costs]"
                  disabled={readOnly}
                  className="font-mono text-xs h-24"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Display Format</label>
                <Select
                  value={widget.config?.format || 'number'}
                  onValueChange={(value) => handleConfigChange('format', value)}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="currency">Currency</SelectItem>
                    <SelectItem value="percent">Percent</SelectItem>
                    <SelectItem value="decimal">Decimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">X Position</label>
              <Input
                type="number"
                value={widget.position?.x || 0}
                onChange={(e) => handlePositionChange('x', parseInt(e.target.value))}
                min="0"
                disabled={readOnly}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Y Position</label>
              <Input
                type="number"
                value={widget.position?.y || 0}
                onChange={(e) => handlePositionChange('y', parseInt(e.target.value))}
                min="0"
                disabled={readOnly}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Width (cols)</label>
              <Input
                type="number"
                value={widget.size?.width || 4}
                onChange={(e) => handleSizeChange('width', parseInt(e.target.value))}
                min="1"
                max="12"
                disabled={readOnly}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Height (rows)</label>
              <Input
                type="number"
                value={widget.size?.height || 3}
                onChange={(e) => handleSizeChange('height', parseInt(e.target.value))}
                min="1"
                disabled={readOnly}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      {!readOnly && (
        <div className="pt-4 border-t border-gray-200 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
};

export default PropertyPanel;
