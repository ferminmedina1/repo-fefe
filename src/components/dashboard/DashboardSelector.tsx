import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayoutData } from "@/hooks/dashboard/useDashboardLayout";
import { cn } from "@/lib/utils";

interface DashboardSelectorProps {
  currentDashboardId: string | undefined;
  dashboards: DashboardLayoutData[];
  isLoading: boolean;
  onDashboardChange: (dashboardId: string) => void;
  onCreateNew: (name: string) => Promise<void>;
  onDeleteDashboard: (dashboardId: string) => Promise<void>;
  onDuplicateDashboard: (dashboardId: string) => Promise<void>;
}

export function DashboardSelector({
  currentDashboardId,
  dashboards,
  isLoading,
  onDashboardChange,
  onCreateNew,
  onDeleteDashboard,
  onDuplicateDashboard,
}: DashboardSelectorProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del panel no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await onCreateNew(newDashboardName);
      toast({
        title: "✓ Panel de Control creado",
        description: `"${newDashboardName}" ha sido creado exitosamente`,
      });
      setNewDashboardName("");
      setShowCreateDialog(false);
    } catch (error) {
      toast({
        title: "Error al crear panel",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    const dashboard = dashboards.find((d) => d.id === dashboardId);
    if (!dashboard) return;

    // Prevent deleting the default dashboard
    if (dashboard.is_default && dashboards.length > 1) {
      toast({
        title: "No se puede eliminar",
        description: "Cambia el dashboard por defecto antes de eliminar este",
        variant: "destructive",
      });
      return;
    }

    try {
      await onDeleteDashboard(dashboardId);
      toast({
        title: "✓ Panel eliminado",
        description: `"${dashboard.name}" ha sido eliminado`,
      });
      setDeleteConfirm(null);
      // ✅ NEW: Navigate back to default when delete
      navigate("/app");
    } catch (error) {
      toast({
        title: "Error al eliminar panel",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateDashboard = async (dashboardId: string) => {
    const dashboard = dashboards.find((d) => d.id === dashboardId);
    if (!dashboard) return;

    setIsDuplicating(true);
    try {
      await onDuplicateDashboard(dashboardId);
      toast({
        title: "✓ Panel duplicado",
        description: `"${dashboard.name}" ha sido copiado`,
      });
    } catch (error) {
      toast({
        title: "Error al duplicar panel",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-10 w-64 bg-muted rounded-md animate-pulse" />
      </div>
    );
  }

  const currentDashboard = dashboards.find((d) => d.id === currentDashboardId);

  return (
    <div className="flex items-center gap-2">
      {/* Dashboard Selector */}
      <Select
        value={currentDashboardId || ""}
        onValueChange={(value) => {
          if (value === "__new__") {
            setShowCreateDialog(true);
          } else {
            // ✅ NEW: Navigate with dashboard parameter
            navigate(`/app?dashboard=${value}`);
            onDashboardChange(value);
          }
        }}
      >
        <SelectTrigger className="w-64">
          <SelectValue 
            placeholder="Selecciona un panel"
          />
        </SelectTrigger>
        <SelectContent>
          {/* Existing Dashboards */}
          {dashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              className="relative"
              onMouseEnter={(e) => {
                // Show action buttons on hover
                const actions = e.currentTarget.querySelector(
                  "[data-actions]"
                ) as HTMLElement;
                if (actions) actions.style.display = "flex";
              }}
              onMouseLeave={(e) => {
                const actions = e.currentTarget.querySelector(
                  "[data-actions]"
                ) as HTMLElement;
                if (actions) actions.style.display = "none";
              }}
            >
              <SelectItem value={dashboard.id} className="pr-24">
                <div className="flex items-center gap-2">
                  {dashboard.is_default && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                      Por defecto
                    </span>
                  )}
                  <span>{dashboard.name}</span>
                </div>
              </SelectItem>

              {/* Action Buttons - Hidden by default, shown on hover */}
              <div
                data-actions
                className="absolute right-2 top-1/2 -translate-y-1/2 hidden gap-1"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateDashboard(dashboard.id);
                  }}
                  disabled={isDuplicating}
                  className="p-1 hover:bg-muted rounded"
                  title="Duplicar panel"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {dashboards.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(dashboard.id);
                    }}
                    className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                    title="Eliminar panel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Divider */}
          {dashboards.length > 0 && (
            <div className="my-2 border-t border-border" />
          )}

          {/* Create New */}
          <SelectItem value="__new__">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Plus className="w-4 h-4" />
              Crear nuevo Panel de Control
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Create New Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo Panel de Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dashboard-name">Nombre del panel</Label>
              <Input
                id="dashboard-name"
                placeholder="Ej: Ventas Principales, Análisis Financiero..."
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateDashboard();
                  }
                }}
                disabled={isCreating}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateDashboard}
                disabled={isCreating || !newDashboardName.trim()}
              >
                {isCreating ? "Creando..." : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => {
        if (!open) setDeleteConfirm(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar panel?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar "{
                dashboards.find((d) => d.id === deleteConfirm)?.name
              }". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  handleDeleteDashboard(deleteConfirm);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
