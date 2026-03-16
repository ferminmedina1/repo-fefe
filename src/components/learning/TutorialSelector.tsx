// ============================================================
// Tutorial Selector - Elige un tutorial para comenzar
// ============================================================

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Clock } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useTutorial } from '@/hooks/useTutorial';
import { TUTORIAL_MODULES } from '@/lib/tutorial/config';
import { useNavigate } from 'react-router-dom';

export function TutorialSelector() {
  const { startTutorialWithRoute } = useTutorial();
  const navigate = useNavigate();

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

  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
    return IconComponent ? <IconComponent className="h-6 w-6" /> : null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Centro de Tutoriales</h1>
        <p className="text-muted-foreground">
          Aprende a usar cada módulo paso a paso. Los tutoriales destacan los botones y explican cada función.
        </p>
      </div>

      {/* Tutoriales por categoría */}
      {Object.entries(tutorialsByCategory).map(([category, tutorials]) => (
        <div key={category} className="space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-xl font-semibold">{category}</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tutorials.map(tutorial => (
              <Card
                key={tutorial.moduleId}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                {/* Icono y título */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                      {getIcon(tutorial.icon)}
                    </div>
                    <h3 className="font-semibold text-foreground">
                      {tutorial.moduleName}
                    </h3>
                  </div>
                </div>

                {/* Descripción */}
                <p className="text-sm text-muted-foreground mb-4">
                  {tutorial.description}
                </p>

                {/* Metadata */}
                <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                  {tutorial.estimatedTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{tutorial.estimatedTime} min</span>
                    </div>
                  )}
                  <Badge variant="outline">
                    {tutorial.steps.length} pasos
                  </Badge>
                </div>

                {/* Botón */}
                <Button
                  onClick={() => startTutorialWithRoute(tutorial.moduleId, tutorial.route, navigate)}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Comenzar Tutorial
                </Button>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Consejo */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <span className="font-semibold">💡 Tip:</span> Puedes saltar tutoriales en cualquier momento o volver a verlos cuando quieras. Los tutoriales destacan cada botón y elemento paso a paso para que aprendas rápidamente.
        </p>
      </Card>
    </div>
  );
}
