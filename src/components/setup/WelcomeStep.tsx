// ============================================================
// Setup Wizard - Welcome Step
// ============================================================

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight, SkipForward } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-primary/10 rounded-2xl">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          ¡Bienvenido a dsfp_space!
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Te guiaremos paso a paso para configurar tu empresa y empezar a usar la plataforma
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-soft border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">1</span>
              Información de Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configura los datos básicos de tu empresa
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">2</span>
              Métodos de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Selecciona cómo aceptarás pagos
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">3</span>
              Datos Iniciales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Importa productos y clientes (opcional)
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">4</span>
              ¡Listo!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Acceso a tutoriales y dashboard
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 text-sm text-muted-foreground">
        <p>💡 <strong>Nota:</strong> Puedes saltar este asistente en cualquier momento. Siempre podrás completar la configuración desde Configuración.</p>
      </div>

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onSkip} className="gap-2">
          <SkipForward className="h-4 w-4" />
          Saltar
        </Button>
        <Button onClick={onNext} className="gap-2">
          Comenzar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
