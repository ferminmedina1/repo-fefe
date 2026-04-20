import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

export interface DeleteConfirmDialogProps {
  open: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  title: string;
  description: string;
  itemName?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

/**
 * Confirmation dialog for destructive actions (delete, etc.)
 * Requires explicit user confirmation before proceeding
 * Shows warning icon for dangerous operations
 */
export function DeleteConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  itemName,
  isDangerous = true,
  isLoading = false,
}: DeleteConfirmDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onCancel(); // Close dialog on success
    } catch (error) {
      console.error('Error in delete confirmation:', error);
      // Dialog stays open on error so user can retry
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className={isDangerous ? 'border-red-500/30 dark:border-red-500/40' : ''}>
        {/* Header */}
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            {isDangerous && (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        {/* Description */}
        <AlertDialogDescription className="space-y-2">
          <p>{description}</p>
          {itemName && (
            <p className="font-semibold text-foreground">
              {itemName}
            </p>
          )}
          {isDangerous && (
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              Esta acción no se puede deshacer.
            </p>
          )}
        </AlertDialogDescription>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={`gap-2 ${isDangerous ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Eliminar
              </>
            )}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
