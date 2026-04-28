/**
 * WIDGET TEMPLATES GALLERY
 * ========================
 * Browse and apply pre-configured widget templates
 */

import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  WIDGET_PRESETS,
  getPopularWidgetPresets,
  getWidgetPresetsByCategory,
  searchWidgetPresets,
  type WidgetPreset,
} from "@/lib/dashboard/widgetPresets";
import { Search, Zap, Star } from "lucide-react";

interface WidgetTemplatesGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: WidgetPreset) => void;
}

export function WidgetTemplatesGallery({
  open,
  onOpenChange,
  onSelectTemplate,
}: WidgetTemplatesGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = useMemo(
    () => [
      { id: "all", label: "Todas", count: Object.keys(WIDGET_PRESETS).length },
      { id: "sales", label: "Ventas", count: getWidgetPresetsByCategory("sales").length },
      { id: "inventory", label: "Inventario", count: getWidgetPresetsByCategory("inventory").length },
      { id: "finance", label: "Finanzas", count: getWidgetPresetsByCategory("finance").length },
      { id: "customers", label: "Clientes", count: getWidgetPresetsByCategory("customers").length },
      { id: "operations", label: "Operaciones", count: getWidgetPresetsByCategory("operations").length },
      { id: "marketing", label: "Marketing", count: getWidgetPresetsByCategory("marketing").length },
    ],
    []
  );

  const getFilteredTemplates = useCallback((): WidgetPreset[] => {
    let filtered = Object.values(WIDGET_PRESETS);

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = searchWidgetPresets(searchQuery);
    }

    return filtered;
  }, [selectedCategory, searchQuery]);

  const templates = getFilteredTemplates();
  const popular = useMemo(() => getPopularWidgetPresets(), []);

  const handleSelectTemplate = useCallback((template: WidgetPreset) => {
    onSelectTemplate(template);
    onOpenChange(false);
  }, [onSelectTemplate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Plantillas de Widgets
          </DialogTitle>
          <DialogDescription>
            Elige una plantilla prediseñada y comienza con métricas pre-configuradas
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="popular" className="flex-1 flex flex-col gap-4 min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="popular" className="gap-2">
              <Star className="h-4 w-4" />
              Populares
            </TabsTrigger>
            <TabsTrigger value="all">Por Categoría</TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Buscar
            </TabsTrigger>
          </TabsList>

          {/* POPULAR TAB */}
          <TabsContent value="popular" className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {popular.length > 0 ? (
                  popular.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleSelectTemplate(template)}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No hay plantillas populares
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* CATEGORY TAB */}
          <TabsContent value="all" className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 px-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.label}
                  <span className="ml-1 text-xs opacity-70">({cat.count})</span>
                </button>
              ))}
            </div>

            {/* Templates Grid */}
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleSelectTemplate(template)}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No hay plantillas en esta categoría
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* SEARCH TAB */}
          <TabsContent value="search" className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Search Input */}
            <div className="flex gap-2 px-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Busca plantillas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Search Results */}
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleSelectTemplate(template)}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    {searchQuery 
                      ? `No se encontraron plantillas para "${searchQuery}"`
                      : "Escribe para buscar plantillas"}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// TEMPLATE CARD COMPONENT
// ============================================

interface TemplateCardProps {
  template: WidgetPreset;
  onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const difficultyColors = {
    beginner: "bg-green-100 text-green-800",
    intermediate: "bg-yellow-100 text-yellow-800",
    advanced: "bg-red-100 text-red-800",
  };

  return (
    <button
      onClick={onSelect}
      className="group relative p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left overflow-hidden"
    >
      {/* Hover Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Content */}
      <div className="relative space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="text-2xl" aria-hidden="true">
            {template.icon}
          </div>
          {template.popular && (
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h4 className="font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {template.name}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {template.description}
          </p>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className={`text-xs ${difficultyColors[template.difficulty]}`}
          >
            {template.difficulty === "beginner"
              ? "Principiante"
              : template.difficulty === "intermediate"
                ? "Intermedio"
                : "Avanzado"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {template.widgets.length} widgets
          </span>
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Apply Button */}
        <Button
          size="sm"
          className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            onSelect();
          }}
        >
          Aplicar Plantilla
        </Button>
      </div>
    </button>
  );
}
