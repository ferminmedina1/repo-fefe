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
import { Plus, Trash2, Copy, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayoutData, useRenameDashboard } from "@/hooks/dashboard";
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
  const renameMutation = useRenameDashboard();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  // ✅ NEW: Edit name modal state
  const [editingDashboardId, setEditingDashboardId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

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

  // ✅ NEW: Handle dashboard rename
  const handleRenameDashboard = async () => {
    if (!editingDashboardId || !editingName.trim()) {
      toast({
        title: "Error",
        description: "El nombre no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    setIsRenaming(true);
    try {
      await renameMutation.mutateAsync({
        dashboardId: editingDashboardId,
        newName: editingName,
      });
      toast({
        title: "✓ Nombre actualizado",
        description: `Panel renombrado a "${editingName}"`,
      });
      setEditingDashboardId(null);
      setEditingName("");
    } catch (error) {
      toast({
        title: "Error al renombrar panel",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  // ✅ NEW: Open edit modal
  const openEditModal = (dashboardId: string, currentName: string) => {
    setEditingDashboardId(dashboardId);
    setEditingName(currentName);
  };

  const currentDashboard = dashboards.find((d) => d.id === currentDashboardId);

  return (
    <div className="flex items-center gap-2 relative">
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
        <SelectTrigger className="w-64 border border-border hover:border-primary/50 transition-colors">
          <SelectValue 
            placeholder="Selecciona un panel"
          />
        </SelectTrigger>
        <SelectContent>
          {/* Existing Dashboards */}
          {dashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              className="flex items-center justify-between px-2 py-2 text-sm hover:bg-accent rounded cursor-pointer group"
              onClick={() => {
                navigate(`/app?dashboard=${dashboard.id}`);
                onDashboardChange(dashboard.id);
              }}
            >
              <SelectItem value={dashboard.id} className="flex-1 p-0">
                <div className="flex items-center gap-2">
                  {dashboard.is_default && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                      Por defecto
                    </span>
                  )}
                  <span>{dashboard.name}</span>
                </div>
              </SelectItem>

              {/* Action Buttons - Visible on hover */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(dashboard.id, dashboard.name);
                  }}
                  className="p-1 hover:bg-primary/10 hover:text-primary rounded transition-colors"
                  title="Editar configuración"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateDashboard(dashboard.id);
                  }}
                  disabled={isDuplicating}
                  className="p-1 hover:bg-muted rounded transition-colors"
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
                    className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
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

      {/* ✅ NEW: Edit Name Dialog */}
      <Dialog open={!!editingDashboardId} onOpenChange={(open) => {
        if (!open) {
          setEditingDashboardId(null);
          setEditingName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Panel de Control</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-dashboard-name">Nombre del panel</Label>
              <Input
                id="edit-dashboard-name"
                placeholder="Ej: Ventas Principales, Análisis Financiero..."
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameDashboard();
                  }
                }}
                disabled={isRenaming}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingDashboardId(null);
                  setEditingName("");
                }}
                disabled={isRenaming}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRenameDashboard}
                disabled={isRenaming || !editingName.trim()}
              >
                {isRenaming ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading indicator - positioned absolute so it doesn't move layout */}
      {isLoading && (
        <div className="absolute right-0 flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
          <div className="h-4 w-4 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
          <span>Cargando...</span>
        </div>
      )}
    </div>
  );
}
