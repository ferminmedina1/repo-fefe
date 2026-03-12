import { Bell, CheckCircle2, X, AlertCircle, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useState } from "react";

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
  const [filter, setFilter] = useState<"all" | "unread">("all");

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

  // Group notifications by time category and apply filter
  const filteredNotifications = filter === "unread" 
    ? notifications?.filter((n) => !n.read) || []
    : notifications || [];

  const newNotifications = filteredNotifications.filter(
    (n) => getTimeCategory(n.created_at) === "new"
  ) || [];
  const previousNotifications = filteredNotifications.filter(
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
        className="group relative p-2.5 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer last:border-b-0 animate-in fade-in-50 duration-300"
      >
        {/* Delete Button - Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNotification.mutate(notification.id);
          }}
          disabled={deleteNotification.isPending}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive transition-all duration-200 hover:rotate-90 hover:scale-110"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-3 pr-6">
          {/* Avatar */}
          <div className={`flex-shrink-0 h-9 w-9 rounded-full ${config.avatar_bg} flex items-center justify-center text-white shadow-sm`}>
            <Icon className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <div className="flex-1">
                <h4 className="font-semibold text-xs text-foreground leading-tight">
                  {typeLabel}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {timeDistance}
                </p>
              </div>
              {!notification.read && (
                <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 animate-pulse mt-0.5" />
              )}
            </div>
            <p className="text-xs font-medium text-foreground mb-0.5 line-clamp-1">
              {notification.title}
            </p>
            <p className="text-xs text-foreground/70 line-clamp-1">
              {notification.message}
            </p>

            {/* Mark as Read Action */}
            {!notification.read && (
              <div className="mt-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead.mutate(notification.id);
                  }}
                  disabled={markAsRead.isPending}
                  className="h-6 px-1.5 text-xs"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Leída
                </Button>
              </div>
            )}
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
      <DropdownMenuContent align="end" className="w-full max-w-[500px] p-0 border-0 shadow-xl overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 duration-200 ease-out">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 sticky top-0 animate-in fade-in-50 slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-500" />
              Notificaciones
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 transition-transform duration-200 hover:rotate-90"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
              >
                <DropdownMenuItem onClick={() => {
                  const allUnread = notifications?.filter((n) => !n.read) || [];
                  allUnread.forEach((n) => markAsRead.mutate(n.id));
                }}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar todo como leído
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    if (window.confirm("¿Eliminar todas las notificaciones?")) {
                      notifications?.forEach((n) => deleteNotification.mutate(n.id));
                    }
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar todo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              className="h-7 text-xs transition-all duration-200 hover:shadow-md"
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant={filter === "unread" ? "default" : "outline"}
              onClick={() => setFilter("unread")}
              className="h-7 text-xs transition-all duration-200 hover:shadow-md"
            >
              No leídas {unreadCount > 0 && `(${unreadCount})`}
            </Button>
          </div>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {unreadCount} sin leer
            </p>
          )}
        </div>

        {/* Timeline Feed */}
        {notifications && notifications.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="bg-white dark:bg-slate-950">
              {/* NEW NOTIFICATIONS SECTION */}
              {newNotifications.length > 0 && (
                <div className="animate-in fade-in-50 duration-300">
                  <div className="bg-slate-100 dark:bg-slate-900 px-4 py-1.5 border-b border-slate-200 dark:border-slate-700">
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
                <div className="animate-in fade-in-50 duration-300">
                  {newNotifications.length > 0 && (
                    <div className="h-1 bg-slate-50 dark:bg-slate-800" />
                  )}
                  <div className="bg-slate-100 dark:bg-slate-900 px-4 py-1.5 border-b border-slate-200 dark:border-slate-700">
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
          <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 animate-in fade-in-50 duration-300">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/inventory-alerts")}
              className="w-full justify-center text-sm h-9 rounded-lg transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Ver todas las notificaciones
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
