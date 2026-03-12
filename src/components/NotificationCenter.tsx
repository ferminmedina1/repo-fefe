import { Bell, CheckCircle2, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ScrollArea } from "./ui/scroll-area";
import { Boxes, Clock, Users, FileText, Zap } from "lucide-react";

const NOTIFICATION_CONFIG: Record<string, any> = {
  low_stock: {
    icon: Boxes,
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
    label: "Stock Bajo",
  },
  expiring_product: {
    icon: Clock,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200",
    label: "Próximo a Vencer",
  },
  inactive_customer: {
    icon: Users,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
    label: "Cliente Inactivo",
  },
  overdue_invoice: {
    icon: FileText,
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    badge: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
    label: "Factura Vencida",
  },
  expiring_check: {
    icon: Zap,
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    badge: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
    label: "Cheque por Vencer",
  },
};

export function NotificationCenter() {
  const navigate = useNavigate();

  const { data: notifications, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
    },
    onError: () => {
      toast.error("Error al marcar como leída");
    },
  });

  // Delete notification mutation
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
    },
    onError: () => {
      toast.error("Error al eliminar notificación");
    },
  });

  const handleNotificationClick = (notification: any) => {
    markAsRead.mutate(notification.id);
    
    if (notification.type === "low_stock" || notification.type === "expiring_product") {
      navigate("/inventory-alerts");
    } else if (notification.type === "inactive_customer") {
      const data = notification.data as any;
      const customerId = data?.customer_id;
      if (customerId) {
        navigate(`/customer-account/${customerId}`);
      }
    } else if (notification.type === "overdue_invoice") {
      navigate("/accounts-receivable");
    } else if (notification.type === "expiring_check") {
      navigate("/checks");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0 border-0 shadow-lg overflow-hidden">
        {/* Header - Estilo sidebar azul oscuro */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 sticky top-0">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </h3>
          {unreadCount > 0 && (
            <p className="text-xs text-slate-300 mt-2">
              {unreadCount} sin leer
            </p>
          )}
        </div>

        {/* Content */}
        {notifications && notifications.length > 0 ? (
          <ScrollArea className="h-[420px]">
            <div className="p-3 space-y-2 bg-slate-50 dark:bg-slate-900/50">
              {notifications.map((notification) => {
                const config =
                  NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.low_stock;
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-md border transition-all ${config.bg} ${config.border} hover:shadow-sm group cursor-pointer hover:scale-[1.01]`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 pt-0.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm leading-tight">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDistanceToNow(
                                new Date(notification.created_at),
                                { addSuffix: true, locale: es }
                              )}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1 animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm text-foreground/80 line-clamp-2">
                          {notification.message}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead.mutate(notification.id);
                              }}
                              disabled={markAsRead.isPending}
                              className="h-6 px-2 text-xs"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification.mutate(notification.id);
                            }}
                            disabled={deleteNotification.isPending}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive ml-auto"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[300px] bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center">
            <div className="text-center">
              <Bell className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay notificaciones
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        {notifications && notifications.length > 0 && (
          <>
            <div className="border-t bg-slate-50 dark:bg-slate-900/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/inventory-alerts")}
                className="w-full justify-center border-0 rounded-none text-xs h-8 text-muted-foreground hover:text-foreground"
              >
                Ver todas las notificaciones
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
