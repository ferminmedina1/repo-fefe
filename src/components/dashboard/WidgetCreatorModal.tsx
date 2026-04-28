/**
 * WIDGET CREATOR MODAL
 * ============================
 * ✅ Easy widget creation with:
 *   1. Preset metrics selection (quick start)
 *   2. Custom widget builder (advanced)
 *   3. Live preview
 *   4. One-click add to dashboard
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Sparkles } from 'lucide-react';
import {
  MetricPreset,
  getAllMetricPresets,
  getMetricsByCategory,
  searchMetricPresets,
  METRICS_BY_CATEGORY,
} from '@/lib/dashboard/metricPresets';
import { WIDGET_CATALOG, WidgetType } from '@/lib/dashboard/widgets';
import { cn } from '@/lib/utils';

interface WidgetCreatorModalProps {
  onCreateWidget: (widget: {
    name: string;
    type: 'kpi' | 'chart';
    metricId?: string;
    metricPreset?: MetricPreset;
    size: 'quarter' | 'half' | 'full';
  }) => void;
}

type CreationMode = 'preset' | 'custom';

export function WidgetCreatorModal({ onCreateWidget }: WidgetCreatorModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CreationMode>('preset');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'sales' | 'inventory' | 'customers' | 'finance' | 'products'>('all');
  const [selectedPreset, setSelectedPreset] = useState<MetricPreset | null>(null);
  const [widgetName, setWidgetName] = useState('');
  const [widgetSize, setWidgetSize] = useState<'quarter' | 'half' | 'full'>('half');
  const [widgetType, setWidgetType] = useState<'kpi' | 'chart'>('kpi');

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

  const handleCreateFromPreset = (preset: MetricPreset) => {
    setSelectedPreset(preset);
    setWidgetName(preset.name);
    setWidgetType(preset.defaultChartType ? 'chart' : 'kpi');
  };

  const handleConfirmCreation = () => {
    const name = selectedPreset ? selectedPreset.name : widgetName;
    
    if (!name.trim()) {
      alert('Por favor, ingresa un nombre para el widget');
      return;
    }

    onCreateWidget({
      name,
      type: widgetType,
      metricId: selectedPreset?.id,
      metricPreset: selectedPreset || undefined,
      size: widgetSize,
    });

    // Reset and close
    setOpen(false);
    setSelectedPreset(null);
    setWidgetName('');
    setSearch('');
    setSelectedCategory('all');
    setMode('preset');
  };

  const filteredPresets = getFilteredPresets();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
          <Plus className="h-4 w-4" />
          Crear Widget
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Crear Nuevo Widget
          </DialogTitle>
          <DialogDescription>
            {selectedPreset
              ? `Configurar: ${selectedPreset.name}`
              : 'Selecciona una métrica pre-hecha o crea una personalizada'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as CreationMode)} className="flex-1 flex flex-col">
          {/* TAB: Quick Presets */}
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preset" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Métricas Pre-hechas
            </TabsTrigger>
            <TabsTrigger value="custom">Personalizado</TabsTrigger>
          </TabsList>

          {/* PRESET MODE */}
          <TabsContent value="preset" className="flex-1 flex flex-col gap-4 min-h-0">
            {!selectedPreset ? (
              <>
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

                {/* Category Tabs */}
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
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                        selectedCategory === cat.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Presets Grid */}
                <ScrollArea className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                    {filteredPresets.length === 0 ? (
                      <div className="col-span-full py-8 text-center text-slate-500">
                        <p className="text-sm">No se encontraron métricas</p>
                      </div>
                    ) : (
                      filteredPresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleCreateFromPreset(preset)}
                          className="p-4 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <div className={cn('p-2 rounded-md', `bg-${preset.color}-500/10`)}>
                              <preset.icon className={cn('h-5 w-5', `text-${preset.color}-600`)} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600">
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
              </>
            ) : (
              // Preview after selecting preset
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                {/* Preset Preview Card */}
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn('p-3 rounded-lg', `bg-${selectedPreset.color}-500/20`)}>
                          <selectedPreset.icon className={cn('h-6 w-6', `text-${selectedPreset.color}-600`)} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{selectedPreset.name}</CardTitle>
                          <CardDescription>{selectedPreset.description}</CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPreset(null)}
                      >
                        Cambiar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Formato</p>
                        <p className="font-semibold text-slate-900">{selectedPreset.format || 'number'}</p>
                      </div>
                      {selectedPreset.unit && (
                        <div>
                          <p className="text-slate-600">Unidad</p>
                          <p className="font-semibold text-slate-900">{selectedPreset.unit}</p>
                        </div>
                      )}
                      {selectedPreset.trend?.enabled && (
                        <div>
                          <p className="text-slate-600">Tendencia</p>
                          <p className="font-semibold text-slate-900 capitalize">
                            {selectedPreset.trend.period}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Widget Configuration */}
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {/* Widget Size */}
                  <div>
                    <label className="text-sm font-semibold text-slate-900 block mb-2">
                      Tamaño del Widget
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'quarter', label: '25%' },
                          { id: 'half', label: '50%' },
                          { id: 'full', label: '100%' },
                        ] as const
                      ).map((size) => (
                        <button
                          key={size.id}
                          onClick={() => setWidgetSize(size.id)}
                          className={cn(
                            'py-2 px-3 rounded-lg text-sm font-medium transition-all',
                            widgetSize === size.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          )}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Widget Type */}
                  {selectedPreset.defaultChartType && (
                    <div>
                      <label className="text-sm font-semibold text-slate-900 block mb-2">
                        Tipo de Visualización
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setWidgetType('kpi')}
                          className={cn(
                            'py-2 px-3 rounded-lg text-sm font-medium transition-all',
                            widgetType === 'kpi'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          )}
                        >
                          KPI
                        </button>
                        <button
                          onClick={() => setWidgetType('chart')}
                          className={cn(
                            'py-2 px-3 rounded-lg text-sm font-medium transition-all',
                            widgetType === 'chart'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          )}
                        >
                          Gráfico
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* CUSTOM MODE */}
          <TabsContent value="custom" className="flex-1 flex flex-col gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">
                  Nombre del Widget
                </label>
                <Input
                  placeholder="Mi Widget Personalizado"
                  value={widgetName}
                  onChange={(e) => setWidgetName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">
                  Tipo de Widget
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'kpi', label: 'KPI - Métrica Simple' },
                      { id: 'chart', label: 'Gráfico - Visualización' },
                    ] as const
                  ).map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setWidgetType(type.id)}
                      className={cn(
                        'py-3 px-4 rounded-lg text-sm font-medium transition-all text-left',
                        widgetType === type.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      <div className="font-semibold">{type.label.split(' - ')[0]}</div>
                      <div className="text-xs opacity-75">{type.label.split(' - ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">
                  Tamaño del Widget
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'quarter', label: '25%' },
                      { id: 'half', label: '50%' },
                      { id: 'full', label: '100%' },
                    ] as const
                  ).map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setWidgetSize(size.id)}
                      className={cn(
                        'py-2 px-3 rounded-lg text-sm font-medium transition-all',
                        widgetSize === size.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-900">
                  💡 <strong>Tip:</strong> Después de crear el widget, podrás configurar la fórmula,
                  fuente de datos y más desde el panel de propiedades.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmCreation}
            disabled={!widgetName.trim() && !selectedPreset}
            className="flex-1 gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar Widget
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WidgetCreatorModal;
