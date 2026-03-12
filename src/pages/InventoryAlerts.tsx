import { useState } from "react";
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
  CheckCircle2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
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

const NOTIFICATION_TYPES = {
  low_stock: {
    label: "Stock Bajo",
    icon: Boxes,
    color: "bg-red-500/20 border-red-500/50",
    badge: "destructive",
    textColor: "text-red-600 dark:text-red-400",
  },
  expiring_product: {
    label: "Próximo a Vencer",
    icon: Clock,
    color: "bg-amber-500/20 border-amber-500/50",
    badge: "default",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  inactive_customer: {
    label: "Cliente Inactivo",
    icon: Users,
    color: "bg-blue-500/20 border-blue-500/50",
    badge: "secondary",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  overdue_invoice: {
    label: "Factura Vencida",
    icon: FileText,
    color: "bg-red-500/20 border-red-500/50",
    badge: "destructive",
    textColor: "text-red-600 dark:text-red-400",
  },
  expiring_check: {
    label: "Cheque por Vencer",
    icon: Calendar,
    color: "bg-orange-500/20 border-orange-500/50",
    badge: "default",
    textColor: "text-orange-600 dark:text-orange-400",
  },
};

export default function InventoryAlerts() {
  const { currentCompany } = useCompany();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [notificationSearchQuery, setNotificationSearchQuery] = useState("");
  const [selectedNotificationType, setSelectedNotificationType] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
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

  // Filtro mejorado de notificaciones
  const filteredNotifications = notifications?.filter((notification) => {
    // Filtro por tipo si está seleccionado
    if (selectedNotificationType && notification.type !== selectedNotificationType) {
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
  }) || [];

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

      <Tabs defaultValue="my-alerts" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="my-alerts" className="flex-1 min-w-[100px] text-xs sm:text-sm">Mis Alertas</TabsTrigger>
          <TabsTrigger value="low-stock" className="flex-1 min-w-[100px] text-xs sm:text-sm">Stock Bajo</TabsTrigger>
          <TabsTrigger value="expiring" className="flex-1 min-w-[100px] text-xs sm:text-sm">Próx. Vencer</TabsTrigger>
          <TabsTrigger value="currency" className="flex-1 min-w-[100px] text-xs sm:text-sm">Monedas</TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 min-w-[100px] text-xs sm:text-sm">Notificaciones</TabsTrigger>
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
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay productos con stock bajo</p>
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
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No hay productos próximos a vencer
              </p>
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

        <TabsContent value="notifications" className="space-y-4">
          {/* Filtros y búsqueda */}
          <div className="space-y-3">
            {/* Buscador */}
            <div className="relative">
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

            {/* Filtros por tipo y estado */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Toggle para mostrar solo sin leer */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setUnreadOnly(!unreadOnly)}>
                <CheckCircle2 className={`h-4 w-4 transition-colors ${unreadOnly ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">
                  {unreadOnly ? 'Solo sin leer' : 'Todas'}
                </span>
              </div>

              {/* Separador */}
              <div className="h-6 w-px bg-border mx-1" />

              {/* Filtros por tipo */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(NOTIFICATION_TYPES).map(([typeKey, typeInfo]) => {
                  const Icon = typeInfo.icon;
                  const isSelected = selectedNotificationType === typeKey;
                  const count = notifications?.filter(n => n.type === typeKey).length || 0;
                  
                  return (
                    <button
                      key={typeKey}
                      onClick={() => setSelectedNotificationType(isSelected ? null : typeKey)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted/50 border-border'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{typeInfo.label}</span>
                      {count > 0 && (
                        <Badge 
                          variant={isSelected ? 'secondary' : 'outline'} 
                          className="ml-1 text-xs"
                        >
                          {count}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resumen de resultados */}
            {(notificationSearchQuery || selectedNotificationType || unreadOnly) && (
              <div className="text-sm text-muted-foreground">
                Mostrando {filteredNotifications.length} de {notifications?.length || 0} notificaciones
                {notificationSearchQuery || selectedNotificationType || unreadOnly ? ' • ' : ''}
                {selectedNotificationType && NOTIFICATION_TYPES[selectedNotificationType as keyof typeof NOTIFICATION_TYPES] && (
                  <span>{NOTIFICATION_TYPES[selectedNotificationType as keyof typeof NOTIFICATION_TYPES].label}</span>
                )}
                {unreadOnly && <span>{selectedNotificationType ? ' • ' : ''}Sin leer</span>}
              </div>
            )}
          </div>

          {/* Notificaciones */}
          {notifications?.length === 0 ? (
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
                  setSelectedNotificationType(null);
                  setUnreadOnly(false);
                }}
                className="mt-2"
              >
                Limpiar filtros
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const typeInfo = NOTIFICATION_TYPES[notification.type as keyof typeof NOTIFICATION_TYPES];
                const Icon = typeInfo?.icon || Bell;
                
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
                            <Badge variant={typeInfo?.badge as any || 'secondary'} className="text-xs flex-shrink-0">
                              {typeInfo?.label || notification.type}
                            </Badge>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        </div>
                      </div>
                      
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="flex-shrink-0 ml-2"
                        >
                          Leer
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
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
