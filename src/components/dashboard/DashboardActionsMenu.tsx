/**
 * DASHBOARD ACTIONS MENU
 * =====================
 * Discrete dropdown menu with all dashboard actions
 * Positioned top-right corner with a subtle chevron-down icon
 * ✅ 60% opacity by default, 100% on hover
 */

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Filter,
  RefreshCw,
  Download,
  Upload,
  Zap,
  Share2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardActionsMenuProps {
  /** Whether any widgets are present */
  hasWidgets: boolean;
  /** Whether the dashboard is saving */
  isSaving?: boolean;
  /** Called when filters button is clicked */
  onFilters?: () => void;
  /** Called when refresh button is clicked */
  onRefresh?: () => void;
  /** Called when export button is clicked */
  onExport?: () => void;
  /** Called when import button is clicked */
  onImport?: () => void;
  /** Called when template gallery button is clicked */
  onTemplateGallery?: () => void;
  /** Called when CSV uploader button is clicked */
  onCSVUpload?: () => void;
  /** Called when metric builder button is clicked */
  onMetricBuilder?: () => void;
  /** Called when share button is clicked */
  onShare?: () => void;
  /** Called when reset button is clicked */
  onReset?: () => void;
  /** Called when add widget button is clicked */
  onAddWidget?: () => void;
  /** Called when customize dashboard button is clicked */
  onDashboardCustomize?: () => void;
}

export function DashboardActionsMenu({
  hasWidgets,
  isSaving = false,
  onFilters,
  onRefresh,
  onExport,
  onImport,
  onTemplateGallery,
  onCSVUpload,
  onMetricBuilder,
  onShare,
  onReset,
  onAddWidget,
  onDashboardCustomize,
}: DashboardActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (callback?: () => void) => {
    callback?.();
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 w-6 p-0 rounded-sm transition-opacity duration-200",
            open ? "opacity-100" : "opacity-60 hover:opacity-100"
          )}
          disabled={isSaving}
          aria-label="Abrir menú de acciones del panel"
          title="Acciones disponibles"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* Widget Management */}
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Gestión de Tarjetas
        </DropdownMenuLabel>

        {onAddWidget && (
          <DropdownMenuItem onClick={() => handleAction(onAddWidget)} disabled={isSaving}>
            <Zap className="h-4 w-4 mr-2" />
            <span>Agregar Tarjeta</span>
          </DropdownMenuItem>
        )}

        {hasWidgets && onReset && (
          <DropdownMenuItem
            onClick={() => handleAction(onReset)}
            disabled={isSaving}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span>Limpiar Panel</span>
          </DropdownMenuItem>
        )}

        {hasWidgets && <DropdownMenuSeparator />}

        {/* Data Management */}
        {hasWidgets && (
          <>
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Datos
            </DropdownMenuLabel>

            {onRefresh && (
              <DropdownMenuItem onClick={() => handleAction(onRefresh)} disabled={isSaving}>
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>Actualizar</span>
              </DropdownMenuItem>
            )}

            {onFilters && (
              <DropdownMenuItem onClick={() => handleAction(onFilters)} disabled={isSaving}>
                <Filter className="h-4 w-4 mr-2" />
                <span>Filtros Avanzados</span>
              </DropdownMenuItem>
            )}

            {onCSVUpload && (
              <DropdownMenuItem onClick={() => handleAction(onCSVUpload)} disabled={isSaving}>
                <Upload className="h-4 w-4 mr-2" />
                <span>Importar CSV</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
          </>
        )}

        {/* Customization */}
        {hasWidgets && (
          <>
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Personalización
            </DropdownMenuLabel>

            {onMetricBuilder && (
              <DropdownMenuItem onClick={() => handleAction(onMetricBuilder)} disabled={isSaving}>
                <Zap className="h-4 w-4 mr-2" />
                <span>Crear Métrica</span>
              </DropdownMenuItem>
            )}

            {onTemplateGallery && (
              <DropdownMenuItem onClick={() => handleAction(onTemplateGallery)} disabled={isSaving}>
                <Zap className="h-4 w-4 mr-2" />
                <span>Plantillas</span>
              </DropdownMenuItem>
            )}

            {onDashboardCustomize && (
              <DropdownMenuItem onClick={() => handleAction(onDashboardCustomize)} disabled={isSaving}>
                <Zap className="h-4 w-4 mr-2" />
                <span>Personalizar Dashboard</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
          </>
        )}

        {/* Export & Share */}
        {hasWidgets && (
          <>
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Compartir
            </DropdownMenuLabel>

            {onExport && (
              <DropdownMenuItem onClick={() => handleAction(onExport)} disabled={isSaving}>
                <Download className="h-4 w-4 mr-2" />
                <span>Exportar</span>
              </DropdownMenuItem>
            )}

            {onImport && (
              <DropdownMenuItem onClick={() => handleAction(onImport)} disabled={isSaving}>
                <Upload className="h-4 w-4 mr-2" />
                <span>Importar</span>
              </DropdownMenuItem>
            )}

            {onShare && (
              <DropdownMenuItem onClick={() => handleAction(onShare)} disabled={isSaving}>
                <Share2 className="h-4 w-4 mr-2" />
                <span>Compartir Panel</span>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
