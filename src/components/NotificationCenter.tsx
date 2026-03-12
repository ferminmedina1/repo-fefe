import { Bell, CheckCircle2, X, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, isPast, subDays, isAfter } from "date-fns";
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
    avatar_bg: "bg-red-500",
  },
  expiring_product: {
    icon: Clock,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200",
    label: "Próximo a Vencer",
    avatar_bg: "bg-amber-500",
  },
  inactive_customer: {
    icon: Users,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
    label: "Cliente Inactivo",
    avatar_bg: "bg-blue-500",
  },
  overdue_invoice: {
    icon: FileText,
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    badge: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
    label: "Factura Vencida",
    avatar_bg: "bg-orange-500",
  },
  expiring_check: {
    icon: Zap,
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    badge: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
    label: "Cheque por Vencer",
    avatar_bg: "bg-purple-500",
  },
};

const getTimeCategory = (createdAt: string): "new" | "previous" => {
  const notificationDate = new Date(createdAt);
  const yesterday = subDays(new Date(), 1);
  return isAfter(notificationDate, yesterday) ? "new" : "previous";
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

  // Group notifications by time category
  const newNotifications = notifications?.filter(
    (n) => getTimeCategory(n.created_at) === "new"
  ) || [];
  const previousNotifications = notifications?.filter(
    (n) => getTimeCategory(n.created_at) === "previous"
  ) || [];

  const renderNotificationItem = (notification: any) => {
    const config =
      NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.low_stock;
    const Icon = config.icon;
    const typeLabel = config.label;

    // Get relative time with custom format
    const timeDistance = formatDistanceToNow(new Date(notification.created_at), {
      addSuffix: false,
      locale: es,
    });

    return (
      <div
        key={notification.id}
        onClick={() => handleNotificationClick(notification)}
        className="group relative p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer last:border-b-0"
      >
        <div className="flex gap-4">
          {/* Avatar */}
          <div className={`flex-shrink-0 h-12 w-12 rounded-full ${config.avatar_bg} flex items-center justify-center text-white shadow-md`}>
            <Icon className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-foreground">
                  {typeLabel}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {timeDistance}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!notification.read && (
                  <div className="h-3 w-3 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                )}
              </div>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {notification.title}
            </p>
            <p className="text-sm text-foreground/70 line-clamp-2">
              {notification.message}
            </p>

            {/* Actions */}
            <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.read && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead.mutate(notification.id);
                  }}
                  disabled={markAsRead.isPending}
                  className="h-8 px-2 text-xs"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Marcar leída
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification.mutate(notification.id);
                }}
                disabled={deleteNotification.isPending}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
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
      <DropdownMenuContent align="end" className="w-full max-w-[500px] p-0 border-0 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 p-5 sticky top-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {unreadCount} sin leer
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Timeline Feed */}
        {notifications && notifications.length > 0 ? (
          <ScrollArea className="h-[600px]">
            <div className="bg-white dark:bg-slate-950">
              {/* NEW NOTIFICATIONS SECTION */}
              {newNotifications.length > 0 && (
                <div>
                  <div className="sticky top-0 bg-slate-100 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Nuevas
                    </h4>
                  </div>
                  <div>
                    {newNotifications.map((notification) =>
                      renderNotificationItem(notification)
                    )}
                  </div>
                </div>
              )}

              {/* PREVIOUS NOTIFICATIONS SECTION */}
              {previousNotifications.length > 0 && (
                <div>
                  {newNotifications.length > 0 && (
                    <div className="h-2 bg-slate-50 dark:bg-slate-800" />
                  )}
                  <div className="sticky top-0 bg-slate-100 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Anteriores
                    </h4>
                  </div>
                  <div>
                    {previousNotifications.map((notification) =>
                      renderNotificationItem(notification)
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[300px] flex items-center justify-center bg-white dark:bg-slate-950 p-8">
            <div className="text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                No hay notificaciones
              </p>
              <p className="text-xs text-muted-foreground">
                Aquí aparecerán todas tus notificaciones
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        {notifications && notifications.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/inventory-alerts")}
              className="w-full justify-center text-sm h-9 rounded-lg"
            >
              Ver todas las notificaciones
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
