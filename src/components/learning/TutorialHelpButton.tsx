// ============================================================
// Tutorial Help Button - Botón flotante para acceder a tutoriales
// ============================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, X } from 'lucide-react';
import { useTutorial } from '@/hooks/useTutorial';
import { getTutorialByModuleId, TUTORIAL_MODULES } from '@/lib/tutorial/config';
import { useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export function TutorialHelpButton() {
  const { isRunning, startTutorial } = useTutorial();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Detectar módulo actual por ruta
  const getCurrentModuleId = (): string | null => {
    const path = location.pathname;
    
    if (path.includes('/sales') || path.includes('/invoice')) return 'sales';
    if (path.includes('/products')) return 'products';
    if (path.includes('/customers')) return 'customers';
    if (path.includes('/inventory') || path.includes('/warehouse')) return 'inventory';
    if (path.includes('/dashboard') || path === '/app') return 'dashboard';
    if (path.includes('/settings')) return 'settings';
    
    return null;
  };

  const currentModuleId = getCurrentModuleId();
  const currentTutorial = currentModuleId ? getTutorialByModuleId(currentModuleId) : null;

  const handleStartCurrentTutorial = () => {
    if (currentModuleId) {
      startTutorial(currentModuleId);
      setOpen(false);
    }
  };

  // Agrupar tutoriales por categoría
  const tutorialsByCategory = TUTORIAL_MODULES.reduce(
    (acc, tutorial) => {
      if (!acc[tutorial.category]) {
        acc[tutorial.category] = [];
      }
      acc[tutorial.category].push(tutorial);
      return acc;
    },
    {} as Record<string, typeof TUTORIAL_MODULES>
  );

  if (isRunning) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-28 rounded-full h-12 w-12 shadow-lg hover:shadow-xl transition-shadow z-50"
          title="Tutoriales de la app"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto scrollbar-thin">
        {/* Tutorial del módulo actual */}
        {currentTutorial && (
          <>
            <DropdownMenuLabel>Este módulo</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleStartCurrentTutorial}>
              <span className="text-sm">
                📖 Tutorial: {currentTutorial.moduleName}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Todos los tutoriales */}
        <DropdownMenuLabel>Todos los tutoriales</DropdownMenuLabel>

        {Object.entries(tutorialsByCategory).map(([category, tutorials]) => (
          <DropdownMenuGroup key={category}>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {category}
            </div>
            {tutorials.map(tutorial => (
              <DropdownMenuItem
                key={tutorial.moduleId}
                onClick={() => {
                  startTutorial(tutorial.moduleId);
                  setOpen(false);
                }}
              >
                <span className="text-sm">{tutorial.moduleName}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
