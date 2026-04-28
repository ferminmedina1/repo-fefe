'use client';

import React from 'react';
import { Grid3x3, Zap, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DASHBOARD_DESIGN } from '@/lib/dashboard/design-tokens';
import { DashboardLayoutData } from '@/hooks/dashboard';

interface DashboardEmptyStateProps {
  onChooseTemplate: () => void;
  onChooseFreeBuilder: () => void;
  dashboards?: DashboardLayoutData[];
  selectedDashboardId?: string;
  onDashboardChange?: (dashboardId: string) => void;
  onCreateNewDashboard?: () => void;
  isLoadingDashboards?: boolean;
}

export function DashboardEmptyState({ 
  onChooseTemplate, 
  onChooseFreeBuilder,
  dashboards = [],
  selectedDashboardId,
  onDashboardChange,
  onCreateNewDashboard,
  isLoadingDashboards = false
}: DashboardEmptyStateProps) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Dashboard Selector - Top Bar */}
      {dashboards && dashboards.length > 0 && (
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Panel de Control:</label>
            <Select
              value={selectedDashboardId || ''}
              onValueChange={(value) => {
                if (value === '__new__') {
                  onCreateNewDashboard?.();
                } else if (onDashboardChange) {
                  onDashboardChange(value);
                }
              }}
              disabled={isLoadingDashboards}
            >
              <SelectTrigger className="w-48 bg-white/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-colors">
                <SelectValue placeholder="Selecciona un panel" />
              </SelectTrigger>
              <SelectContent>
                {dashboards.map((dashboard) => (
                  <SelectItem key={dashboard.id} value={dashboard.id}>
                    <div className="flex items-center gap-2">
                      {dashboard.is_default && (
                        <span className="text-xs font-semibold text-primary">✓</span>
                      )}
                      <span>{dashboard.name}</span>
                    </div>
                  </SelectItem>
                ))}
                <hr className="my-2" />
                <SelectItem value="__new__">
                  <div className="flex items-center gap-2 text-primary">
                    <Plus className="w-4 h-4" />
                    <span>Crear nuevo panel</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

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
              Empieza con una plantilla prearmada o diseña desde cero. Sin límites de creatividad.
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
                  Usar una plantilla
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
                Explorar plantillas
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
              Podés cambiar de plantilla cuando quieras o combinar elementos de varios
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
