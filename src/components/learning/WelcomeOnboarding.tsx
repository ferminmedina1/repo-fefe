// ============================================================
// Welcome Onboarding - Visual interactive introduction to Ventify
// ============================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ArrowRight, 
  ChevronRight,
  BarChart3,
  Users,
  Package,
  Zap,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTutorial } from '@/hooks/useTutorial';

interface WelcomeOnboardingProps {
  onComplete?: () => void;
  onStartTutorial?: (moduleId: string) => void;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const slideVariants = {
  enter: { opacity: 0, x: 100 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
};

type OnboardingStep = 'welcome' | 'pillars' | 'flow' | 'modules' | 'cta';

const ONBOARDING_STEPS: { id: OnboardingStep; title: string; icon: React.ReactNode }[] = [
  { id: 'welcome', title: 'Bienvenida', icon: <Sparkles className="w-5 h-5" /> },
  { id: 'pillars', title: '3 Pilares', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'flow', title: 'Flujo', icon: <ArrowRight className="w-5 h-5" /> },
  { id: 'modules', title: 'Módulos', icon: <Package className="w-5 h-5" /> },
  { id: 'cta', title: '¿Ahora?', icon: <Zap className="w-5 h-5" /> },
];

export function WelcomeOnboarding({ onComplete, onStartTutorial }: WelcomeOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const { startTutorial } = useTutorial();

  const stepIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStep);
  const progress = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < ONBOARDING_STEPS.length) {
      setCurrentStep(ONBOARDING_STEPS[nextIndex].id);
    } else {
      onComplete?.();
    }
  };

  const handleStartTutorial = (moduleId: string) => {
    if (onStartTutorial) {
      onStartTutorial(moduleId);
    } else {
      startTutorial('ventify_intro');
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary/5 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Main container */}
      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Bienvenida Ventify
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Ventify te da la bienvenida</h1>
          <p className="text-lg text-slate-400">Conoce tu nueva plataforma en 5 minutos</p>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between mb-3">
            {ONBOARDING_STEPS.map((step, idx) => (
              <motion.button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`flex flex-col items-center gap-2 transition-all ${
                  idx <= stepIndex ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
                }`}
                whileHover={idx <= stepIndex ? { scale: 1.05 } : {}}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    idx === stepIndex
                      ? 'bg-primary text-white scale-110'
                      : idx < stepIndex
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {idx < stepIndex ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className="text-xs font-medium text-slate-300">{step.title}</span>
              </motion.button>
            ))}
          </div>
          <Progress value={progress} className="h-1 bg-slate-700" />
        </motion.div>

        {/* Content slides */}
        <div className="relative h-96 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden backdrop-blur">
          <AnimatePresence mode="wait">
            {currentStep === 'welcome' && (
              <motion.div
                key="welcome"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="absolute inset-0 p-12 flex flex-col justify-center"
              >
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <motion.div variants={itemVariants} className="mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-6 shadow-lg">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Bienvenido a Ventify</h2>
                  </motion.div>

                  <motion.p variants={itemVariants} className="text-lg text-slate-300 mb-6 leading-relaxed">
                    Ventify es tu asistente administrativo en la computadora. Registra cada venta, te muestra quién debe, qué productos vender más, y te alerta cuándo el stock baja.
                  </motion.p>

                  <motion.div variants={itemVariants} className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                    <p className="text-sm text-slate-200">
                      <span className="font-semibold text-primary">Todo automático</span>, sin Excel, sin confusión.
                    </p>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {currentStep === 'pillars' && (
              <motion.div
                key="pillars"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="absolute inset-0 p-12 flex flex-col justify-center"
              >
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <motion.h2 variants={itemVariants} className="text-3xl font-bold text-white mb-8">
                    Los 3 Pilares de tu Negocio
                  </motion.h2>

                  <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
                    {[
                      { icon: ShoppingCart, label: 'VENTAS', desc: 'Qué vendes' },
                      { icon: Package, label: 'INVENTARIO', desc: 'Qué tienes' },
                      { icon: DollarSign, label: 'DINERO', desc: 'Cuánto ganas' },
                    ].map((pillar, idx) => {
                      const Icon = pillar.icon;
                      return (
                        <motion.div
                          key={idx}
                          variants={itemVariants}
                          className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600/50 text-center hover:border-primary/50 transition-colors"
                        >
                          <Icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                          <p className="font-semibold text-white text-xs">{pillar.label}</p>
                          <p className="text-xs text-slate-400">{pillar.desc}</p>
                        </motion.div>
                      );
                    })}
                  </motion.div>

                  <motion.p variants={itemVariants} className="text-sm text-slate-300 mt-6 text-center">
                    Cada acción en uno afecta a los otros. <span className="text-primary font-semibold">Todo integrado.</span>
                  </motion.p>
                </motion.div>
              </motion.div>
            )}

            {currentStep === 'flow' && (
              <motion.div
                key="flow"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="absolute inset-0 p-12 flex flex-col justify-center"
              >
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <motion.h2 variants={itemVariants} className="text-3xl font-bold text-white mb-8">
                    El Flujo de tu Dinero
                  </motion.h2>

                  <motion.div variants={itemVariants} className="space-y-4">
                    {[
                      '💰 Haces una venta',
                      '↓ El dinero entra en tu cuenta',
                      '↓ El stock baja automáticamente',
                      '↓ Tu Dashboard actualiza al instante',
                      '✨ Tomas decisiones basadas en datos',
                    ].map((text, idx) => (
                      <motion.div
                        key={idx}
                        variants={itemVariants}
                        className="flex items-center gap-3 text-slate-200"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{idx + 1}</span>
                        </div>
                        <span className="text-sm">{text}</span>
                      </motion.div>
                    ))}
                  </motion.div>

                  <motion.p variants={itemVariants} className="text-xs text-slate-400 mt-6 text-center italic">
                    Cero pasos manuales. Ventify lo hace por ti.
                  </motion.p>
                </motion.div>
              </motion.div>
            )}

            {currentStep === 'modules' && (
              <motion.div
                key="modules"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="absolute inset-0 p-12 flex flex-col justify-center overflow-y-auto"
              >
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <motion.h2 variants={itemVariants} className="text-3xl font-bold text-white mb-6">
                    Tu Centro de Comando
                  </motion.h2>

                  <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'POS', desc: 'Venta rápida' },
                      { name: 'Ventas', desc: 'Órdenes complejas' },
                      { name: 'Clientes', desc: 'Base de datos' },
                      { name: 'Productos', desc: 'Catálogo + Stock' },
                      { name: 'Finanzas', desc: 'Dinero' },
                      { name: 'Reportes', desc: 'Análisis de datos' },
                    ].map((mod, idx) => (
                      <motion.div
                        key={idx}
                        variants={itemVariants}
                        className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3 hover:border-primary/50 transition-colors"
                      >
                        <p className="font-semibold text-white text-sm">{mod.name}</p>
                        <p className="text-xs text-slate-400">{mod.desc}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {currentStep === 'cta' && (
              <motion.div
                key="cta"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="absolute inset-0 p-12 flex flex-col justify-center"
              >
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <motion.div variants={itemVariants} className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4 shadow-lg">
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">¡Ya Entiendes!</h2>
                    <p className="text-slate-400 mt-2">85% de usuarios dominan esto en 5 minutos</p>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-3 mb-6">
                    <p className="text-slate-300 text-center">¿Qué quieres hacer ahora?</p>
                    <div className="space-y-2">
                      <Button
                        onClick={() => handleStartTutorial('ventify_intro')}
                        className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white h-11"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Ver Tutorial Completo
                      </Button>
                      <Button
                        onClick={() => handleSkip()}
                        variant="outline"
                        className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50 h-11"
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Ir al Dashboard
                      </Button>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="text-xs text-slate-500 text-center">
                    💡 Siempre puedes acceder a tutoriales en el Learning Center
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <motion.div
          className="mt-8 flex items-center justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="text-slate-400 hover:text-slate-200"
          >
            Saltar
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {stepIndex + 1} de {ONBOARDING_STEPS.length}
            </span>
            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white"
            >
              {stepIndex === ONBOARDING_STEPS.length - 1 ? (
                <>
                  Comenzar <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Siguiente <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Helper imports needed
import { ShoppingCart, DollarSign } from 'lucide-react';
