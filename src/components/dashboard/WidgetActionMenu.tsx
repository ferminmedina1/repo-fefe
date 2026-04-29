/**
 * WIDGET ACTION MENU - FUTURISTIC DESIGN
 * =======================================
 * Menú dropdown con glassmorphism y animaciones suaves
 * ✅ Diseño moderno con efectos de brillo
 * ✅ Transiciones suaves
 * ✅ Flechita animada
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
import { ChevronDown, Settings, Edit3, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

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
          className={cn(
            "relative h-8 w-8 p-0",
            // Base styling
            "bg-gradient-to-br from-purple-500/10 to-pink-500/10",
            "hover:from-purple-500/20 hover:to-pink-500/20",
            // Border
            "border border-purple-500/30 hover:border-purple-500/60",
            // Glow effect
            "shadow-[0_0_15px_rgba(168,85,247,0.2)]",
            "hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]",
            // Transitions
            "transition-all duration-300",
            // Icon color
            "[&_svg]:text-purple-400 hover:[&_svg]:text-purple-300",
            "[&_svg]:transition-colors duration-300"
          )}
          title={`Opciones para: ${widgetName}`}
        >
          {/* Animated icon */}
          <MoreVertical className={cn(
            "h-4 w-4",
            open && "rotate-90 transition-transform"
          )} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className={cn(
          "w-52",
          // Glassmorphism effect
          "bg-background/80 backdrop-blur-2xl",
          "border border-border/40",
          // Glow
          "shadow-[0_8px_32px_rgba(168,85,247,0.15)]",
          // Smooth appearance
          "animate-in fade-in slide-in-from-top-2 duration-200"
        )}
      >
        {/* Edit Metric */}
        <DropdownMenuItem 
          onClick={onEditMetric} 
          className={cn(
            "gap-3 cursor-pointer px-3 py-2 transition-all duration-200",
            "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10",
            "hover:border-l-2 hover:border-purple-500/50",
            "focus:bg-gradient-to-r focus:from-purple-500/20 focus:to-pink-500/20"
          )}
        >
          <Edit3 className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium">Editar Métrica</span>
        </DropdownMenuItem>

        {/* Configure */}
        <DropdownMenuItem 
          onClick={onConfigure} 
          className={cn(
            "gap-3 cursor-pointer px-3 py-2 transition-all duration-200",
            "hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-cyan-500/10",
            "hover:border-l-2 hover:border-blue-500/50",
            "focus:bg-gradient-to-r focus:from-blue-500/20 focus:to-cyan-500/20"
          )}
        >
          <Settings className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">Configurar</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/30" />

        {/* Delete - with red accent */}
        <DropdownMenuItem
          onClick={onRemove}
          className={cn(
            "gap-3 cursor-pointer px-3 py-2 transition-all duration-200",
            "text-red-400 hover:text-red-300",
            "hover:bg-gradient-to-r hover:from-red-500/10 hover:to-orange-500/10",
            "hover:border-l-2 hover:border-red-500/50",
            "focus:bg-gradient-to-r focus:from-red-500/20 focus:to-orange-500/20"
          )}
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-sm font-medium">Eliminar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default WidgetActionMenu;
