/**
 * WIDGET CUSTOMIZER MODAL
 * =======================
 * Advanced customization options for widgets
 * Colors, themes, display formats, and more
 */

import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  WidgetCustomizationOptions,
  COLOR_PALETTES,
  ColorScheme,
  DisplayFormat,
  Aggregation,
  ChartType,
  DEFAULT_CUSTOMIZATION,
  mergeCustomizationOptions,
  getColorFromPalette,
} from "@/lib/dashboard/widgetCustomizer";
import { Palette, Type, Zap, Eye, Settings } from "lucide-react";

interface WidgetCustomizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  currentOptions?: Partial<WidgetCustomizationOptions>;
  onSave: (options: WidgetCustomizationOptions) => void;
}

export function WidgetCustomizerModal({
  open,
  onOpenChange,
  title = "Personalizar Widget",
  currentOptions = {},
  onSave,
}: WidgetCustomizerModalProps) {
  const [options, setOptions] = useState<WidgetCustomizationOptions>(
    mergeCustomizationOptions(currentOptions)
  );

  const handleSave = useCallback(() => {
    onSave(options);
    onOpenChange(false);
  }, [options, onSave, onOpenChange]);

  const handleReset = useCallback(() => {
    setOptions(mergeCustomizationOptions(currentOptions));
  }, [currentOptions]);

  const colorSchemes = useMemo<ColorScheme[]>(
    () => ["default", "vibrant", "pastel", "grayscale", "professional"],
    []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Personaliza la apariencia y comportamiento del widget
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Apariencia</span>
              <span className="sm:hidden">Apariencia</span>
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-2">
              <Eye className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Visualización</span>
              <span className="sm:hidden">Visualización</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
              <Zap className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Datos</span>
              <span className="sm:hidden">Datos</span>
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-2">
              <Zap className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Gráfico</span>
              <span className="sm:hidden">Gráfico</span>
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <span className="hidden sm:inline">Avanzado</span>
              <span className="sm:hidden">Avanzado</span>
            </TabsTrigger>
          </TabsList>

          {/* APPEARANCE TAB */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Esquema de Color</Label>
              <div className="grid grid-cols-2 gap-2">
                {colorSchemes.map((scheme) => {
                  const palette = COLOR_PALETTES[scheme];
                  return (
                    <button
                      key={scheme}
                      onClick={() => setOptions({ ...options, colorScheme: scheme })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        options.colorScheme === scheme
                          ? "border-primary"
                          : "border-border"
                      }`}
                    >
                      <div className="flex gap-1 mb-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: palette.primary }}
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: palette.secondary }}
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: palette.accent }}
                        />
                      </div>
                      <span className="text-xs font-medium capitalize">{scheme}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                Color Personalizado
                <Checkbox
                  checked={!!options.customColor}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      customColor: checked ? "#3b82f6" : undefined,
                    })
                  }
                />
              </Label>
              {options.customColor && (
                <Input
                  type="color"
                  value={options.customColor}
                  onChange={(e) =>
                    setOptions({ ...options, customColor: e.target.value })
                  }
                  className="h-10"
                />
              )}
            </div>

            {/* Border Radius */}
            <div className="space-y-3">
              <Label>Esquinas Redondeadas</Label>
              <Select 
                value={options.borderRadius} 
                onValueChange={(value: typeof options.borderRadius) =>
                  setOptions({ ...options, borderRadius: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin redondeo</SelectItem>
                  <SelectItem value="small">Pequeño</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shadow */}
            <div className="space-y-3">
              <Label>Sombra</Label>
              <Select 
                value={options.shadow} 
                onValueChange={(value: typeof options.shadow) =>
                  setOptions({ ...options, shadow: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin sombra</SelectItem>
                  <SelectItem value="small">Pequeña</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* DISPLAY TAB */}
          <TabsContent value="display" className="space-y-4 mt-4">
            {/* Display Format */}
            <div className="space-y-3">
              <Label>Formato de Visualización</Label>
              <Select 
                value={options.displayFormat} 
                onValueChange={(value: DisplayFormat) =>
                  setOptions({ ...options, displayFormat: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="currency">Moneda</SelectItem>
                  <SelectItem value="percentage">Porcentaje</SelectItem>
                  <SelectItem value="decimal">Decimal</SelectItem>
                  <SelectItem value="duration">Duración</SelectItem>
                  <SelectItem value="ratio">Ratio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Decimals */}
            <div className="space-y-3">
              <Label>Decimales: {options.decimals}</Label>
              <Slider
                value={[options.decimals ?? 2]}
                onValueChange={(value) =>
                  setOptions({ ...options, decimals: value[0] })
                }
                min={0}
                max={4}
                step={1}
              />
            </div>

            {/* Font Size */}
            <div className="space-y-3">
              <Label>Tamaño de Fuente</Label>
              <Select 
                value={options.fontSize} 
                onValueChange={(value: typeof options.fontSize) =>
                  setOptions({ ...options, fontSize: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeño</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Weight */}
            <div className="space-y-3">
              <Label>Peso de Fuente</Label>
              <Select 
                value={options.fontWeight} 
                onValueChange={(value: typeof options.fontWeight) =>
                  setOptions({ ...options, fontWeight: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="semibold">Semi-Bold</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Density */}
            <div className="space-y-3">
              <Label>Densidad</Label>
              <Select 
                value={options.density} 
                onValueChange={(value: typeof options.density) =>
                  setOptions({ ...options, density: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compacta</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="spacious">Espaciada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* DATA TAB */}
          <TabsContent value="data" className="space-y-4 mt-4">
            {/* Sorting */}
            <div className="space-y-3">
              <Label>Ordenar Por</Label>
              <Select 
                value={options.sortBy} 
                onValueChange={(value: typeof options.sortBy) =>
                  setOptions({ ...options, sortBy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">Valor</SelectItem>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="name">Nombre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-3">
              <Label>Orden</Label>
              <Select 
                value={options.sortOrder} 
                onValueChange={(value: typeof options.sortOrder) =>
                  setOptions({ ...options, sortOrder: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascendente</SelectItem>
                  <SelectItem value="desc">Descendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limit */}
            <div className="space-y-3">
              <Label>Límite de Registros: {options.limit || "Sin límite"}</Label>
              <Slider
                value={[options.limit || 100]}
                onValueChange={(value) =>
                  setOptions({ ...options, limit: value[0] })
                }
                min={5}
                max={100}
                step={5}
              />
            </div>

            {/* Aggregation */}
            <div className="space-y-3">
              <Label>Agregación</Label>
              <Select 
                value={options.aggregation} 
                onValueChange={(value: Aggregation) =>
                  setOptions({ ...options, aggregation: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum">Suma</SelectItem>
                  <SelectItem value="avg">Promedio</SelectItem>
                  <SelectItem value="max">Máximo</SelectItem>
                  <SelectItem value="min">Mínimo</SelectItem>
                  <SelectItem value="count">Conteo</SelectItem>
                  <SelectItem value="median">Mediana</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* CHART TAB */}
          <TabsContent value="chart" className="space-y-4 mt-4">
            {/* Chart Type */}
            <div className="space-y-3">
              <Label>Tipo de Gráfico</Label>
              <Select 
                value={options.chartType || "bar"} 
                onValueChange={(value: ChartType) =>
                  setOptions({ ...options, chartType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Línea</SelectItem>
                  <SelectItem value="bar">Barras</SelectItem>
                  <SelectItem value="pie">Pastel</SelectItem>
                  <SelectItem value="area">Área</SelectItem>
                  <SelectItem value="scatter">Dispersión</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={options.showLegend}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, showLegend: !!checked })
                }
              />
              <Label>Mostrar Leyenda</Label>
            </div>

            {/* Grid */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={options.showGrid}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, showGrid: !!checked })
                }
              />
              <Label>Mostrar Grilla</Label>
            </div>

            {/* Tooltip */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={options.showTooltip}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, showTooltip: !!checked })
                }
              />
              <Label>Mostrar Tooltip</Label>
            </div>

            {/* Animation */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={options.animate}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, animate: !!checked })
                }
              />
              <Label>Animaciones</Label>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-3">
              <Label>Relación de Aspecto</Label>
              <Select 
                value={options.aspectRatio || "wide"} 
                onValueChange={(value: typeof options.aspectRatio) =>
                  setOptions({ ...options, aspectRatio: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Cuadrado</SelectItem>
                  <SelectItem value="wide">Ancho</SelectItem>
                  <SelectItem value="tall">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* ADVANCED TAB */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* Refresh Interval */}
            <div className="space-y-3">
              <Label>Intervalo de Actualización (segundos)</Label>
              <Input
                type="number"
                value={options.refreshInterval || 0}
                onChange={(e) =>
                  setOptions({ ...options, refreshInterval: parseInt(e.target.value) })
                }
                min={0}
                step={10}
              />
              <p className="text-xs text-muted-foreground">
                0 = No auto-actualizar
              </p>
            </div>

            {/* Interactivity */}
            <div className="space-y-2">
              <Label>Interactividad</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={options.enableDrill}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, enableDrill: !!checked })
                    }
                  />
                  <Label className="text-sm">Permitir Drill Down</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={options.enableExport}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, enableExport: !!checked })
                    }
                  />
                  <Label className="text-sm">Permitir Exportar</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={options.enableRefresh}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, enableRefresh: !!checked })
                    }
                  />
                  <Label className="text-sm">Permitir Refrescar</Label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            Restablecer
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Zap className="h-4 w-4" />
              Guardar Cambios
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
