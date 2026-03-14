import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Plus,
  TrendingUp,
  ArrowLeftRight,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface InventoryQuickActionsProps {
  onNewProduct?: () => void;
}

export function InventoryQuickActions({ onNewProduct }: InventoryQuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Nuevo Producto",
      icon: Plus,
      description: "Agregar producto al inventario",
      action: onNewProduct || (() => navigate("/products")),
    },
    {
      label: "Stock Bajo",
      icon: AlertTriangle,
      description: "Ver productos con stock bajo",
      action: () => navigate("/inventory-alerts"),
    },
    {
      label: "Transferencias",
      icon: ArrowLeftRight,
      description: "Transferir entre depósitos",
      action: () => navigate("/warehouse-transfers"),
    },
    {
      label: "Depósitos",
      icon: Package,
      description: "Gestionar depósitos y ubicaciones",
      action: () => navigate("/warehouses"),
    },
    {
      label: "Stock por Depósito",
      icon: TrendingUp,
      description: "Ver distribución de stock",
      action: () => navigate("/warehouse-stock"),
    },
    {
      label: "Reportes",
      icon: FileText,
      description: "Análisis y datos del inventario",
      action: () => navigate("/reports?tab=inventory"),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto p-3 flex flex-col items-start gap-1 hover:bg-accent"
            onClick={action.action}
          >
            <div className="flex items-center gap-2 w-full">
              <Icon className="h-4 w-4" />
              <span className="font-medium text-sm">{action.label}</span>
            </div>
            <span className="text-xs text-muted-foreground text-left">
              {action.description}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
