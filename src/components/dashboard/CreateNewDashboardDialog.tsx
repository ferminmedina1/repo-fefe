import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateNewDashboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDashboard: (name: string) => Promise<void>;
  isCreating: boolean;
}

export function CreateNewDashboardDialog({
  isOpen,
  onClose,
  onCreateDashboard,
  isCreating,
}: CreateNewDashboardDialogProps) {
  const [dashboardName, setDashboardName] = useState('');

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setDashboardName('');
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!dashboardName.trim()) return;
    
    try {
      await onCreateDashboard(dashboardName);
      setDashboardName('');
      onClose();
    } catch (error) {
      // Error is handled by parent component with toast
      console.error('Error creating dashboard:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear nuevo Panel de Control</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dashboard-name">Nombre del panel</Label>
            <Input
              id="dashboard-name"
              placeholder="Ej: Ventas Principales, Análisis Financiero..."
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating && dashboardName.trim()) {
                  handleCreate();
                }
              }}
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !dashboardName.trim()}
            >
              {isCreating ? 'Creando...' : 'Crear'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
