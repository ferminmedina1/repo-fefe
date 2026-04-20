'use client';

import React from 'react';
import { Grid3x3, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DASHBOARD_DESIGN } from '@/lib/dashboard/design-tokens';

interface DashboardEmptyStateProps {
  onChooseTemplate: () => void;
  onChooseFreeBuilder: () => void;
}

export function DashboardEmptyState({ 
  onChooseTemplate, 
  onChooseFreeBuilder 
}: DashboardEmptyStateProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Animated background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-3xl w-full space-y-12 animate-in fade-in duration-500">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          {/* Icon with glow */}
          <div className="relative inline-flex mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-emerald-500 rounded-full blur-2xl opacity-30" />
            <div 
              className={`
                relative w-24 h-24 rounded-full 
                bg-gradient-to-br ${DASHBOARD_DESIGN.gradients.primary}
                border border-primary/20 backdrop-blur-xl
                flex items-center justify-center
              `}
            >
              <Grid3x3 className="w-12 h-12 text-primary" />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className={`${DASHBOARD_DESIGN.typography.hero} text-foreground`}>
              Construí tu Panel de Control
            </h1>
            <p className={`${DASHBOARD_DESIGN.typography.caption} text-lg max-w-xl mx-auto`}>
              Empieza con un template prearmado o diseña desde cero. Sin límites de creatividad.
            </p>
          </div>
        </div>

        {/* CTA Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Template Card */}
          <Card 
            className={`
              group relative overflow-hidden
              border border-primary/20 hover:border-primary/50
              bg-gradient-to-br ${DASHBOARD_DESIGN.gradients.primary}
              backdrop-blur-sm
              hover:shadow-lg ${DASHBOARD_DESIGN.transitions.base}
              p-6 md:p-8
            `}
          >
            {/* Animated gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative space-y-4">
              {/* Icon */}
              <div className={`
                w-14 h-14 rounded-lg
                bg-gradient-to-br from-primary/20 to-primary/5
                border border-primary/20
                flex items-center justify-center
                group-hover:scale-110 ${DASHBOARD_DESIGN.transitions.base}
              `}>
                <Zap className="w-7 h-7 text-primary" />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <h3 className={`${DASHBOARD_DESIGN.typography.subheading} text-foreground`}>
                  Usar un template
                </h3>
                <p className={`${DASHBOARD_DESIGN.typography.caption} line-clamp-2`}>
                  Empieza con dashboards preconstruidos para SaaS, ecommerce, inventario y más
                </p>
              </div>

              {/* CTA with arrow animation */}
              <Button 
                onClick={onChooseTemplate}
                className={`
                  w-full mt-2
                  bg-primary hover:bg-primary/90
                  text-primary-foreground font-semibold
                  ${DASHBOARD_DESIGN.transitions.fast}
                  group-hover:translate-x-0.5
                `}
              >
                Explorar templates
                <Zap className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>

          {/* Free Builder Card */}
          <Card 
            className={`
              group relative overflow-hidden
              border border-border/50 hover:border-border
              bg-card hover:bg-card/80
              hover:shadow-lg ${DASHBOARD_DESIGN.transitions.base}
              p-6 md:p-8
            `}
          >
            {/* Subtle animated border gradient */}
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-10 bg-gradient-to-r from-primary via-emerald-500 to-primary transition-opacity duration-300" />

            <div className="relative space-y-4">
              {/* Icon */}
              <div className={`
                w-14 h-14 rounded-lg
                bg-muted/50 border border-border/50
                flex items-center justify-center
                group-hover:scale-110 ${DASHBOARD_DESIGN.transitions.base}
              `}>
                <Plus className="w-7 h-7 text-muted-foreground" />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <h3 className={`${DASHBOARD_DESIGN.typography.subheading} text-foreground`}>
                  Constructor libre
                </h3>
                <p className={`${DASHBOARD_DESIGN.typography.caption} line-clamp-2`}>
                  Diseña tu dashboard desde cero agregando widgets personalizados
                </p>
              </div>

              {/* CTA */}
              <Button 
                onClick={onChooseFreeBuilder}
                variant="outline"
                className={`
                  w-full mt-2
                  border-border hover:border-foreground/30
                  font-semibold
                  ${DASHBOARD_DESIGN.transitions.fast}
                  group-hover:translate-x-0.5
                `}
              >
                Empezar vacío
                <Plus className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Tips Section */}
        <div className={`
          rounded-xl border border-border/50
          bg-gradient-to-r ${DASHBOARD_DESIGN.gradients.neutral}
          backdrop-blur-sm p-4 md:p-6
          text-center
        `}>
          <p className={`${DASHBOARD_DESIGN.typography.caption} text-sm`}>
            💡{' '}
            <span className="font-medium text-foreground">
              Podés cambiar de template cuando quieras o combinar elementos de varios
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
