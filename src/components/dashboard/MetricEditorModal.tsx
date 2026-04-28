/**
 * METRIC EDITOR MODAL
 * ==================
 * Modal para editar la métrica de un widget
 * ✅ Cambiar métrica preset
 * ✅ Cambiar fórmula
 * ✅ Cambiar formato (currency, percentage, etc.)
 * ✅ Cambiar unidad
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import {
  MetricPreset,
  getAllMetricPresets,
  getMetricsByCategory,
  searchMetricPresets,
  METRICS_BY_CATEGORY,
} from '@/lib/dashboard/metricPresets';

export interface WidgetMetricConfig {
  metricId?: string;
  metricPreset?: MetricPreset;
  customFormula?: string;
  customFormat?: 'currency' | 'number' | 'percentage' | 'decimal';
  customUnit?: string;
}

interface MetricEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig: WidgetMetricConfig;
  onSave: (config: WidgetMetricConfig) => void;
}

type EditMode = 'preset' | 'custom';

export function MetricEditorModal({
  open,
  onOpenChange,
  currentConfig,
  onSave,
}: MetricEditorModalProps) {
  const [mode, setMode] = useState<EditMode>(currentConfig.customFormula ? 'custom' : 'preset');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'sales' | 'inventory' | 'customers' | 'finance' | 'products'
  >('all');
  const [selectedPreset, setSelectedPreset] = useState<MetricPreset | null>(
    currentConfig.metricPreset || null
  );

  // Custom mode state
  const [customFormula, setCustomFormula] = useState(currentConfig.customFormula || '');
  const [customFormat, setCustomFormat] = useState<'currency' | 'number' | 'percentage' | 'decimal'>(
    currentConfig.customFormat || 'number'
  );
  const [customUnit, setCustomUnit] = useState(currentConfig.customUnit || 'ARS');

  const getFilteredPresets = () => {
    if (selectedCategory === 'all') {
      return search ? searchMetricPresets(search) : getAllMetricPresets();
    }
    const categoryPresets = METRICS_BY_CATEGORY[selectedCategory];
    if (!search) return categoryPresets;
    return categoryPresets.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    );
  };

  const handleSave = () => {
    if (mode === 'preset' && !selectedPreset) {
      alert('Selecciona una métrica');
      return;
    }

    if (mode === 'custom' && !customFormula.trim()) {
      alert('Ingresa una fórmula');
      return;
    }

    if (mode === 'preset') {
      onSave({
        metricId: selectedPreset!.id,
        metricPreset: selectedPreset!,
        customFormula: undefined,
        customFormat: undefined,
        customUnit: undefined,
      });
    } else {
      onSave({
        metricId: undefined,
        metricPreset: undefined,
        customFormula,
        customFormat,
        customUnit,
      });
    }

    onOpenChange(false);
  };

  const filteredPresets = getFilteredPresets();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Métrica del Widget</DialogTitle>
          <DialogDescription>
            Cambia la métrica, formato o unidad del widget
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as EditMode)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preset">Métrica Pre-hecha</TabsTrigger>
            <TabsTrigger value="custom">Personalizada</TabsTrigger>
          </TabsList>

          {/* PRESET MODE */}
          <TabsContent value="preset" className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar métrica..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {(
                [
                  { id: 'all', label: 'Todas' },
                  { id: 'sales', label: 'Ventas' },
                  { id: 'inventory', label: 'Inventario' },
                  { id: 'customers', label: 'Clientes' },
                  { id: 'finance', label: 'Finanzas' },
                  { id: 'products', label: 'Productos' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Presets Grid */}
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 gap-3 pr-4">
                {filteredPresets.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    <p className="text-sm">No se encontraron métricas</p>
                  </div>
                ) : (
                  filteredPresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset)}
                      className={`p-4 rounded-lg border-2 text-left transition-all group ${
                        selectedPreset?.id === preset.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className={`p-2 rounded-md bg-${preset.color}-500/10`}>
                          <preset.icon className={`h-5 w-5 text-${preset.color}-600`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-slate-900">
                            {preset.name}
                          </h4>
                          <p className="text-xs text-slate-600 line-clamp-1">
                            {preset.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {preset.format || 'number'}
                        </Badge>
                        {preset.unit && (
                          <span className="text-xs text-slate-500">{preset.unit}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* CUSTOM MODE */}
          <TabsContent value="custom" className="flex-1 flex flex-col gap-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Formula Input */}
              <div>
                <Label className="text-sm font-semibold">Fórmula</Label>
                <Input
                  placeholder="SUM(sales.amount) WHERE DATE = TODAY()"
                  value={customFormula}
                  onChange={(e) => setCustomFormula(e.target.value)}
                  className="mt-2 font-mono text-xs"
                />
                <p className="text-xs text-slate-500 mt-2">
                  💡 Usa [field] para referenciar campos de la tabla
                </p>
              </div>

              {/* Format */}
              <div>
                <Label className="text-sm font-semibold">Formato</Label>
                <Select value={customFormat} onValueChange={(v) => setCustomFormat(v as 'currency' | 'number' | 'percentage' | 'decimal')}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="currency">Moneda</SelectItem>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="decimal">Decimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Unit */}
              {(customFormat === 'currency' || customFormat === 'decimal') && (
                <div>
                  <Label className="text-sm font-semibold">Unidad</Label>
                  <Select value={customUnit} onValueChange={setCustomUnit}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS ($)</SelectItem>
                      <SelectItem value="USD">USD (US$)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="BRL">BRL (R$)</SelectItem>
                      <SelectItem value="CLP">CLP (CH$)</SelectItem>
                      <SelectItem value="UYU">UYU (U$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4">
                  <p className="text-xs text-amber-900">
                    <strong>Ejemplo:</strong> SUM(sales.amount) calcula el total, AVG(sales.amount)
                    el promedio, COUNT(sales.id) cuenta registros
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Guardar Cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MetricEditorModal;
