import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTemplates } from "@/hooks/dashboard";
import { useToast } from "@/hooks/use-toast";
import { DashboardWidget } from "@/lib/dashboard/widgets";
import { Skeleton } from "@/components/ui/skeleton";

interface TemplateGalleryProps {
  onSelectTemplate: (widgets: DashboardWidget[]) => Promise<void>;
  onClose: () => void;
}

export function TemplateGallery({ onSelectTemplate, onClose }: TemplateGalleryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: templates, isLoading: isTemplatesLoading, error: templatesError } = useTemplates(false);

  const handleSelectTemplate = async (widgets: DashboardWidget[]) => {
    setIsLoading(true);
    try {
      await onSelectTemplate(widgets);
      toast({
        title: "✓ Plantilla aplicada",
        description: `Cargados ${widgets.length} widgets`,
      });
      onClose();
    } catch (error) {
      console.error('[TemplateGallery] Error:', error);
      toast({
        title: "Error al aplicar plantilla",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Plantillas de Panel de Control</DialogTitle>
          <DialogDescription className="text-base">
            Elige una plantilla prediseñada y comienza al instante
          </DialogDescription>
        </DialogHeader>

        <div className="w-full">
          {isTemplatesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-6">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-6">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    handleSelectTemplate(template.widgets_data?.widgets || [])
                  }}
                  disabled={isLoading}
                  className={`
                    relative p-4 rounded-lg border-2 text-left transition-all duration-200
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:shadow-lg hover:bg-primary/5 cursor-pointer'}
                    border-border
                  `}
                >
                  {/* Template Icon/Badge */}
                  <div className="mb-3 inline-block px-2 py-1 bg-primary/10 rounded-md">
                    <span className="text-xs font-semibold text-primary">
                      {template.widgets_data?.widgets?.length || 0} widgets
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-sm text-foreground">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {template.description}
                  </p>
                  
                  {/* Hover arrow */}
                  <div className="mt-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">Aplicar →</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mb-4 text-4xl">📋</div>
              <p className="text-base font-medium text-foreground mb-2">
                No hay plantillas disponibles
              </p>
              {templatesError && (
                <p className="text-sm text-destructive font-medium mt-2">
                  Error: {templatesError.message || 'No se pudieron cargar las plantillas'}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-3">
                Las plantillas aparecerán aquí una vez que se configure la base de datos.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
