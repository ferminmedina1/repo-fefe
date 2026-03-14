// ============================================================
// Setup Wizard - Tutorial Choice Step
// ============================================================

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, BookOpen, Zap } from 'lucide-react';

interface TutorialChoiceStepProps {
  onStartTutorial: () => void;
  onSkipTutorial: () => void;
  onPrevious: () => void;
}

export function TutorialChoiceStep({
  onStartTutorial,
  onSkipTutorial,
  onPrevious,
}: TutorialChoiceStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          ¿Quieres hacer un tutorial?
        </h2>
        <p className="text-muted-foreground">
          Aprende los módulos principales con guías interactivas paso a paso
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="shadow-soft cursor-pointer hover:border-primary/50 transition-all"
          onClick={onStartTutorial}
        >
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">
                  Hacer un Tutorial
                </h3>
                <p className="text-sm text-muted-foreground">
                  Aprende las funciones principales con guías interactivas
                </p>
              </div>
            </div>
            <Button className="w-full" onClick={onStartTutorial}>
              Comenzar Tutorial
            </Button>
          </CardContent>
        </Card>

        <Card
          className="shadow-soft cursor-pointer hover:border-primary/50 transition-all"
          onClick={onSkipTutorial}
        >
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">
                  Ir Directo al Dashboard
                </h3>
                <p className="text-sm text-muted-foreground">
                  Puedes hacer tutoriales después desde Centro de Aprendizaje
                </p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={onSkipTutorial}>
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          ℹ️ <strong>Recuerda:</strong> Los tutoriales interactivos siempre estarán disponibles en el Centro de Aprendizaje. Puedes acceder desde cualquier momento.
        </p>
      </div>

      <div className="flex justify-start gap-3">
        <Button variant="outline" onClick={onPrevious} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>
      </div>
    </div>
  );
}
