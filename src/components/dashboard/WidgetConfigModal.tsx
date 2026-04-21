import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface WidgetConfig {
  refreshInterval?: number;
  showTitle?: boolean;
  showDescription?: boolean;
  maxItems?: number;
  enableCache?: boolean;
  [key: string]: any;
}

interface WidgetConfigModalProps {
  isOpen: boolean;
  widgetName: string;
  widgetId: string;
  config?: WidgetConfig;
  onClose: () => void;
  onSave: (config: WidgetConfig) => void;
}

export function WidgetConfigModal({
  isOpen,
  widgetName,
  widgetId,
  config = {},
  onClose,
  onSave,
}: WidgetConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<WidgetConfig>(config);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onSave(localConfig);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalConfig(config);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar {widgetName}</DialogTitle>
          <DialogDescription>
            Personaliza las opciones de este widget
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Refresh Interval */}
          <div className="space-y-2">
            <Label htmlFor="refresh">Intervalo de actualización (segundos)</Label>
            <Input
              id="refresh"
              type="number"
              min="5"
              max="300"
              step="5"
              value={localConfig.refreshInterval ?? 30}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  refreshInterval: parseInt(e.target.value),
                })
              }
              placeholder="30"
            />
            <p className="text-xs text-muted-foreground">
              Cada cuántos segundos se actualizan los datos (5-300)
            </p>
          </div>

          {/* Show Title */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showTitle"
              checked={localConfig.showTitle ?? true}
              onCheckedChange={(checked) =>
                setLocalConfig({
                  ...localConfig,
                  showTitle: checked as boolean,
                })
              }
            />
            <Label
              htmlFor="showTitle"
              className="font-normal cursor-pointer"
            >
              Mostrar título del widget
            </Label>
          </div>

          {/* Show Description */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showDescription"
              checked={localConfig.showDescription ?? true}
              onCheckedChange={(checked) =>
                setLocalConfig({
                  ...localConfig,
                  showDescription: checked as boolean,
                })
              }
            />
            <Label
              htmlFor="showDescription"
              className="font-normal cursor-pointer"
            >
              Mostrar descripción
            </Label>
          </div>

          {/* Max Items */}
          <div className="space-y-2">
            <Label htmlFor="maxItems">Máximo de elementos a mostrar</Label>
            <Input
              id="maxItems"
              type="number"
              min="1"
              max="100"
              value={localConfig.maxItems ?? 10}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  maxItems: parseInt(e.target.value),
                })
              }
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              Limita la cantidad de filas o elementos mostrados
            </p>
          </div>

          {/* Enable Cache */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableCache"
              checked={localConfig.enableCache ?? true}
              onCheckedChange={(checked) =>
                setLocalConfig({
                  ...localConfig,
                  enableCache: checked as boolean,
                })
              }
            />
            <Label
              htmlFor="enableCache"
              className="font-normal cursor-pointer"
            >
              Cachear datos en el navegador
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
          >
            Restaurar
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(isSaving && "opacity-75")}
          >
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
