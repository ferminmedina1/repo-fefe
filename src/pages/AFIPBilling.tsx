import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useDebounce } from "@/hooks/useDebounce";
import {
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Settings,
  Store,
} from "lucide-react";

// AFIP-012: tipos explícitos — sin "as any" en el render
interface ComprobanteAFIP {
  id: string;
  company_id: string;
  sale_id: string | null;
  tipo_comprobante: string;
  numero_completo: string | null;
  cae: string | null;
  fecha_vencimiento_cae: string | null;
  fecha_emision: string | null;
  importe_total: number | null;
  estado: string;
  pdf_url?: string | null;
  sales: { id: string; customer_name: string | null; total: number | null } | null;
}

interface POSAfip {
  id: string;
  punto_venta: number;
  nombre: string;
  tipo_pos: string;
  ultimo_numero: number | null;
  active: boolean;
}

const AFIPBilling = () => {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  // AFIP-007: verificación de autorización
  const { isAdmin, isManager } = usePermissions();

  const [searchInput,   setSearchInput]   = useState("");
  const [filterType,    setFilterType]    = useState<string>("all");
  const [filterStatus,  setFilterStatus]  = useState<string>("all");
  const [selectedComp,  setSelectedComp]  = useState<ComprobanteAFIP | null>(null);

  // AFIP-009: debounce en búsqueda — no recalcular en cada tecla
  const searchTerm = useDebounce(searchInput, 200);

  const afipEnabled  = (currentCompany as any)?.afip_enabled;
  const afipAmbiente = (currentCompany as any)?.afip_ambiente || "testing";

  // AFIP-008: limit 500 para evitar carga masiva en producción
  const { data: comprobantes = [], isLoading } = useQuery({
    queryKey: ["comprobantes-afip", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("comprobantes_afip")
        .select(`
          id, company_id, sale_id, tipo_comprobante, numero_completo,
          cae, fecha_vencimiento_cae, fecha_emision, importe_total, estado, pdf_url,
          sales:sale_id(id, customer_name, total)
        `)
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as ComprobanteAFIP[];
    },
    enabled: !!currentCompany?.id,
  });

  const { data: posPoints = [] } = useQuery({
    queryKey: ["pos-afip", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("pos_afip")
        .select("id, punto_venta, nombre, tipo_pos, ultimo_numero, active")
        .eq("company_id", currentCompany.id)
        .eq("active", true);
      if (error) throw error;
      return (data || []) as POSAfip[];
    },
    enabled: !!currentCompany?.id,
  });

  const filteredComprobantes = comprobantes.filter(c => {
    const matchesSearch =
      c.numero_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cae?.includes(searchTerm) ||
      c.sales?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType   = filterType   === "all" || c.tipo_comprobante === filterType;
    const matchesStatus = filterStatus === "all" || c.estado           === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total:      comprobantes.length,
    aprobados:  comprobantes.filter(c => c.estado === "aprobado").length,
    pendientes: comprobantes.filter(c => c.estado === "pendiente").length,
    rechazados: comprobantes.filter(c => c.estado === "rechazado").length,
    montoTotal: comprobantes
      .filter(c => c.estado === "aprobado")
      .reduce((sum, c) => sum + (c.importe_total ?? 0), 0),
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "aprobado":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Aprobado</Badge>;
      case "pendiente":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "rechazado":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Rechazado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getTipoComprobante = (tipo: string) => {
    const tipos: Record<string, string> = {
      "1": "Factura A", "6": "Factura B", "11": "Factura C",
      "3": "NC A", "8": "NC B", "13": "NC C",
      "FA": "Factura A", "FB": "Factura B", "FC": "Factura C",
      "NCA": "NC A", "NCB": "NC B", "NCC": "NC C",
    };
    return tipos[tipo] || tipo;
  };

  // AFIP-006: handler para descargar PDF
  const handleDownload = (comp: ComprobanteAFIP) => {
    if (comp.pdf_url) {
      window.open(comp.pdf_url, "_blank");
    } else {
      toast.info("El PDF de este comprobante aún no está disponible");
    }
  };

  // AFIP-007: guard de autorización
  if (!isAdmin && !isManager) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No tenés permisos para acceder a la facturación AFIP. Solo administradores y gerentes pueden acceder.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  if (!afipEnabled) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Facturación AFIP</h1>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <AlertCircle className="h-16 w-16 mx-auto text-yellow-500" />
                <h2 className="text-2xl font-semibold">Facturación AFIP no configurada</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Para emitir comprobantes electrónicos necesitás configurar tu certificado AFIP
                  y habilitar la facturación electrónica en la configuración de la empresa.
                </p>
                <div className="flex gap-4 justify-center pt-4">
                  <Button variant="outline" asChild>
                    <a href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Ir a Configuración
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/pos-points">
                      <Store className="mr-2 h-4 w-4" />
                      Configurar Puntos de Venta
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 md:h-8 md:w-8" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Facturación AFIP</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {afipAmbiente === "testing" ? "Homologación" : "Producción"}
              </p>
            </div>
          </div>
          {afipAmbiente === "testing" && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600 self-start sm:self-auto">
              <AlertCircle className="h-3 w-3 mr-1" />
              PRUEBAS
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Aprobados</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.aprobados}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pendientes</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">{stats.pendientes}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rechazados</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.rechazados}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monto Facturado</CardDescription>
              <CardTitle className="text-2xl">
                ${stats.montoTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="comprobantes">
          <TabsList>
            <TabsTrigger value="comprobantes">Comprobantes Emitidos</TabsTrigger>
            <TabsTrigger value="pos">Puntos de Venta</TabsTrigger>
          </TabsList>

          <TabsContent value="comprobantes" className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por número, CAE o cliente..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="FA">Factura A</SelectItem>
                      <SelectItem value="FB">Factura B</SelectItem>
                      <SelectItem value="FC">Factura C</SelectItem>
                      <SelectItem value="NCA">Nota de Crédito A</SelectItem>
                      <SelectItem value="NCB">Nota de Crédito B</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="aprobado">Aprobado</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tabla */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredComprobantes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay comprobantes para mostrar</p>
                    <p className="text-sm">Los comprobantes se generan desde el punto de venta</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[80px]">Fecha</TableHead>
                          <TableHead className="min-w-[80px]">Tipo</TableHead>
                          <TableHead className="min-w-[100px]">Número</TableHead>
                          <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                          <TableHead className="text-right min-w-[90px]">Importe</TableHead>
                          <TableHead className="hidden md:table-cell">CAE</TableHead>
                          <TableHead className="hidden lg:table-cell">Vto. CAE</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acc.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredComprobantes.map(comprobante => (
                          <TableRow key={comprobante.id}>
                            <TableCell>
                              {comprobante.fecha_emision
                                ? format(new Date(comprobante.fecha_emision), "dd/MM/yyyy", { locale: es })
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getTipoComprobante(comprobante.tipo_comprobante)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">{comprobante.numero_completo}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {comprobante.sales?.customer_name || "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {/* AFIP-011: null guard — evita "$" suelto */}
                              ${(comprobante.importe_total ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-mono text-xs hidden md:table-cell">
                              {comprobante.cae || "-"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {comprobante.fecha_vencimiento_cae
                                ? format(new Date(comprobante.fecha_vencimiento_cae), "dd/MM/yyyy", { locale: es })
                                : "-"}
                            </TableCell>
                            <TableCell>{getStatusBadge(comprobante.estado)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {/* AFIP-006: botón Ver con handler real */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Ver detalle"
                                  onClick={() => setSelectedComp(comprobante)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {comprobante.estado === "aprobado" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Descargar PDF"
                                    onClick={() => handleDownload(comprobante)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Puntos de Venta Configurados</CardTitle>
                <CardDescription>
                  Puntos de venta habilitados para emitir comprobantes electrónicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {posPoints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay puntos de venta configurados</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <a href="/pos-points">
                        <Plus className="mr-2 h-4 w-4" />
                        Configurar Punto de Venta
                      </a>
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Punto de Venta</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Último Número</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posPoints.map(pos => (
                        <TableRow key={pos.id}>
                          <TableCell className="font-mono font-medium">
                            {pos.punto_venta.toString().padStart(5, "0")}
                          </TableCell>
                          <TableCell>{pos.nombre}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{pos.tipo_pos}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {pos.ultimo_numero?.toString().padStart(8, "0") || "00000000"}
                          </TableCell>
                          <TableCell>
                            <Badge className={pos.active ? "bg-green-500" : ""}>
                              {pos.active ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* AFIP-006: dialog de detalle de comprobante */}
      <Dialog open={!!selectedComp} onOpenChange={() => setSelectedComp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Detalle del Comprobante
            </DialogTitle>
          </DialogHeader>
          {selectedComp && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-muted-foreground">Tipo</span>
                <span>{getTipoComprobante(selectedComp.tipo_comprobante)}</span>

                <span className="text-muted-foreground">Número</span>
                <span className="font-mono">{selectedComp.numero_completo || "-"}</span>

                <span className="text-muted-foreground">Fecha</span>
                <span>
                  {selectedComp.fecha_emision
                    ? format(new Date(selectedComp.fecha_emision), "dd/MM/yyyy HH:mm", { locale: es })
                    : "-"}
                </span>

                <span className="text-muted-foreground">Cliente</span>
                <span>{selectedComp.sales?.customer_name || "-"}</span>

                <span className="text-muted-foreground">Importe</span>
                <span className="font-semibold">
                  ${(selectedComp.importe_total ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-muted-foreground">CAE</span>
                <span className="font-mono text-xs break-all">{selectedComp.cae || "-"}</span>

                <span className="text-muted-foreground">Vto. CAE</span>
                <span>
                  {selectedComp.fecha_vencimiento_cae
                    ? format(new Date(selectedComp.fecha_vencimiento_cae), "dd/MM/yyyy", { locale: es })
                    : "-"}
                </span>

                <span className="text-muted-foreground">Estado</span>
                <span>{getStatusBadge(selectedComp.estado)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedComp?.estado === "aprobado" && (
              <Button onClick={() => selectedComp && handleDownload(selectedComp)}>
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedComp(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AFIPBilling;
