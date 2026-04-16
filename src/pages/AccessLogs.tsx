import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Activity, User, Calendar, CheckCircle, XCircle, Minus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sanitizeSearchQuery } from "@/lib/searchUtils";
import { useDebounce } from "@/hooks/useDebounce";

export default function AccessLogs() {
  const [searchInput, setSearchInput] = useState("");
  const { isAdmin, isManager } = usePermissions();

  // ACL-004: debounce — una query cada 300ms, no por cada tecla
  const searchQuery = useDebounce(searchInput, 300);

  // ACL-001: enabled guard — query no dispara sin permisos
  const { data: accessLogs, isLoading } = useQuery({
    queryKey: ["access-logs", searchQuery],
    enabled: isAdmin || isManager,
    queryFn: async () => {
      // ACL-003: solo columnas necesarias — excluimos ip_address y user_agent (PII no mostrada)
      let query = supabase
        .from("access_logs")
        .select("id, created_at, user_name, user_email, action, page_url, success, error_message")
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchQuery) {
        const sanitized = sanitizeSearchQuery(searchQuery);
        if (sanitized) {
          query = query.or(`action.ilike.%${sanitized}%,user_email.ilike.%${sanitized}%,user_name.ilike.%${sanitized}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (!isAdmin && !isManager) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertDescription>
            No tienes permisos para ver los registros de acceso. Solo administradores y gerentes pueden acceder.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  const getActionBadge = (action: string) => {
    const labels: Record<string, string> = {
      login: "Inicio de sesión",
      logout: "Cierre de sesión",
      page_view: "Vista de página",
      api_call: "Llamada API",
    };
    return <Badge variant="outline">{labels[action] || action}</Badge>;
  };

  // ACL-005: éxito puede ser true | false | null (estado desconocido)
  const getSuccessIndicator = (success: boolean | null, errorMessage: string | null) => {
    if (success === true) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Exitoso</span>
        </div>
      );
    }
    if (success === false) {
      return (
        <div>
          <div className="flex items-center gap-1 text-red-600">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">Fallido</span>
          </div>
          {errorMessage && (
            <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
          )}
        </div>
      );
    }
    // null — estado no aplicable (ej. page_view)
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span className="text-sm">-</span>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Registros de Acceso</h1>
          <p className="text-muted-foreground">
            Historial de accesos y actividad de usuarios en el sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Logs de Acceso
            </CardTitle>
            <CardDescription>
              Últimas 100 actividades registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4" data-tutorial="login-history">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por acción, usuario o email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Página/URL</TableHead>
                    <TableHead data-tutorial="failed-attempts">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Cargando registros...
                      </TableCell>
                    </TableRow>
                  ) : accessLogs && accessLogs.length > 0 ? (
                    accessLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {/* ACL-006: guard contra created_at null */}
                            <span className="text-sm">
                              {log.created_at
                                ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })
                                : "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{log.user_name || "Sin nombre"}</span>
                              <span className="text-xs text-muted-foreground">{log.user_email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          {/* ACL-007: truncado para evitar que URLs largas rompan el layout */}
                          <span
                            className="text-sm text-muted-foreground block max-w-[200px] truncate"
                            title={log.page_url ?? undefined}
                          >
                            {log.page_url || "-"}
                          </span>
                        </TableCell>
                        <TableCell data-tutorial="security-alert">
                          {getSuccessIndicator(log.success, log.error_message)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay registros de acceso
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
