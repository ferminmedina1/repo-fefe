'use client';

import React from 'react';
import { Grid3x3, Zap, Plus, ChevronDown, Sparkles, Layout, Wand2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
      {/* Dashboard Selector - Top Bar with futuristic styling */}
      {dashboards && dashboards.length > 0 && (
        <div className="absolute top-6 right-6 flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 backdrop-blur-sm shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <label className="text-sm font-semibold text-foreground">Panel de Control:</label>
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
              <SelectTrigger className={cn(
                "w-48 transition-all duration-300",
                "bg-gradient-to-r from-background/40 to-background/20",
                "border border-purple-500/30 hover:border-purple-500/70",
                "shadow-[0_0_15px_rgba(168,85,247,0.15)]",
                "hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]",
                "text-foreground"
              )}>
                <SelectValue placeholder="Selecciona un panel" />
              </SelectTrigger>
              <SelectContent className="bg-background/80 backdrop-blur-xl border-border/50 shadow-[0_8_32px_rgba(0,0,0,0.4)]">
                {dashboards.map((dashboard) => (
                  <SelectItem key={dashboard.id} value={dashboard.id} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      {dashboard.is_default && (
                        <span className="text-xs font-bold text-emerald-400">✓</span>
                      )}
                      <span className="text-sm">{dashboard.name}</span>
                    </div>
                  </SelectItem>
                ))}
                <hr className="my-2 border-border/30" />
                <SelectItem value="__new__" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-purple-400 font-medium">
                    <Plus className="w-4 h-4" />
                    <span>Crear nuevo panel</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Animated background blobs - enhanced */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Primary glow blob */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-br from-cyan-500/30 to-blue-500/10 rounded-full blur-3xl animate-pulse" />
        
        {/* Secondary glow blob */}
        <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-gradient-to-br from-purple-500/25 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        
        {/* Tertiary glow blob */}
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-br from-emerald-500/20 to-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2.5s' }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-small opacity-[0.02]" />
      </div>

      <div className="max-w-4xl w-full space-y-12 animate-in fade-in duration-700">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          {/* Icon with enhanced glow and animation */}
          <div className="relative inline-flex mx-auto">
            {/* Outer glow ring */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 rounded-full blur-3xl opacity-40 animate-pulse" />
            
            {/* Inner glowing icon container */}
            <div 
              className={cn(
                "relative w-24 h-24 rounded-full",
                "bg-gradient-to-br from-cyan-500/30 to-purple-500/20",
                "border-2 border-gradient-to-r border-cyan-500/50 backdrop-blur-xl",
                "flex items-center justify-center",
                "shadow-[0_0_40px_rgba(34,211,238,0.4), inset_0_0_30px_rgba(34,211,238,0.2)]",
                "animate-in zoom-in duration-700"
              )}
            >
              <Sparkles className="w-12 h-12 text-cyan-300 animate-pulse" />
            </div>
          </div>

          {/* Headline with gradient text */}
          <div className="space-y-4">
            <h1 className={cn(
              DASHBOARD_DESIGN.typography.hero,
              "text-foreground",
              "bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent",
              "animate-in fade-in slide-in-from-bottom-4 duration-700"
            )}>
              Construí tu Panel de Control Futurista
            </h1>
            <p className={cn(
              DASHBOARD_DESIGN.typography.caption,
              "text-lg max-w-2xl mx-auto text-muted-foreground",
              "animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100"
            )}>
              Empieza con una plantilla prearmada o diseña desde cero. Animaciones suaves, efectos modernos y máxima personalización.
            </p>
          </div>
        </div>

        {/* CTA Cards - Enhanced with futuristic design */}
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          {/* Template Card - Cyan/Blue theme */}
          <Card 
            className={cn(
              "group relative overflow-hidden",
              "border-2 border-cyan-500/30 hover:border-cyan-500/70",
              "bg-gradient-to-br from-cyan-500/8 to-blue-500/8",
              "hover:from-cyan-500/15 hover:to-blue-500/15",
              "backdrop-blur-xl",
              "shadow-[0_0_30px_rgba(34,211,238,0.2)]",
              "hover:shadow-[0_0_50px_rgba(34,211,238,0.4)]",
              "transition-all duration-500 ease-out",
              "p-8",
              "hover:scale-105 hover:-translate-y-1"
            )}
          >
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-blue-400/10" />
            </div>

            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500">
              <div className="absolute -inset-full h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="relative space-y-5 z-10">
              {/* Icon container with glow */}
              <div className={cn(
                "w-16 h-16 rounded-xl",
                "bg-gradient-to-br from-cyan-500/20 to-blue-500/10",
                "border border-cyan-500/30 hover:border-cyan-500/70",
                "flex items-center justify-center",
                "shadow-[0_0_20px_rgba(34,211,238,0.3)]",
                "group-hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]",
                "transition-all duration-300",
                "group-hover:scale-110 group-hover:rotate-3"
              )}>
                <Layout className="w-8 h-8 text-cyan-300" />
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className={cn(
                    DASHBOARD_DESIGN.typography.subheading,
                    "text-foreground"
                  )}>
                    Usar una Plantilla
                  </h3>
                  <Zap className="w-4 h-4 text-yellow-400" />
                </div>
                <p className={cn(
                  DASHBOARD_DESIGN.typography.caption,
                  "line-clamp-3 text-muted-foreground"
                )}>
                  Empieza con dashboards preconstruidos para SaaS, ecommerce, inventario y más. Personalizables al 100%.
                </p>
              </div>

              {/* CTA Button */}
              <Button 
                onClick={onChooseTemplate}
                className={cn(
                  "w-full mt-4 group/btn relative overflow-hidden",
                  "h-11 font-semibold text-base",
                  "bg-gradient-to-r from-cyan-500 to-blue-500",
                  "hover:from-cyan-400 hover:to-blue-400",
                  "text-white",
                  "border border-cyan-300/30",
                  "shadow-[0_0_20px_rgba(34,211,238,0.4)]",
                  "hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]",
                  "transition-all duration-300",
                  "group-hover/btn:gap-3",
                  "active:scale-95"
                )}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Explorar Plantillas
                  <Zap className="w-4 h-4 group-hover/btn:animate-pulse" />
                </span>
              </Button>
            </div>
          </Card>

          {/* Free Builder Card - Purple/Pink theme */}
          <Card 
            className={cn(
              "group relative overflow-hidden",
              "border-2 border-purple-500/30 hover:border-purple-500/70",
              "bg-gradient-to-br from-purple-500/8 to-pink-500/8",
              "hover:from-purple-500/15 hover:to-pink-500/15",
              "backdrop-blur-xl",
              "shadow-[0_0_30px_rgba(168,85,247,0.2)]",
              "hover:shadow-[0_0_50px_rgba(168,85,247,0.4)]",
              "transition-all duration-500 ease-out",
              "p-8",
              "hover:scale-105 hover:-translate-y-1"
            )}
          >
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 via-transparent to-pink-400/10" />
            </div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500">
              <div className="absolute -inset-full h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="relative space-y-5 z-10">
              {/* Icon container with glow */}
              <div className={cn(
                "w-16 h-16 rounded-xl",
                "bg-gradient-to-br from-purple-500/20 to-pink-500/10",
                "border border-purple-500/30 hover:border-purple-500/70",
                "flex items-center justify-center",
                "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
                "group-hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]",
                "transition-all duration-300",
                "group-hover:scale-110 group-hover:-rotate-3"
              )}>
                <Wand2 className="w-8 h-8 text-purple-300" />
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className={cn(
                    DASHBOARD_DESIGN.typography.subheading,
                    "text-foreground"
                  )}>
                    Constructor Libre
                  </h3>
                  <Sparkles className="w-4 h-4 text-pink-400" />
                </div>
                <p className={cn(
                  DASHBOARD_DESIGN.typography.caption,
                  "line-clamp-3 text-muted-foreground"
                )}>
                  Diseña tu dashboard desde cero con un editor visual potente. Arrastra, configura y personaliza cada widget.
                </p>
              </div>

              {/* CTA Button */}
              <Button 
                onClick={onChooseFreeBuilder}
                className={cn(
                  "w-full mt-4 group/btn relative overflow-hidden",
                  "h-11 font-semibold text-base",
                  "bg-gradient-to-r from-purple-500 to-pink-500",
                  "hover:from-purple-400 hover:to-pink-400",
                  "text-white",
                  "border border-purple-300/30",
                  "shadow-[0_0_20px_rgba(168,85,247,0.4)]",
                  "hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]",
                  "transition-all duration-300",
                  "group-hover/btn:gap-3",
                  "active:scale-95"
                )}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Empezar Vacío
                  <Plus className="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
                </span>
              </Button>
            </div>
          </Card>
        </div>

        {/* Tips Section - Enhanced */}
        <div className={cn(
          "rounded-xl border-2 border-emerald-500/30",
          "bg-gradient-to-r from-emerald-500/10 to-cyan-500/10",
          "backdrop-blur-xl p-6 md:p-8",
          "shadow-[0_0_30px_rgba(16,185,129,0.2)]",
          "animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300"
        )}>
          <p className={cn(
            DASHBOARD_DESIGN.typography.caption,
            "text-sm text-foreground text-center flex items-center justify-center gap-2"
          )}>
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span className="font-medium">
              Podés cambiar de plantilla cuando quieras o combinar elementos de varios. Sin límites de edición.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
