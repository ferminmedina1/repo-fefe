// ============================================================
// Learning Center - Página principal de tutoriales
// ============================================================

import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { TutorialSelector } from '@/components/learning/TutorialSelector';
import { useTutorial } from '@/hooks/useTutorial';
import { BookOpen } from 'lucide-react';

export default function LearningCenterPage() {
  const { isRunning } = useTutorial();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Centro de Aprendizaje</h1>
            <p className="text-muted-foreground">Tutoriales interactivos para aprender cada módulo paso a paso</p>
          </div>
        </div>

        {!isRunning && (
          <div className="max-w-6xl">
            <TutorialSelector />
          </div>
        )}
      </div>
    </Layout>
  );
}
