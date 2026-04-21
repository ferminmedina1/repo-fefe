/**
 * Enterprise Reusable Components
 * Componentes reutilizables enterprise-grade
 */

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info, Loader2, AlertTriangle } from "lucide-react";
import { getLogger } from "@/lib/dashboard/enterpriseLogger";

/**
 * Enterprise Confirm Dialog
 */
export interface EnterpriseConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  actionLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: "default" | "destructive" | "warning";
  isLoading?: boolean;
  autoLog?: boolean;
  logCategory?: string;
}

export const EnterpriseConfirmDialog = React.forwardRef<
  HTMLDivElement,
  EnterpriseConfirmDialogProps
>(
  (
    {
      isOpen,
      title,
      description,
      actionLabel = "Confirmar",
      cancelLabel = "Cancelar",
      onConfirm,
      onCancel,
      variant = "default",
      isLoading = false,
      autoLog = true,
      logCategory = "Dialog",
    },
    ref
  ) => {
    const logger = getLogger();
    const [loading, setLoading] = React.useState(false);

    const handleConfirm = async () => {
      setLoading(true);
      try {
        if (autoLog) {
          logger.info(logCategory, `Action confirmed: ${title}`);
        }
        await onConfirm();
      } catch (error) {
        if (autoLog) {
          logger.error(logCategory, `Action failed: ${title}`, error as Error);
        }
        throw error;
      } finally {
        setLoading(false);
      }
    };

    const variantStyles = {
      default: "bg-primary hover:bg-primary/90",
      destructive: "bg-destructive hover:bg-destructive/90",
      warning: "bg-yellow-600 hover:bg-yellow-700",
    };

    return (
      <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel?.()}>
        <AlertDialogContent ref={ref}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {variant === "destructive" && <AlertCircle className="h-5 w-5 text-destructive" />}
              {variant === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
              {title}
            </AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading || isLoading}
              className={variantStyles[variant]}
            >
              {loading || isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                actionLabel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);
EnterpriseConfirmDialog.displayName = "EnterpriseConfirmDialog";

/**
 * Enterprise Info Dialog
 */
export interface EnterpriseInfoDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClose: () => void;
  type?: "info" | "success" | "warning" | "error";
  actionLabel?: string;
  onAction?: () => void;
}

export const EnterpriseInfoDialog = React.forwardRef<
  HTMLDivElement,
  EnterpriseInfoDialogProps
>(
  (
    {
      isOpen,
      title,
      description,
      children,
      onClose,
      type = "info",
      actionLabel = "Aceptar",
      onAction,
    },
    ref
  ) => {
    const icons = {
      info: <Info className="h-5 w-5 text-blue-600" />,
      success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
      error: <AlertCircle className="h-5 w-5 text-destructive" />,
    };

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent ref={ref}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icons[type]}
              {title}
            </DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          {children && <div className="py-4">{children}</div>}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {onAction && (
              <Button onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);
EnterpriseInfoDialog.displayName = "EnterpriseInfoDialog";

/**
 * Loading States
 */
export const LoadingSpinner = ({ 
  size = "md", 
  text = "Cargando..." 
}: { 
  size?: "sm" | "md" | "lg"; 
  text?: string;
}) => {
  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }[size];

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={`${sizeClass} animate-spin text-primary`} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
};

/**
 * Skeleton Loader
 */
export const SkeletonLoader = ({ 
  count = 3, 
  height = "h-12" 
}: { 
  count?: number; 
  height?: string;
}) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-muted rounded-lg animate-pulse`}
        />
      ))}
    </div>
  );
};

/**
 * Empty State
 */
export const EmptyState = ({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Icon className="h-12 w-12 text-muted-foreground" />
      <div className="text-center">
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
};

/**
 * Status Badge
 */
export const StatusBadge = ({
  status,
  label,
}: {
  status: "success" | "error" | "warning" | "info" | "loading";
  label: string;
}) => {
  const styles = {
    success: "bg-green-100 text-green-800 border border-green-300",
    error: "bg-red-100 text-red-800 border border-red-300",
    warning: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    info: "bg-blue-100 text-blue-800 border border-blue-300",
    loading: "bg-blue-100 text-blue-800 border border-blue-300 animate-pulse",
  };

  const icons = {
    success: <CheckCircle2 className="h-4 w-4" />,
    error: <AlertCircle className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
    loading: <Loader2 className="h-4 w-4 animate-spin" />,
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
      {icons[status]}
      {label}
    </div>
  );
};
