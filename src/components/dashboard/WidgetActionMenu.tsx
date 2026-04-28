/**
 * WIDGET ACTION MENU
 * ==================
 * Menú discreto (dropdown) para controlar widget
 * ✅ Arriba a la derecha del widget
 * ✅ Flechita pequeña discreta
 * ✅ Acciones: Editar métrica, Configurar, Remover
 */

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Settings, Edit3, Trash2 } from 'lucide-react';

interface WidgetActionMenuProps {
  widgetId: string;
  widgetName: string;
  onEditMetric: () => void;
  onConfigure: () => void;
  onRemove: () => void;
}

export function WidgetActionMenu({
  widgetId,
  widgetName,
  onEditMetric,
  onConfigure,
  onRemove,
}: WidgetActionMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-60 hover:opacity-100 transition-opacity"
          title={`Opciones para: ${widgetName}`}
        >
          <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onEditMetric} className="gap-2 cursor-pointer">
          <Edit3 className="h-4 w-4" />
          <span>Editar Métrica</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onConfigure} className="gap-2 cursor-pointer">
          <Settings className="h-4 w-4" />
          <span>Configurar</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onRemove}
          className="gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
          <span>Eliminar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default WidgetActionMenu;
