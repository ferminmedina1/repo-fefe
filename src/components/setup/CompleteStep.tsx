// ============================================================
// Setup Wizard - Complete Step
// ============================================================

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface CompleteStepProps {
  onFinish: () => void;
  onStartTutorial: () => void;
}

export function CompleteStep({ onFinish, onStartTutorial }: CompleteStepProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full"></div>
          <CheckCircle2 className="h-24 w-24 text-green-600 relative" />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">
          ¡Configuración Completada!
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Tu empresa está lista para usar dsfp_space
        </p>
      </div>

      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-primary/20 rounded-lg p-6 space-y-4 max-w-2xl mx-auto">
        <h3 className="font-semibold text-foreground">Próximos pasos:</h3>
        <ul className="text-left space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-bold text-primary">1.</span>
            <span>Explora el <strong>Dashboard</strong> para ver un resumen de tu negocio</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary">2.</span>
            <span>Haz tutoriales en el <strong>Centro de Aprendizaje</strong> para aprender cada módulo</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary">3.</span>
            <span>Completa la información en <strong>Configuración</strong> según tu negocio</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary">4.</span>
            <span>Invita a tu equipo y comienza a usar la plataforma</span>
          </li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="outline" onClick={onFinish} className="gap-2">
          Ir al Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button onClick={onStartTutorial} className="gap-2">
          Ver Tutoriales
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Necesitas ayuda? Accede al Centro de Aprendizaje en cualquier momento desde la navegación
      </p>
    </div>
  );
}
