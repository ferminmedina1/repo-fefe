import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Wand2 } from "lucide-react";
import { useTemplates } from "@/hooks/dashboard";
import { useToast } from "@/hooks/use-toast";
import { DashboardWidget } from "@/lib/dashboard/widgets";
import { Skeleton } from "@/components/ui/skeleton";

interface TemplateGalleryProps {
  onSelectTemplate: (widgets: DashboardWidget[]) => Promise<void>;
}

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: templates, isLoading: isTemplatesLoading } = useTemplates(false); // Only presets

  const handleSelectTemplate = async (widgets: DashboardWidget[]) => {
    setIsLoading(true);
    try {
      await onSelectTemplate(widgets);
      toast({
        title: "✓ Template applied",
        description: `Loaded ${widgets.length} widgets`,
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Failed to apply template",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wand2 className="w-4 h-4" />
          Explorar templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Plantillas de Panel de Control</DialogTitle>
          <DialogDescription>
            Choose a template to quickly set up your dashboard
          </DialogDescription>
        </DialogHeader>

        {isTemplatesLoading ? (
          <div className="grid grid-cols-2 gap-3 py-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 py-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() =>
                  handleSelectTemplate(template.widgets_data.widgets)
                }
                disabled={isLoading}
                className="p-3 border rounded-lg hover:bg-gray-50 text-left transition-colors disabled:opacity-50"
              >
                <h4 className="font-semibold text-sm">{template.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {template.widgets_data.widgets.length} widgets
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">
              No templates available yet. Templates will appear here once the database is configured.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
