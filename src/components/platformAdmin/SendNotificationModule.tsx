import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Send, AlertCircle, CheckCircle2, Eye, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const NOTIFICATION_TYPES = [
  { value: "payment_overdue", label: "Pago Vencido" },
  { value: "payment_due", label: "Pago Próximo" },
  { value: "trial_ending", label: "Prueba Terminando" },
  { value: "subscription_ending", label: "Suscripción Terminando" },
  { value: "new_support_ticket", label: "Nuevo Ticket de Soporte" },
  { value: "system_maintenance", label: "Mantenimiento del Sistema" },
  { value: "system_update", label: "Actualización del Sistema" },
  { value: "general", label: "Notificación General" },
];

const SEVERITY_OPTIONS = [
  { value: "info", label: "Información" },
  { value: "warning", label: "Advertencia" },
  { value: "error", label: "Error" },
  { value: "critical", label: "Crítico" },
];

export function SendNotificationModule() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<"all" | "single">("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [notificationType, setNotificationType] = useState("general");
  const [severity, setSeverity] = useState("info");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [previewDialog, setPreviewDialog] = useState(false);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);

  // Fetch companies
  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ["admin-companies-for-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent sent notifications
  const { data: recentNotifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["recent-sent-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Send notification mutation
  const sendNotification = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !message.trim()) {
        throw new Error("Título y mensaje son requeridos");
      }

      const targetCompanies = scope === "all" 
        ? companies?.map(c => c.id) 
        : [selectedCompanyId];

      if (!targetCompanies || targetCompanies.length === 0) {
        throw new Error("Debe seleccionar al menos una empresa");
      }

      // Insert notifications for each company
      const notifications = targetCompanies.map(company_id => ({
        company_id,
        notification_type: notificationType,
        title,
        message,
        severity,
        read: false,
      }));

      const { error } = await supabase
        .from("platform_notifications")
        .insert(notifications);

      if (error) throw error;
      return notifications.length;
    },
    onSuccess: (count) => {
      toast.success(`✅ Notificación enviada a ${count} empresa${count !== 1 ? 's' : ''}`);
      setTitle("");
      setMessage("");
      setSeverity("info");
      setNotificationType("general");
      setScope("all");
      setSelectedCompanyId("");
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ["platform-notifications"] });
    },
    onError: (error: any) => {
      toast.error(`❌ Error: ${error.message}`);
    },
  });

  // Delete notification mutation
  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("platform_notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notificación eliminada");
      refetchNotifications();
    },
    onError: () => {
      toast.error("Error al eliminar");
    },
  });

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "critical":
        return "destructive";
      case "error":
        return "destructive";
      case "warning":
        return "default";
      default:
        return "secondary";
    }
  };

  const getSeverityLabel = (sev: string) => {
    return SEVERITY_OPTIONS.find(s => s.value === sev)?.label || sev;
  };

  const getNotificationTypeLabel = (type: string) => {
    return NOTIFICATION_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Enviar Notificación del Sistema</CardTitle>
          <CardDescription>
            Envía notificaciones a empresas desde el panel administrativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scope Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Destinatario</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="all"
                  checked={scope === "all"}
                  onChange={(e) => setScope(e.target.value as "all" | "single")}
                  className="w-4 h-4"
                />
                <span>Todas las empresas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="single"
                  checked={scope === "single"}
                  onChange={(e) => setScope(e.target.value as "all" | "single")}
                  className="w-4 h-4"
                />
                <span>Empresa específica</span>
              </label>
            </div>
          </div>

          {/* Company Selection */}
          {scope === "single" && (
            <div>
              <Label htmlFor="company-select">Seleccionar Empresa</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger id="company-select">
                  <SelectValue placeholder="Elige una empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingCompanies ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Cargando empresas...
                    </div>
                  ) : (
                    companies?.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notification Type */}
          <div>
            <Label htmlFor="type-select">Tipo de Notificación</Label>
            <Select value={notificationType} onValueChange={setNotificationType}>
              <SelectTrigger id="type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div>
            <Label htmlFor="severity-select">Severidad</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id="severity-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map(sev => (
                  <SelectItem key={sev.value} value={sev.value}>
                    {sev.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title-input">Título</Label>
            <Input
              id="title-input"
              placeholder="Ej: Importante actualización del sistema"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {title.length}/100 caracteres
            </p>
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message-input">Mensaje</Label>
            <Textarea
              id="message-input"
              placeholder="Escribe el mensaje de la notificación..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/500 caracteres
            </p>
          </div>

          {/* Alert */}
          {scope === "all" && companies && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta notificación se enviará a <strong>{companies.length}</strong> empresa{companies.length !== 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setPreviewDialog(true)}
              disabled={!title.trim() || !message.trim()}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Vista Previa
            </Button>
            <Button
              onClick={() => sendNotification.mutate()}
              disabled={
                sendNotification.isPending ||
                !title.trim() ||
                !message.trim() ||
                (scope === "single" && !selectedCompanyId)
              }
              className="gap-2"
            >
              {sendNotification.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar Notificación
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones Recientes Enviadas</CardTitle>
          <CardDescription>
            Últimas 10 notificaciones del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!recentNotifications || recentNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay notificaciones enviadas aún</p>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map(notif => (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold text-sm truncate">{notif.title}</h4>
                      <Badge variant={getSeverityColor(notif.severity)} className="text-xs">
                        {getSeverityLabel(notif.severity)}
                      </Badge>
                      {!notif.read && (
                        <Badge variant="secondary" className="text-xs">Nueva</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium">{getNotificationTypeLabel(notif.notification_type)}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                    onClick={() => {
                      if (confirm("¿Eliminar esta notificación?")) {
                        deleteNotification.mutate(notif.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vista Previa</DialogTitle>
            <DialogDescription>
              Así es como verán los usuarios la notificación
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className={`p-4 border-l-4 rounded-lg ${
              severity === "critical" ? "bg-red-600/20 border-red-600" :
              severity === "error" ? "bg-red-500/20 border-red-500" :
              severity === "warning" ? "bg-amber-500/20 border-amber-500" :
              "bg-blue-500/20 border-blue-500"
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{title}</h3>
                    <Badge variant={getSeverityColor(severity)} className="text-xs">
                      {getSeverityLabel(severity)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {getNotificationTypeLabel(notificationType)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
