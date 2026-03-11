import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Search,
  X,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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

// Mapeo de categorías a nombres legibles
const CATEGORY_NAMES: Record<string, string> = {
  dashboard: "Dashboard",
  pos: "Punto de Venta",
  ventas: "Ventas",
  clientes: "Clientes",
  inventario: "Inventario",
  compras: "Compras",
  finanzas: "Finanzas",
  operaciones: "Operaciones",
  rrhh: "RRHH",
  reportes: "Reportes",
  administracion: "Administración",
  integraciones: "Integraciones",
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
  const [searchQuery, setSearchQuery] = useState("");

  // Obtener módulos activos de la empresa
  const { data: activeModules = [], isLoading } = useQuery({
    queryKey: ["company-active-modules", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("company_platform_modules")
        .select(`
          platform_modules (
            id,
            code,
            name,
            description,
            category,
            route
          )
        `)
        .eq("company_id", currentCompany.id)
        .eq("is_active", true);

      if (error) throw error;

      return (
        data
          ?.map((item: any) => item.platform_modules)
          .filter(Boolean) as Module[]
      ) || [];
    },
    enabled: open && !!currentCompany?.id,
  });

  // Agrupar módulos por categoría y filtrar
  const groupedModules = useMemo(() => {
    const filtered = activeModules.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.reduce(
      (acc, module) => {
        const category = module.category || "otros";
        if (!acc[category]) acc[category] = [];
        acc[category].push(module);
        return acc;
      },
      {} as Record<string, Module[]>
    );
  }, [activeModules, searchQuery]);

  const handleModuleClick = (route: string | null, code: string) => {
    if (route) {
      navigate(route);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex-1">
            <DialogTitle className="text-2xl font-bold">Módulos</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Acceso rápido a todos tus módulos activos
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative pb-4 border-b px-6 -mx-6">
          <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar módulo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Modules Grid */}
        <div className="flex-1 overflow-y-auto px-6 -mx-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                No hay módulos activos disponibles
              </p>
            </div>
          ) : Object.keys(groupedModules).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                No se encontraron módulos con "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="space-y-8 py-6">
              {Object.entries(groupedModules).map(([category, modules]) => (
                <div key={category}>
                  {/* Category Header */}
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-6">
                    {CATEGORY_NAMES[category] || category}
                  </h3>

                  {/* Modules Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-6">
                    {modules.map((module) => {
                      const Icon = MODULE_ICONS[module.code] || Package;

                      return (
                        <button
                          key={module.code}
                          onClick={() => handleModuleClick(module.route, module.code)}
                          disabled={!module.route}
                          className={cn(
                            "group flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-300",
                            module.route
                              ? "cursor-pointer hover:bg-primary/10 hover:shadow-lg hover:scale-105 active:scale-95 border border-border hover:border-primary/50"
                              : "opacity-50 cursor-not-allowed border border-border"
                          )}
                        >
                          {/* Icon Container */}
                          <div
                            className={cn(
                              "flex items-center justify-center w-16 h-16 rounded-lg transition-all",
                              module.route
                                ? "bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/40 group-hover:to-primary/10"
                                : "bg-muted"
                            )}
                          >
                            <Icon
                              className={cn(
                                "w-8 h-8 transition-colors",
                                module.route
                                  ? "text-primary group-hover:text-primary"
                                  : "text-muted-foreground"
                              )}
                            />
                          </div>

                          {/* Module Name */}
                          <div className="text-center min-h-10 flex items-center">
                            <p
                              className={cn(
                                "text-xs sm:text-sm font-semibold text-center leading-tight transition-colors",
                                module.route
                                  ? "text-foreground group-hover:text-primary"
                                  : "text-muted-foreground"
                              )}
                            >
                              {module.name}
                            </p>
                          </div>

                          {/* Tooltip description on hover */}
                          {module.description && (
                            <div
                              className={cn(
                                "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-background text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50",
                                !module.route && "hidden"
                              )}
                            >
                              {module.description}
                            </div>
                          )}
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
