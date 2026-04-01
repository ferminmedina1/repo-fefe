// ============================================================
// Tutorial Selector - Elige un tutorial para comenzar
// ============================================================

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useTutorial } from '@/hooks/useTutorial';
import { TUTORIAL_MODULES } from '@/lib/tutorial/config';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Colour palette per category (HSL-safe, using Tailwind utility colours)
const CATEGORY_STYLES: Record<string, { bg: string; icon: string; badge: string }> = {
  'Inicio':          { bg: 'from-violet-500/10 to-violet-500/5',  icon: 'text-violet-500', badge: 'border-violet-400/30 text-violet-600 dark:text-violet-400 bg-violet-500/8' },
  'Ventas':          { bg: 'from-blue-500/10 to-blue-500/5',     icon: 'text-blue-500',   badge: 'border-blue-400/30 text-blue-600 dark:text-blue-400 bg-blue-500/8' },
  'Clientes':        { bg: 'from-emerald-500/10 to-emerald-500/5', icon: 'text-emerald-500', badge: 'border-emerald-400/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/8' },
  'Compras':         { bg: 'from-orange-500/10 to-orange-500/5', icon: 'text-orange-500', badge: 'border-orange-400/30 text-orange-600 dark:text-orange-400 bg-orange-500/8' },
  'Inventario':      { bg: 'from-amber-500/10 to-amber-500/5',   icon: 'text-amber-500',  badge: 'border-amber-400/30 text-amber-600 dark:text-amber-400 bg-amber-500/8' },
  'Finanzas':        { bg: 'from-cyan-500/10 to-cyan-500/5',     icon: 'text-cyan-500',   badge: 'border-cyan-400/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/8' },
  'Operaciones':     { bg: 'from-indigo-500/10 to-indigo-500/5', icon: 'text-indigo-500', badge: 'border-indigo-400/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/8' },
  'RRHH':            { bg: 'from-pink-500/10 to-pink-500/5',     icon: 'text-pink-500',   badge: 'border-pink-400/30 text-pink-600 dark:text-pink-400 bg-pink-500/8' },
  'Reportes':        { bg: 'from-teal-500/10 to-teal-500/5',     icon: 'text-teal-500',   badge: 'border-teal-400/30 text-teal-600 dark:text-teal-400 bg-teal-500/8' },
  'Administración':  { bg: 'from-slate-500/10 to-slate-500/5',   icon: 'text-slate-500',  badge: 'border-slate-400/30 text-slate-600 dark:text-slate-400 bg-slate-500/8' },
  'Recursos':        { bg: 'from-rose-500/10 to-rose-500/5',     icon: 'text-rose-500',   badge: 'border-rose-400/30 text-rose-600 dark:text-rose-400 bg-rose-500/8' },
};

const DEFAULT_STYLE = { bg: 'from-primary/10 to-primary/5', icon: 'text-primary', badge: 'border-primary/30 text-primary/80 bg-primary/8' };

function getStyle(category: string) {
  return CATEGORY_STYLES[category] ?? DEFAULT_STYLE;
}

function getIcon(iconName?: string) {
  if (!iconName) return null;
  const IconComponent = (Icons as any)[iconName] as React.ComponentType<{ className?: string }>;
  return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
}

export function TutorialSelector() {
  const { startTutorialWithRoute } = useTutorial();
  const navigate = useNavigate();

  // Group by category
  const tutorialsByCategory = TUTORIAL_MODULES.reduce(
    (acc, tutorial) => {
      if (!acc[tutorial.category]) acc[tutorial.category] = [];
      acc[tutorial.category].push(tutorial);
      return acc;
    },
    {} as Record<string, typeof TUTORIAL_MODULES>
  );

  return (
    <div className="space-y-10">
      {Object.entries(tutorialsByCategory).map(([category, tutorials]) => {
        const style = getStyle(category);
        return (
          <section key={category}>
            {/* Category header */}
            <div className="flex items-center gap-3 mb-5">
              <div className={cn('h-px flex-1 bg-gradient-to-r from-border to-transparent')} />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
                {category}
              </span>
              <div className={cn('h-px flex-1 bg-gradient-to-l from-border to-transparent')} />
            </div>

            {/* Tutorial cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tutorials.map(tutorial => {
                const s = getStyle(tutorial.category);
                const stepCount = tutorial.steps.length;

                return (
                  <div
                    key={tutorial.moduleId}
                    className={cn(
                      'group relative rounded-2xl border border-border/60 bg-card overflow-hidden',
                      'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/8',
                      'transition-all duration-300 ease-out hover:-translate-y-0.5',
                    )}
                  >
                    {/* Card gradient top stripe */}
                    <div className={cn('h-[2px] w-full bg-gradient-to-r', s.bg.replace(/\/\d+/g, '').replace('from-', 'from-').replace('to-', 'to-'))} />

                    {/* Card body */}
                    <div className="p-5">
                      {/* Icon + badges row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          `bg-gradient-to-br ${s.bg}`,
                          'border border-border/50 shadow-sm',
                          s.icon,
                          'group-hover:scale-105 transition-transform duration-200'
                        )}>
                          {getIcon(tutorial.icon)}
                        </div>

                        {/* Step count badge */}
                        <Badge variant="outline" className={cn('text-[10px] font-bold h-5 px-2', s.badge)}>
                          {stepCount} pasos
                        </Badge>
                      </div>

                      {/* Title & description */}
                      <h3 className="font-bold text-foreground text-sm mb-1.5 leading-snug">
                        {tutorial.moduleName}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                        {tutorial.description}
                      </p>

                      {/* Step preview dots */}
                      <div className="flex items-center gap-1 mb-4">
                        {Array.from({ length: Math.min(stepCount, 8) }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-1 rounded-full bg-muted',
                              i === 0 ? 'w-3' : 'w-1.5',
                              'group-hover:bg-primary/30 transition-colors duration-300',
                            )}
                            style={{ transitionDelay: `${i * 25}ms` }}
                          />
                        ))}
                        {stepCount > 8 && (
                          <span className="text-[9px] text-muted-foreground/60 ml-0.5">+{stepCount - 8}</span>
                        )}
                      </div>

                      {/* Footer: time + CTA */}
                      <div className="flex items-center justify-between">
                        {tutorial.estimatedTime ? (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{tutorial.estimatedTime} min</span>
                          </div>
                        ) : (
                          <div />
                        )}

                        <Button
                          size="sm"
                          onClick={() => startTutorialWithRoute(tutorial.moduleId, tutorial.route, navigate)}
                          className={cn(
                            'h-7 px-3 text-xs rounded-xl font-semibold gap-1.5',
                            'bg-primary/10 text-primary border border-primary/20',
                            'hover:bg-primary hover:text-primary-foreground hover:border-primary',
                            'transition-all duration-200 shadow-none hover:shadow-sm hover:shadow-primary/20',
                          )}
                          variant="outline"
                        >
                          <Play className="h-3 w-3" />
                          Empezar
                          <ChevronRight className="h-3 w-3 opacity-60" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Bottom tip */}
      <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/30 p-4 text-sm text-muted-foreground">
        <span className="text-base mt-0.5">💡</span>
        <p>
          <span className="font-semibold text-foreground/80">Tip:</span> Puedes saltar cualquier tutorial en el momento que quieras. 
          También disponibles desde el botón <span className="font-semibold text-foreground/80">❓</span> flotante en la esquina inferior derecha, en cualquier pantalla.
        </p>
      </div>
    </div>
  );
}
