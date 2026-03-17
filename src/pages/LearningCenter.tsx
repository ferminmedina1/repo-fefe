// ============================================================
// Learning Center - Página principal de tutoriales
// ============================================================

import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { TutorialSelector } from '@/components/learning/TutorialSelector';
import { useTutorial } from '@/hooks/useTutorial';
import { BookOpen, Sparkles, Clock, Layers } from 'lucide-react';
import { TUTORIAL_MODULES } from '@/lib/tutorial/config';

export default function LearningCenterPage() {
  const { isRunning } = useTutorial();

  const totalTutorials = TUTORIAL_MODULES.length;
  const avgTime = Math.round(
    TUTORIAL_MODULES.reduce((s, m) => s + (m.estimatedTime || 0), 0) / totalTutorials
  );
  const categories = new Set(TUTORIAL_MODULES.map(m => m.category)).size;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 p-8">
          {/* Decorative blobs */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-6 right-24 w-28 h-28 rounded-full bg-primary/8 blur-2xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shadow-lg shrink-0">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                <span className="text-xs font-bold text-primary/70 uppercase tracking-widest">Centro de Aprendizaje</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2 leading-tight">
                Aprende cada módulo<br className="hidden md:block" /> paso a paso
              </h1>
              <p className="text-muted-foreground text-sm max-w-lg">
                Tutoriales interactivos que resaltan cada elemento de la pantalla y te guían en tiempo real. Sin necesidad de manual.
              </p>
            </div>

            {/* Stats */}
            <div className="flex md:flex-col gap-4 md:gap-3 shrink-0">
              {[
                { icon: Layers, value: totalTutorials, label: 'Tutoriales' },
                { icon: Clock, value: `~${avgTime}m`, label: 'Promedio' },
                { icon: BookOpen, value: categories, label: 'Categorías' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-2 bg-background/60 border border-border/60 rounded-xl px-3 py-2">
                  <Icon className="h-4 w-4 text-primary/60 shrink-0" />
                  <div>
                    <p className="text-base font-bold text-foreground leading-none">{value}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tutorial grid */}
        {!isRunning && (
          <div className="max-w-6xl">
            <TutorialSelector />
          </div>
        )}
      </div>
    </Layout>
  );
}
