import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AlertTriangle, 
  Calendar, 
  Package, 
  Search,
  MapPin,
  Loader2,
  DollarSign,
  Plus,
  Bell,
  Trash2,
  Power,
  Eye,
  Pencil,
  Boxes,
  Clock,
  Users,
  FileText,
  X,
  CheckCircle2,
  ChevronDown,
  CheckSquare,
  Zap,
  ExternalLink,
  AlertCircle,
  AlertOctagon,
  Info
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { CreateAlertDialog } from "@/components/inventory/CreateAlertDialog";

const CONDITION_LABELS: Record<string, string> = {
  stock_lte: "Stock menor o igual a",
  stock_eq_zero: "Sin stock",
  stock_gte: "Stock mayor o igual a",
};

const SCOPE_LABELS: Record<string, string> = {
  all: "Todos los productos",
  category: "Categoría",
  product: "Producto",
};

const NOTIFICATION_TYPES: Record<string, any> = {
  // Notificaciones operacionales
  low_stock: {
    label: "Stock Bajo",
    icon: Boxes,
    color: "bg-red-500/20 border-red-500/50",
    badge: "destructive",
    textColor: "text-red-600 dark:text-red-400",
    origin: "operational",
  },
  expiring_product: {
    label: "Próximo a Vencer",
    icon: Clock,
    color: "bg-amber-500/20 border-amber-500/50",
    badge: "default",
    textColor: "text-amber-600 dark:text-amber-400",
    origin: "operational",
  },
  inactive_customer: {
    label: "Cliente Inactivo",
    icon: Users,
    color: "bg-blue-500/20 border-blue-500/50",
    badge: "secondary",
    textColor: "text-blue-600 dark:text-blue-400",
    origin: "operational",
  },
  overdue_invoice: {
    label: "Factura Vencida",
    icon: FileText,
    color: "bg-red-500/20 border-red-500/50",
    badge: "destructive",
    textColor: "text-red-600 dark:text-red-400",
    origin: "operational",
  },
  expiring_check: {
    label: "Cheque por Vencer",
    icon: Calendar,
    color: "bg-orange-500/20 border-orange-500/50",
    badge: "default",
    textColor: "text-orange-600 dark:text-orange-400",
    origin: "operational",
  },
  // Notificaciones del sistema (platform_notifications)
  payment_overdue: {
    label: "Pago Vencido",
    icon: AlertOctagon,
    color: "bg-red-600/20 border-red-600/50",
    badge: "destructive",
    textColor: "text-red-700 dark:text-red-300",
    origin: "system",
  },
  payment_due: {
    label: "Pago Próximo",
    icon: DollarSign,
    color: "bg-amber-600/20 border-amber-600/50",
    badge: "default",
    textColor: "text-amber-700 dark:text-amber-300",
    origin: "system",
  },
  trial_ending: {
    label: "Prueba Terminando",
    icon: Zap,
    color: "bg-purple-500/20 border-purple-500/50",
    badge: "secondary",
    textColor: "text-purple-600 dark:text-purple-400",
    origin: "system",
  },
  subscription_ending: {
    label: "Suscripción Terminando",
    icon: AlertCircle,
    color: "bg-orange-600/20 border-orange-600/50",
    badge: "default",
    textColor: "text-orange-700 dark:text-orange-300",
    origin: "system",
  },
  new_support_ticket: {
    label: "Nuevo Ticket de Soporte",
    icon: Bell,
    color: "bg-blue-600/20 border-blue-600/50",
    badge: "secondary",
    textColor: "text-blue-700 dark:text-blue-300",
    origin: "system",
  },
};

// Función para obtener tipo de notificación con fallback
const getNotificationType = (type: string, origin: string = 'operational'): any => {
  return NOTIFICATION_TYPES[type] || {
    label: type.replace(/_/g, ' '),
    icon: Bell,
    color: "bg-slate-500/20 border-slate-500/50",
    badge: "outline",
    textColor: "text-slate-600 dark:text-slate-400",
    origin: origin,
  };
};

