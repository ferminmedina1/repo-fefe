import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Users,
  Package,
  ShoppingBag,
  Building2,
  Wrench,
  Calculator,
  BarChart3,
  Settings,
  Plug,
  Mail,
  Bell,
  Receipt,
  BookOpen,
  UserCheck,
  X,
  Loader2,
} from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";

// Mapeo de codes a íconos específicos para cada módulo
const MODULE_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  ventas: FileText,
  clientes: Users,
  inventario: Package,
  compras: ShoppingBag,
  finanzas: Building2,
  operaciones: Wrench,
  rrhh: Calculator,
  reportes: BarChart3,
  administracion: Settings,
  integraciones: Plug,
  bulk_email: Mail,
  notifications: Bell,
  accounts_receivable: Receipt,
  accountant_reports: BookOpen,
  customer_support: UserCheck,
};

interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  route: string | null;
}

interface ModulesNavigationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModulesNavigationPanel({
  open,
  onOpenChange,
}: ModulesNavigationPanelProps) {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();

  // Obtener módulos activos de la empresa
  const { data: activeModules = [], isLoading } = useQuery({
    queryKey: ["company-active-modules", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      // Get active modules for the company
      const { data, error } = await supabase
        .from("platform_modules")
        .select("id, code, name, description, category, route")
        .eq("is_active", true)
        .order("category")
        .order("display_order");

      if (error) {
        console.error("Error fetching modules:", error);
        throw error;
      }

      return (data as Module[]) || [];
    },
    enabled: open && !!currentCompany?.id,
  });

  // Agrupar módulos por categoría
  const groupedModules = useMemo(() => {
    return activeModules.reduce(
      (acc, module) => {
        const category = module.category || "otros";
        if (!acc[category]) acc[category] = [];
        acc[category].push(module);
        return acc;
      },
      {} as Record<string, Module[]>
    );
  }, [activeModules]);

  const handleModuleClick = (route: string | null) => {
    if (route) {
      navigate(route);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border-0 bg-background/80 backdrop-blur-xl">
        <style>{`
          @keyframes futuristicScan {
            0% {
              clip-path: inset(100% 0 0 0);
              opacity: 0;
            }
            100% {
              clip-path: inset(0 0 0 0);
              opacity: 1;
            }
          }

          @keyframes moduleEntrance {
            0% {
              opacity: 0;
              transform: scale(0.8) translateY(20px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          @keyframes glowPulse {
            0%, 100% {
              text-shadow: 0 0 0 rgba(var(--primary-rgb), 0);
              filter: drop-shadow(0 0 0 rgba(var(--primary-rgb), 0));
            }
            50% {
              text-shadow: 0 0 8px rgba(var(--primary-rgb), 0.3);
              filter: drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.3));
            }
          }

          .modules-grid-entrance {
            animation: futuristicScan 0.8s ease-out forwards;
          }

          .module-item {
            animation: moduleEntrance 0.6s ease-out forwards;
          }

          .module-icon-glow {
            animation: glowPulse 3s ease-in-out infinite;
          }
        `}</style>

        {/* Header minimalista */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 modules-grid-entrance">
          <div>
            <h1 className="text-3xl font-light tracking-tight">Módulos</h1>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Divider minimalista */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent modules-grid-entrance" />

        {/* Modules Grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center modules-grid-entrance">
              <Package className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground text-sm">
                No hay módulos activos
              </p>
            </div>
          ) : (
            <div className="px-6 py-8 space-y-12 modules-grid-entrance">
              {Object.entries(groupedModules).map(([categoryKey, modules]) => (
                <div key={categoryKey} className="space-y-4">
                  {/* Grid minimalista de módulos */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 xl:gap-8">
                    {modules.map((module, index) => {
                      const Icon = MODULE_ICONS[module.code] || Package;

                      return (
                        <button
                          key={module.code}
                          onClick={() => handleModuleClick(module.route)}
                          disabled={!module.route}
                          className={cn(
                            "group flex flex-col items-center gap-3 transition-all duration-500 module-item",
                            module.route
                              ? "cursor-pointer"
                              : "opacity-40 cursor-not-allowed"
                          )}
                          style={{
                            animationDelay: `${index * 50}ms`,
                          }}
                        >
                          {/* Icon - Ultra minimalista con efecto futurista */}
                          <div
                            className={cn(
                              "flex items-center justify-center transition-all duration-500 module-icon-glow",
                              module.route
                                ? "text-muted-foreground group-hover:text-primary group-hover:-translate-y-1 group-hover:scale-110"
                                : "text-muted-foreground/40"
                            )}
                          >
                            <Icon className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14" />
                          </div>

                          {/* Title - Ultra minimalista */}
                          <p
                            className={cn(
                              "text-xs sm:text-sm text-center leading-tight transition-all duration-500 font-medium",
                              module.route
                                ? "text-muted-foreground group-hover:text-foreground"
                                : "text-muted-foreground/40"
                            )}
                          >
                            {module.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
