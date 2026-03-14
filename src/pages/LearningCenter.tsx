// ============================================================
// Learning Center - Página principal de tutoriales
// ============================================================

import React from 'react';
import { TutorialSelector } from '@/components/learning/TutorialSelector';
import { TutorialRunner } from '@/components/learning/TutorialRunner';
import { useTutorial } from '@/hooks/useTutorial';

export default function LearningCenterPage() {
  const { isRunning } = useTutorial();

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {isRunning ? (
          <TutorialRunner />
        ) : (
          <TutorialSelector />
        )}
      </div>
    </div>
  );
}