// Severidad para notificaciones del sistema
const SEVERITY_STYLES: Record<string, any> = {
  critical: {
    color: "bg-red-600/20 border-red-600/50",
    badge: "destructive",
    textColor: "text-red-700 dark:text-red-300",
  },
  error: {
    color: "bg-red-500/20 border-red-500/50",
    badge: "destructive",
    textColor: "text-red-600 dark:text-red-400",
  },
  warning: {
    color: "bg-amber-500/20 border-amber-500/50",
    badge: "default",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  info: {
    color: "bg-blue-500/20 border-blue-500/50",
    badge: "secondary",
    textColor: "text-blue-600 dark:text-blue-400",
  },
};

// Componente Skeleton
const NotificationSkeleton = () => (
  <Card className="p-4 border-l-4 border-muted">
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-3 bg-muted rounded animate-pulse w-full" />
        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
      </div>
    </div>
  </Card>
);

export default function InventoryAlerts() {
  const { currentCompany } = useCompany();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "my-alerts");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [notificationSearchQuery, setNotificationSearchQuery] = useState("");
  const [selectedNotificationTypes, setSelectedNotificationTypes] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('notificationFilterTypes');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [unreadOnly, setUnreadOnly] = useState(() => {
    const saved = localStorage.getItem('notificationFilterUnreadOnly');
    return saved ? JSON.parse(saved) : false;
  });
  const [notificationOriginFilter, setNotificationOriginFilter] = useState<'all' | 'operational' | 'system'>(() => {
    const saved = localStorage.getItem('notificationOriginFilter');
    return (saved as any) || 'all';
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Persistir filtros en localStorage
  useEffect(() => {
    localStorage.setItem('notificationFilterTypes', JSON.stringify(Array.from(selectedNotificationTypes)));
  }, [selectedNotificationTypes]);

  useEffect(() => {
    localStorage.setItem('notificationFilterUnreadOnly', JSON.stringify(unreadOnly));
  }, [unreadOnly]);

  useEffect(() => {
    localStorage.setItem('notificationOriginFilter', notificationOriginFilter);
  }, [notificationOriginFilter]);

  const { data: lowStockProducts, isLoading: loadingLowStock } = useQuery({
    queryKey: ["low-stock-products", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", currentCompany?.id)
        .eq("active", true)
        .order("stock", { ascending: true });

      if (error) throw error;
      
      // Filter products where stock <= min_stock
      return data?.filter(p => p.stock <= p.min_stock && p.min_stock > 0) || [];
    },
    enabled: !!currentCompany?.id,
  });

  const { data: expiringProducts, isLoading: loadingExpiring } = useQuery({
    queryKey: ["expiring-products", currentCompany?.id],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", currentCompany?.id)
        .not("expiration_date", "is", null)
        .lte("expiration_date", thirtyDaysFromNow.toISOString())
        .gte("expiration_date", new Date().toISOString())
        .eq("active", true)
        .order("expiration_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Currency alerts - detect significant rate changes
  const { data: currencyAlerts, isLoading: loadingCurrencyAlerts } = useQuery({
    queryKey: ["currency-alerts", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      // Get current rates
      const { data: currentRates, error: currentError } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("company_id", currentCompany.id);
      
      if (currentError) throw currentError;
      
      // Get rates from 24 hours ago
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      const { data: previousRates, error: previousError } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("company_id", currentCompany.id)
        .lte("updated_at", oneDayAgo.toISOString());
      
      if (previousError) throw previousError;
      
      // Calculate variations
      const alerts: any[] = [];
      const THRESHOLD_PERCENTAGE = 5; // Alert if change > 5%
      
      if (!currentRates || currentRates.length === 0) return alerts;
      
      currentRates.forEach(current => {
        const previous = previousRates?.find(p => p.currency === current.currency);
        if (previous && previous.rate > 0 && current.rate > 0) {
          const variation = ((current.rate - previous.rate) / previous.rate) * 100;
          if (Math.abs(variation) >= THRESHOLD_PERCENTAGE) {
            alerts.push({
              currency: current.currency,
              currentRate: current.rate,
              previousRate: previous.rate,
              variation: variation,
              severity: Math.abs(variation) >= 10 ? 'high' : 'medium',
              timestamp: current.updated_at
            });
          }
        }
      });
      
      return alerts;
    },
    enabled: !!currentCompany?.id,
  });

  // Custom alert rules
  const { data: alertRules, isLoading: loadingAlertRules } = useQuery({
    queryKey: ["inventory-alert-rules", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_alert_rules")
        .select("*")
        .eq("company_id", currentCompany?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  // Toggle alert rule active status
  const toggleAlertRule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("inventory_alert_rules")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-alert-rules"] });
      toast.success("Estado de alerta actualizado");
    },
    onError: () => toast.error("Error al actualizar la alerta"),
  });

  // Delete alert rule
  const deleteAlertRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inventory_alert_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-alert-rules"] });
      toast.success("Alerta eliminada");
    },
    onError: () => toast.error("Error al eliminar la alerta"),
  });

  const { data: notifications, refetch: refetchNotifications, isLoading: loadingNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  // Notificaciones del sistema (platform_notifications)
  const { data: systemNotifications, refetch: refetchSystemNotifications, isLoading: loadingSystemNotifications } = useQuery({
    queryKey: ["platform-notifications", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from("platform_notifications")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (error) {
      toast.error("Error al marcar como leída");
      return;
    }

    refetchNotifications();
  };

  // Marcar notificación del sistema como leída
  const markSystemAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("platform_notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (error) {
      toast.error("Error al marcar como leída");
      return;
    }

    refetchSystemNotifications();
  };

  // Marcar todos como leídos (filtrados)
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", filteredNotifications.map(n => n.id));
      if (error) throw error;
    },
    onSuccess: () => {
      refetchNotifications();
      toast.success("Todas las notificaciones marcadas como leídas");
    },
    onError: () => toast.error("Error al marcar notificaciones"),
  });

  // Eliminar notificación individual
  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchNotifications();
      toast.success("Notificación eliminada");
    },
    onError: () => toast.error("Error al eliminar"),
  });

  // Eliminar todas (filtradas)
  const deleteAllFiltered = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", filteredNotifications.map(n => n.id));
      if (error) throw error;
    },
    onSuccess: () => {
      refetchNotifications();
      toast.success("Notificaciones eliminadas");
    },
    onError: () => toast.error("Error al eliminar notificaciones"),
  });

  // Combinar ambas notificaciones
  const allNotifications = [
    ...(notifications || []).map(n => ({ ...n, origin: 'operational' as const })),
    ...(systemNotifications || []).map(n => ({ 
      ...n, 
      origin: 'system' as const,
      type: n.notification_type, // Mapear para compatibilidad
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filtro mejorado de notificaciones
  const filteredNotifications = allNotifications.filter((notification) => {
    // Filtro por origen
    if (notificationOriginFilter !== 'all' && notification.origin !== notificationOriginFilter) {
      return false;
    }

    // Filtro por tipo si hay alguno seleccionado
    if (selectedNotificationTypes.size > 0 && !selectedNotificationTypes.has(notification.type)) {
      return false;
    }
    
    // Filtro por estado de lectura
    if (unreadOnly && notification.read) {
      return false;
    }
    
    // Búsqueda por texto
    if (notificationSearchQuery.trim()) {
      const query = notificationSearchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Notificaciones para mostrar con paginación
  const displayedNotifications = filteredNotifications.slice(0, displayLimit);
  const unreadCount = allNotifications.filter(n => !n.read).length || 0;

  // Helper para obtener url según tipo de notificación
  const getNavigationUrl = (notification: any) => {
    const data = notification.data || {};
    switch (notification.type) {
      case 'low_stock':
      case 'expiring_product':
        return `/products?search=${encodeURIComponent(data.product_name || '')}`;
      case 'inactive_customer':
        return `/customers?search=${encodeURIComponent(data.customer_name || '')}`;
      case 'overdue_invoice':
      case 'expiring_check':
        return `/sales/invoices`;
      default:
        return '#';
    }
  };

  // Helper para obtener tabla según tipo
  const getDataTable = (notification: any) => {
    switch (notification.type) {
      case 'low_stock':
      case 'expiring_product':
        return notification.data?.product_name;
      case 'inactive_customer':
        return notification.data?.customer_name;
      default:
        return null;
    }
  };

  const filteredLowStock = lowStockProducts?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredExpiring = expiringProducts?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.batch_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Alertas de Inventario</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Monitoreo de stock bajo y productos próximos a vencer
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Alertas
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Stock Bajo</p>
              <p className="text-2xl font-bold">{lowStockProducts?.length || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Próximos a Vencer</p>
              <p className="text-2xl font-bold">{expiringProducts?.length || 0}</p>
            </div>
            <Calendar className="h-8 w-8 text-warning" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Alertas de Monedas</p>
              <p className="text-2xl font-bold">{currencyAlerts?.length || 0}</p>
              {currencyAlerts && currencyAlerts.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {currencyAlerts.filter((a: any) => a.severity === 'high').length} alta prioridad
                </p>
              )}
            </div>
            <DollarSign className="h-8 w-8 text-amber-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Notificaciones Sin Leer</p>
              <p className="text-2xl font-bold">
                {notifications?.filter((n) => !n.read).length || 0}
              </p>
            </div>
            <Package className="h-8 w-8 text-primary" />
          </div>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar productos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="my-alerts" className="flex-1 min-w-[100px] text-xs sm:text-sm">Mis Alertas</TabsTrigger>
          <TabsTrigger value="low-stock" className="flex-1 min-w-[100px] text-xs sm:text-sm">Stock Bajo</TabsTrigger>
          <TabsTrigger value="expiring" className="flex-1 min-w-[100px] text-xs sm:text-sm">Próx. Vencer</TabsTrigger>
          <TabsTrigger value="currency" className="flex-1 min-w-[100px] text-xs sm:text-sm">Monedas</TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 min-w-[100px] text-xs sm:text-sm flex items-center gap-1">
            Notificaciones
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs ml-1">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Mis Alertas - custom alert rules */}
        <TabsContent value="my-alerts" className="space-y-4">
          {loadingAlertRules ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : alertRules?.length === 0 ? (
            <Card className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <Bell className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">No tenés alertas personalizadas</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Creá tu primera alerta para monitorear el stock automáticamente.
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera alerta
              </Button>
            </Card>
          ) : (
            alertRules?.map((rule) => (
              <Card key={rule.id} className={`p-4 ${!rule.active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">
                        {rule.name || CONDITION_LABELS[rule.condition_type] || rule.condition_type}
                      </h3>
                      <Badge variant={rule.active ? 'default' : 'secondary'}>
                        {rule.active ? 'Activa' : 'Inactiva'}
                      </Badge>
                      {rule.condition_type !== 'stock_eq_zero' && (
                        <Badge variant="outline">Umbral: {rule.threshold} uds</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {SCOPE_LABELS[rule.scope] || rule.scope}
                        {rule.scope === 'category' && rule.scope_category && `: ${rule.scope_category}`}
                      </span>
                      <span>•</span>
                      <span>{CONDITION_LABELS[rule.condition_type] || rule.condition_type}</span>
                      {rule.condition_type !== 'stock_eq_zero' && (
                        <span className="font-medium">{rule.threshold} unidades</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Creada {formatDistanceToNow(new Date(rule.created_at), { addSuffix: true, locale: es })}</span>
                      {rule.triggered_count > 0 && (
                        <span>• Disparada {rule.triggered_count} {rule.triggered_count === 1 ? 'vez' : 'veces'}</span>
                      )}
                      {rule.notify_email && <Badge variant="outline" className="text-xs">Email</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={rule.active}
                      onCheckedChange={(checked) => toggleAlertRule.mutate({ id: rule.id, active: checked })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingRule(rule);
                        setCreateDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('¿Eliminar esta alerta?')) {
                          deleteAlertRule.mutate(rule.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          {loadingLowStock ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredLowStock?.length === 0 ? (
            <Card className="p-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
                <div>
                  <p className="font-medium text-sm">Sin productos con stock bajo</p>
                  <p className="text-xs text-muted-foreground">Tu inventario está en óptimo nivel</p>
                </div>
              </div>
            </Card>
          ) : (
            filteredLowStock?.map((product) => (
              <Card key={product.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      <Badge variant="destructive">
                        Stock: {product.stock} / Min: {product.min_stock}
                      </Badge>
                    </div>
                    {product.sku && (
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    )}
                    {product.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {product.location}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/products?search=${encodeURIComponent(product.name)}`)}
                  >
                    Ver Detalles
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="expiring" className="space-y-4">
          {loadingExpiring ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredExpiring?.length === 0 ? (
            <Card className="p-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-600/40" />
                <div>
                  <p className="font-medium text-sm">Sin productos próximos a vencer</p>
                  <p className="text-xs text-muted-foreground">Todos tus productos tienen plazo suficiente</p>
                </div>
              </div>
            </Card>
          ) : (
            filteredExpiring?.map((product) => (
              <Card key={product.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      <Badge variant="destructive">
                        Vence{" "}
                        {formatDistanceToNow(new Date(product.expiration_date), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </Badge>
                    </div>
                    {product.batch_number && (
                      <p className="text-sm text-muted-foreground">
                        Lote: {product.batch_number}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Fecha de vencimiento:{" "}
                      {new Date(product.expiration_date).toLocaleDateString("es")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Stock disponible: {product.stock} unidades
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/products?search=${encodeURIComponent(product.name)}`)}
                  >
                    Ver Detalles
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="currency" className="space-y-4">
          {loadingCurrencyAlerts ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : currencyAlerts?.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No hay variaciones significativas en las cotizaciones
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Se alertan variaciones mayores al 5% en las últimas 24 horas
              </p>
            </Card>
          ) : (
            currencyAlerts?.map((alert, index) => {
              const isPositive = alert.variation > 0;
              const Icon = isPositive ? AlertTriangle : AlertTriangle;
              
              return (
                <Card 
                  key={index} 
                  className={`p-4 border-l-4 ${
                    alert.severity === 'high' 
                      ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' 
                      : 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-6 w-6 ${alert.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            {alert.currency}
                            <Badge variant={alert.severity === 'high' ? 'destructive' : 'default'}>
                              {isPositive ? '↑' : '↓'} {Math.abs(alert.variation).toFixed(2)}%
                            </Badge>
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Variación significativa en las últimas 24 horas
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Cotización Anterior:</p>
                          <p className="font-semibold">$ {alert.previousRate.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Cotización Actual:</p>
                          <p className="font-semibold text-lg">$ {alert.currentRate.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Última actualización: {formatDistanceToNow(new Date(alert.timestamp), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </div>

                      {alert.severity === 'high' && (
                        <div className="p-3 bg-background rounded-lg border border-border">
                          <p className="text-sm font-medium mb-1">⚠️ Acción Recomendada</p>
                          <p className="text-xs text-muted-foreground">
                            {isPositive 
                              ? `Considera actualizar tus precios en ${alert.currency} para mantener la rentabilidad` 
                              : `Buen momento para comprar productos valuados en ${alert.currency}`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/products")}
                    >
                      Revisar Productos
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-2">
          {/* Filtros y búsqueda */}
          <div className="space-y-2">
            {/* Buscador y Dropdown */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar notificaciones..."
                  value={notificationSearchQuery}
                  onChange={(e) => setNotificationSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {notificationSearchQuery && (
                  <button
                    onClick={() => setNotificationSearchQuery("")}
                    className="absolute right-3 top-3"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              {/* Dropdown de tipos */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="shrink-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-semibold">Tipos de Notificaciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {Object.entries(NOTIFICATION_TYPES).map(([typeKey, typeInfo]) => {
                    const Icon = typeInfo.icon;
                    const isChecked = selectedNotificationTypes.has(typeKey);
                    const count = notifications?.filter(n => n.type === typeKey).length || 0;
                    
                    return (
                      <DropdownMenuCheckboxItem
                        key={typeKey}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const newTypes = new Set(selectedNotificationTypes);
                          if (checked) {
                            newTypes.add(typeKey);
                          } else {
                            newTypes.delete(typeKey);
                          }
                          setSelectedNotificationTypes(newTypes);
                        }}
                        className="cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{typeInfo.label}</span>
                        </div>
                        <Badge variant="outline" className="text-xs ml-2">
                          {count}
                        </Badge>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                  
                  <DropdownMenuSeparator />
                  {selectedNotificationTypes.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedNotificationTypes(new Set())}
                      className="w-full justify-center text-xs"
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Toggle para mostrar solo sin leer y botones de acción */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setUnreadOnly(!unreadOnly)}>
                <CheckCircle2 className={`h-4 w-4 transition-colors ${unreadOnly ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">
                  {unreadOnly ? 'Solo sin leer' : 'Todas'}
                </span>
              </div>

              {/* Selector de origen de notificaciones */}
              <div className="flex gap-1 items-center border rounded-lg bg-background">
                <button
                  onClick={() => setNotificationOriginFilter('all')}
                  className={`px-3 py-2 text-sm font-medium transition-all ${
                    notificationOriginFilter === 'all'
                      ? 'text-primary border-r'
                      : 'text-muted-foreground border-r hover:text-foreground'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setNotificationOriginFilter('operational')}
                  className={`px-3 py-2 text-sm font-medium transition-all border-r ${
                    notificationOriginFilter === 'operational'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Operacionales
                </button>
                <button
                  onClick={() => setNotificationOriginFilter('system')}
                  className={`px-3 py-2 text-sm font-medium transition-all ${
                    notificationOriginFilter === 'system'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sistema
                </button>
              </div>

              {/* Botón marcar todo como leído */}
              {filteredNotifications.some(n => !n.read) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(`¿Marcar ${filteredNotifications.filter(n => !n.read).length} como leída${filteredNotifications.filter(n => !n.read).length !== 1 ? 's' : ''}?`)) {
                      markAllAsRead.mutate();
                    }
                  }}
                  disabled={markAllAsRead.isPending}
                  className="gap-1"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span className="text-xs">Leer todas</span>
                </Button>
              )}

              {/* Botón eliminar todas */}
              {filteredNotifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(`¿Eliminar ${filteredNotifications.length} notificación${filteredNotifications.length !== 1 ? 'es' : ''}?`)) {
                      deleteAllFiltered.mutate();
                    }
                  }}
                  disabled={deleteAllFiltered.isPending}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-xs">Eliminar</span>
                </Button>
              )}
            </div>

            {/* Resumen de resultados */}
            {(notificationSearchQuery || selectedNotificationTypes.size > 0 || unreadOnly || notificationOriginFilter !== 'all') && (
              <div className="text-sm text-muted-foreground">
                Mostrando {filteredNotifications.length} de {allNotifications.length} notificaciones
                {notificationOriginFilter !== 'all' && (
                  <span> • {notificationOriginFilter === 'operational' ? 'Operacionales' : 'Sistema'}</span>
                )}
                {selectedNotificationTypes.size > 0 && (
                  <span> • Filtros: {selectedNotificationTypes.size} tipo{selectedNotificationTypes.size !== 1 ? 's' : ''}</span>
                )}
                {unreadOnly && <span> • Sin leer</span>}
              </div>
            )}
          </div>

          {/* Notificaciones */}
          {loadingNotifications || loadingSystemNotifications ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : notifications?.length === 0 ? (
            <Card className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <Bell className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">No hay notificaciones</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Las notificaciones de alertas aparecerán aquí
                </p>
              </div>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay notificaciones que coincidan con los filtros</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotificationSearchQuery("");
                  setSelectedNotificationTypes(new Set());
                  setUnreadOnly(false);
                }}
                className="mt-2"
              >
                Limpiar filtros
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              <TooltipProvider>
                {displayedNotifications.map((notification) => {
                  const isSystemNotification = notification.origin === 'system';
                  const severityInfo = isSystemNotification ? SEVERITY_STYLES[notification.severity || 'info'] : null;
                  const typeInfo = isSystemNotification && severityInfo ? severityInfo : getNotificationType(notification.type, notification.origin);
                  const Icon = typeInfo?.icon || Bell;
                  const navUrl =  isSystemNotification ? '#' : getNavigationUrl(notification);
                  
                  return (
                    <Card
                      key={notification.id}
                      className={`p-4 border-l-4 transition-all ${
                        typeInfo?.color || 'bg-background border-border'
                      } ${!notification.read ? 'ring-1 ring-primary/50' : 'opacity-75'}`}
                    >
                      <div className="flex items-start gap-4 justify-between">
                        <div className="flex gap-3 flex-1 min-w-0">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeInfo?.color || 'bg-background'}`}>
                            <Icon className={`h-4 w-4 ${typeInfo?.textColor || 'text-foreground'}`} />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold truncate">{notification.title}</h3>
                              {isSystemNotification ? (
                                <>
                                  <Badge variant={typeInfo?.badge as any || 'secondary'} className="text-xs flex-shrink-0">
                                    {notification.notification_type}
                                  </Badge>
                                  <Badge 
                                    variant={
                                      notification.severity === 'critical' ? 'destructive' : 
                                      notification.severity === 'warning' ? 'default' : 
                                      'secondary'
                                    } 
                                    className="text-xs flex-shrink-0"
                                  >
                                    {notification.severity || 'info'}
                                  </Badge>
                                </>
                              ) : (
                                <Badge variant={typeInfo?.badge as any || 'secondary'} className="text-xs flex-shrink-0">
                                  {typeInfo?.label || notification.type}
                                </Badge>
                              )}
                              {!notification.read && (
                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-muted-foreground mt-2 cursor-help">
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                    locale: es,
                                  })}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{format(new Date(notification.created_at), 'PPP p', { locale: es })}</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Info adicional según tipo */}
                            {!isSystemNotification && getDataTable(notification) && (
                              <p className="text-xs text-muted-foreground mt-1 font-medium">
                                {getDataTable(notification)}
                              </p>
                            )}

                            {/* Etiqueta de origen */}
                            {isSystemNotification && (
                              <p className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1">
                                <Zap className="h-3 w-3" /> Del Sistema
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {/* Botón ver/navegar */}
                          {!isSystemNotification && navUrl !== '#' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => navigate(navUrl)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalles</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Botón marcar como leído */}
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => isSystemNotification ? markSystemAsRead(notification.id) : markAsRead(notification.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Botón eliminar */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm('¿Eliminar esta notificación?')) {
                                    deleteNotification.mutate(notification.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </TooltipProvider>

              {/* Botón "Cargar más" */}
              {displayLimit < filteredNotifications.length && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayLimit(prev => prev + 20)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Cargar más ({filteredNotifications.length - displayLimit} restantes)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
      <CreateAlertDialog
        open={createDialogOpen}
        onOpenChange={(v) => {
          setCreateDialogOpen(v);
          if (!v) setEditingRule(null);
        }}
        editingRule={editingRule}
      />
    </Layout>
  );
}
