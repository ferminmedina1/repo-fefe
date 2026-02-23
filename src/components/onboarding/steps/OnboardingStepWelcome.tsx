// ============================================================
// Step 1: WELCOME — Introduces the platform, user clicks to start
// ============================================================

import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function OnboardingStepWelcome() {
  const { emitEvent } = useOnboarding();

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
        <Rocket className="w-10 h-10 text-primary" />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-white">
          Bienvenido a Ventify
        </h1>
        <p className="text-lg text-slate-300 max-w-md mx-auto leading-relaxed">
          Vamos a configurar tu negocio en unos pocos pasos. 
          Cada acción que realices aquí es real — no es una simulación.
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 max-w-md mx-auto">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Lo que vamos a hacer
        </h3>
        <ul className="space-y-2.5 text-left">
          {[
            'Configurar los datos de tu empresa',
            'Crear tu primer contacto',
            'Mover un contacto en el pipeline',
            'Activar una automatización',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <Button
        size="lg"
        className="mt-4 h-12 px-8 text-base font-semibold"
        onClick={() => emitEvent('onboarding.welcome_acknowledged')}
      >
        Comenzar configuración
      </Button>
    </div>
  );
}
