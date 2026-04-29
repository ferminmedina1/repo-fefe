import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Sparkles } from "lucide-react";
import { WIDGET_CATALOG, WidgetDefinition, WidgetType, getAvailableWidgets } from "@/lib/dashboard/widgets";
import { WidgetCreatorModal } from "./WidgetCreatorModal";
import { cn } from "@/lib/utils";

interface WidgetPickerProps {
  addedWidgetIds: string[];
  onAddWidget: (widgetType: WidgetType, size?: "full" | "half" | "quarter") => void;
  onCreateWidgetWithMetric?: (widget: {
    type: 'kpi' | 'chart';
    metricId?: string;
    customFormula?: string;
    customFormat?: 'currency' | 'number' | 'percentage' | 'decimal';
    customUnit?: string;
    size: 'quarter' | 'half' | 'full';
  }) => void;
  disabled?: boolean;
}

export function WidgetPicker({ addedWidgetIds, onAddWidget, onCreateWidgetWithMetric, disabled = false }: WidgetPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "kpi" | "chart" | "list" | "currency">("all");
  const [selectedSize, setSelectedSize] = useState<"full" | "half" | "quarter">("full");

  const availableWidgets = getAvailableWidgets(addedWidgetIds);

  const filteredWidgets = availableWidgets.filter((widget) => {
    const matchesSearch =
      widget.name.toLowerCase().includes(search.toLowerCase()) ||
      widget.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === "all" || widget.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleAddWidget = (widget: WidgetDefinition) => {
    onAddWidget(widget.id as WidgetType, selectedSize);
    setOpen(false);
    setSearch("");
    setSelectedCategory("all");
  };

  const categories = [
    { id: "all", label: "Todos" },
    { id: "kpi", label: "KPI" },
    { id: "chart", label: "Gráficos" },
    { id: "list", label: "Listas" },
    { id: "currency", label: "Moneda" },
  ] as const;

  const sizes = [
    { id: "quarter", label: "Cuarto", width: "25%" },
    { id: "half", label: "Mitad", width: "50%" },
    { id: "full", label: "Completo", width: "100%" },
  ] as const;

  const isAllWidgetsAdded = availableWidgets.length === 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isAllWidgetsAdded}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Agregar Tarjeta
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Agregar Tarjeta al Panel de Control</SheetTitle>
          <SheetDescription>
            Selecciona Tarjetas pre-hechas o crea una personalizada
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="catalog" className="flex-1 flex flex-col gap-4 min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="catalog">Catálogo</TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Crear Nuevo
            </TabsTrigger>
          </TabsList>

          {/* TAB: Catalog */}
          <TabsContent value="catalog" className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar Tarjetas..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Size Selector */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Tamaño del widget
            </p>
            <div className="flex gap-2">
              {sizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                    selectedSize === size.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filters */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Categorías
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    selectedCategory === category.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Widgets Grid */}
          <ScrollArea className="flex-1 pr-4">
            {filteredWidgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-sm text-muted-foreground text-center">
                  {isAllWidgetsAdded
                    ? "Ya has agregado todas las Tarjetas disponibles"
                    : "No se encontraron Tarjetas que coincidan"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredWidgets.map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => handleAddWidget(widget)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all hover:border-primary hover:bg-primary/5",
                      "border-muted-foreground/20"
                    )}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div
                        className={cn(
                          "p-2 rounded-md",
                          `bg-${widget.color}-500/10`
                        )}
                      >
                        <widget.icon className={cn(
                          "h-5 w-5",
                          `text-${widget.color}-600 dark:text-${widget.color}-500`
                        )} />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {widget.category}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{widget.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {widget.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
          </TabsContent>

          {/* TAB: Create Widget */}
          <TabsContent value="create" className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
                <Sparkles className="h-8 w-8 text-blue-600 mx-auto" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg text-slate-900">
                  Crear Tarjeta Personalizada
                </h3>
                <p className="text-sm text-slate-600 max-w-sm">
                  Abre el creador de widgets para:
                </p>
                <ul className="text-sm text-slate-600 space-y-1 max-w-sm">
                  <li>✅ Seleccionar una métrica pre-hecha</li>
                  <li>✅ Crear una métrica personalizada</li>
                  <li>✅ Elegir tipo y tamaño del widget</li>
                </ul>
              </div>
              <WidgetCreatorModal
                onCreateWidget={(widget) => {
                  if (onCreateWidgetWithMetric) {
                    onCreateWidgetWithMetric({
                      type: widget.type,
                      metricId: widget.metricId,
                      size: widget.size,
                    });
                  }
                  setOpen(false);
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
