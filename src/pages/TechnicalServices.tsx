import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Wrench,
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";

// C-2: Use DB enum type directly to avoid type mismatch with ServiceUpdate
type ServiceStatus = Database["public"]["Enums"]["service_status"];
// A-2: Strongly typed update payload — replaces `any`
type ServiceUpdate = Database["public"]["Tables"]["technical_services"]["Update"];

interface TechnicalService {
  id: string;
  service_number: string;
  customer_id: string | null;
  device_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  reported_issue: string;
  diagnosis: string | null;
  status: ServiceStatus;
  received_date: string;
  estimated_completion_date: string | null;
  completed_date: string | null;
  delivered_date: string | null;
  // C-2: Match actual DB schema — both fields are nullable
  labor_cost: number | null;
  parts_cost: number | null;
  total_cost: number;
  notes: string | null;
  user_id: string;
  created_at: string;
  customers?: { name: string; phone?: string } | null;
}

const statusLabels: Record<ServiceStatus, string> = {
  received: "Recibido",
  in_diagnosis: "En diagnóstico",
  in_repair: "En reparación",
  ready: "Listo",
  delivered: "Entregado",
};

const statusColors: Record<ServiceStatus, string> = {
  received: "bg-blue-500",
  in_diagnosis: "bg-yellow-500",
  in_repair: "bg-orange-500",
  ready: "bg-green-500",
  delivered: "bg-gray-500",
};

// C-1: Roles with write access to technical services
const EDIT_ROLES = ["admin", "manager", "technician", "platform_admin"];

const PAGE_SIZE = 50;

export default function TechnicalServices() {
  const { currentCompany, currentCompanyRole } = useCompany();

  // C-1: Derive edit permission from role
  const canEdit =
    !!currentCompanyRole && EDIT_ROLES.includes(currentCompanyRole);

  // M-3: Currency from company config instead of hardcoded "$"
  const currency = currentCompany?.currency || "$";

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<TechnicalService | null>(
    null
  );
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedServiceForMessage, setSelectedServiceForMessage] =
    useState<TechnicalService | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [formData, setFormData] = useState({
    customer_id: "",
    device_type: "",
    brand: "",
    model: "",
    serial_number: "",
    reported_issue: "",
    diagnosis: "",
    status: "received" as ServiceStatus,
    estimated_completion_date: "",
    labor_cost: "0",
    parts_cost: "0",
    notes: "",
  });

  const queryClient = useQueryClient();

  // A-3: Expose isLoading and isError for proper UI feedback
  const {
    data: services = [],
    isLoading: servicesLoading,
    isError: servicesError,
  } = useQuery({
    queryKey: [
      "technical-services",
      searchQuery,
      currentCompany?.id,
      currentPage,
    ],
    queryFn: async () => {
      let query = supabase
        .from("technical_services")
        .select("*, customers(name, phone)")
        // C-3: Non-null assertion is safe here — query is disabled when null
        .eq("company_id", currentCompany!.id)
        .order("created_at", { ascending: false })
        // M-4: Paginate to avoid loading all records at once
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (searchQuery) {
        query = query.or(
          `service_number.ilike.%${searchQuery}%,device_type.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TechnicalService[];
    },
    // C-3: Prevent query from running without a valid company
    enabled: !!currentCompany?.id,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .eq("company_id", currentCompany!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuario no autenticado");
      // C-3: Guard against null company on insert
      if (!currentCompany) throw new Error("No hay empresa seleccionada");

      const { data: serviceNumber } = await supabase.rpc(
        "generate_service_number"
      );

      const totalCost =
        parseFloat(data.labor_cost) + parseFloat(data.parts_cost);

      const { error } = await supabase.from("technical_services").insert({
        service_number: serviceNumber,
        customer_id: data.customer_id || null,
        device_type: data.device_type,
        brand: data.brand || null,
        model: data.model || null,
        serial_number: data.serial_number || null,
        reported_issue: data.reported_issue,
        diagnosis: data.diagnosis || null,
        status: data.status,
        estimated_completion_date: data.estimated_completion_date || null,
        labor_cost: parseFloat(data.labor_cost),
        parts_cost: parseFloat(data.parts_cost),
        total_cost: totalCost,
        notes: data.notes || null,
        user_id: user.user.id,
        company_id: currentCompany.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical-services"] });
      toast.success("Servicio técnico creado exitosamente");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al crear el servicio: " + error.message);
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const totalCost =
        parseFloat(data.labor_cost) + parseFloat(data.parts_cost);

      // A-2: Strongly typed update payload — no more `any`
      const updateData: ServiceUpdate = {
        customer_id: data.customer_id || null,
        device_type: data.device_type,
        brand: data.brand || null,
        model: data.model || null,
        serial_number: data.serial_number || null,
        reported_issue: data.reported_issue,
        diagnosis: data.diagnosis || null,
        status: data.status,
        estimated_completion_date: data.estimated_completion_date || null,
        labor_cost: parseFloat(data.labor_cost),
        parts_cost: parseFloat(data.parts_cost),
        total_cost: totalCost,
        notes: data.notes || null,
      };

      if (data.status === "ready" && !editingService?.completed_date) {
        updateData.completed_date = new Date().toISOString();
      }
      if (data.status === "delivered" && !editingService?.delivered_date) {
        updateData.delivered_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("technical_services")
        .update(updateData)
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical-services"] });
      toast.success("Servicio actualizado exitosamente");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al actualizar el servicio: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      customer_id: "",
      device_type: "",
      brand: "",
      model: "",
      serial_number: "",
      reported_issue: "",
      diagnosis: "",
      status: "received",
      estimated_completion_date: "",
      labor_cost: "0",
      parts_cost: "0",
      notes: "",
    });
    setEditingService(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateServiceMutation.mutate({ ...formData, id: editingService.id });
    } else {
      createServiceMutation.mutate(formData);
    }
  };

  const handleEdit = (service: TechnicalService) => {
    setEditingService(service);
    setFormData({
      customer_id: service.customer_id || "",
      device_type: service.device_type,
      brand: service.brand || "",
      model: service.model || "",
      serial_number: service.serial_number || "",
      reported_issue: service.reported_issue,
      diagnosis: service.diagnosis || "",
      status: service.status,
      estimated_completion_date: service.estimated_completion_date
        ? format(new Date(service.estimated_completion_date), "yyyy-MM-dd")
        : "",
      // C-2: Null-safe coalescing — prevents crash on nullable DB fields
      labor_cost: (service.labor_cost ?? 0).toString(),
      parts_cost: (service.parts_cost ?? 0).toString(),
      notes: service.notes || "",
    });
    setDialogOpen(true);
  };

  // M-4: Reset to first page when search query changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(0);
  };

  const handleSendMessage = (service: TechnicalService) => {
    if (!service.customer_id) {
      toast.error("Este servicio no tiene un cliente asignado");
      return;
    }

    if (!service.customers?.phone) {
      toast.error("El cliente no tiene un número de teléfono registrado");
      return;
    }

    setSelectedServiceForMessage(service);

    let defaultMessage = "";
    switch (service.status) {
      case "in_diagnosis":
        defaultMessage = `Hola, tu ${service.device_type} ${service.brand ?? ""} está en diagnóstico. Te contactaremos pronto con más información.`;
        break;
      case "in_repair":
        defaultMessage = `Tu ${service.device_type} ${service.brand ?? ""} está en reparación. ${
          service.estimated_completion_date
            ? `Estimamos tenerlo listo para el ${format(new Date(service.estimated_completion_date), "dd/MM/yyyy")}.`
            : ""
        }`;
        break;
      case "ready":
        // M-3: Use company currency in message
        defaultMessage = `¡Tu ${service.device_type} ${service.brand ?? ""} está listo! Puedes pasar a retirarlo cuando quieras. Costo total: ${currency} ${service.total_cost.toFixed(2)}`;
        break;
      default:
        defaultMessage = `Actualización sobre tu ${service.device_type} ${service.brand ?? ""} - Servicio #${service.service_number}`;
    }

    setMessageContent(defaultMessage);
    setMessageDialogOpen(true);
  };

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedServiceForMessage)
        throw new Error("No hay servicio seleccionado");

      const customerPhone = selectedServiceForMessage.customers?.phone;
      if (!customerPhone)
        throw new Error("El cliente no tiene teléfono registrado");

      const cleanPhone = customerPhone.replace(/[\s\-\(\)\+]/g, "");

      // B-1: Validate phone is numeric and within E.164 length bounds
      if (!/^\d{7,15}$/.test(cleanPhone)) {
        throw new Error(
          "El número de teléfono no tiene un formato válido para WhatsApp. Use formato internacional sin el + (ej: 5491112345678)"
        );
      }

      // M-2: Cap notes at 8000 chars to prevent unbounded accumulation
      const currentNotes = selectedServiceForMessage.notes || "";
      const newEntry = `\n\n[${format(new Date(), "dd/MM/yyyy HH:mm")}] Mensaje enviado por WhatsApp: ${messageContent}`;
      const updatedNotes = (currentNotes + newEntry).slice(-8000);

      const { error } = await supabase
        .from("technical_services")
        .update({ notes: updatedNotes })
        .eq("id", selectedServiceForMessage.id);

      if (error) throw error;

      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageContent)}`;
      window.open(whatsappUrl, "_blank");

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical-services"] });
      toast.success("Abriendo WhatsApp...");
      setMessageDialogOpen(false);
      setMessageContent("");
      setSelectedServiceForMessage(null);
    },
    onError: (error) => {
      toast.error("Error al enviar mensaje: " + error.message);
    },
  });

  // A-1: Single flag to disable submit during any pending mutation
  const isMutating =
    createServiceMutation.isPending || updateServiceMutation.isPending;

  // M-4: If we received a full page, there may be more records
  const hasMorePages = services.length === PAGE_SIZE;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Servicios Técnicos
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gestión de reparaciones y servicios
            </p>
          </div>
          {/* C-1: Only render create button for authorized roles */}
          {canEdit && (
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                // M-1: Always reset form on dialog close — covers Escape key too
                if (!open) resetForm();
                setDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Servicio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingService
                      ? "Editar Servicio"
                      : "Nuevo Servicio Técnico"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer_id">Cliente (opcional)</Label>
                      <div className="flex gap-2">
                        <Select
                          value={formData.customer_id || undefined}
                          onValueChange={(value) =>
                            setFormData({ ...formData, customer_id: value })
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.customer_id && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setFormData({ ...formData, customer_id: "" })
                            }
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Estado</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: ServiceStatus) =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="device_type">Tipo de Equipo *</Label>
                      <Input
                        id="device_type"
                        value={formData.device_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            device_type: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="brand">Marca</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) =>
                          setFormData({ ...formData, brand: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model">Modelo</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) =>
                          setFormData({ ...formData, model: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="serial_number">Número de Serie</Label>
                      <Input
                        id="serial_number"
                        value={formData.serial_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            serial_number: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reported_issue">Problema Reportado *</Label>
                    <Textarea
                      id="reported_issue"
                      value={formData.reported_issue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reported_issue: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diagnosis">Diagnóstico</Label>
                    <Textarea
                      id="diagnosis"
                      value={formData.diagnosis}
                      onChange={(e) =>
                        setFormData({ ...formData, diagnosis: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimated_completion_date">
                      Fecha Estimada de Entrega
                    </Label>
                    <Input
                      id="estimated_completion_date"
                      type="date"
                      value={formData.estimated_completion_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimated_completion_date: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="labor_cost">Costo de Mano de Obra</Label>
                      <Input
                        id="labor_cost"
                        type="number"
                        step="0.01"
                        value={formData.labor_cost}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            labor_cost: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="parts_cost">Costo de Repuestos</Label>
                      <Input
                        id="parts_cost"
                        type="number"
                        step="0.01"
                        value={formData.parts_cost}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            parts_cost: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas Adicionales</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    {/* A-1: Disabled during pending to prevent double submit */}
                    <Button type="submit" disabled={isMutating}>
                      {isMutating && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingService ? "Actualizar" : "Crear"} Servicio
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número de servicio o equipo..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* A-3: Explicit loading and error states instead of silent empty table */}
            {servicesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : servicesError ? (
              <div className="flex items-center justify-center py-12 gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>
                  Error al cargar los servicios. Intente recargar la página.
                </span>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Equipo</TableHead>
                        <TableHead>Problema</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Recibido</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">
                            {service.service_number}
                          </TableCell>
                          <TableCell>
                            {service.customers?.name || "Sin cliente"}
                          </TableCell>
                          <TableCell>
                            {service.device_type}
                            {service.brand && ` - ${service.brand}`}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {service.reported_issue}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[service.status]}>
                              {statusLabels[service.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(service.received_date),
                              "dd/MM/yyyy"
                            )}
                          </TableCell>
                          {/* M-3: Use company currency instead of hardcoded "$" */}
                          <TableCell>
                            {currency} {service.total_cost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {service.customer_id &&
                                (service.status === "in_diagnosis" ||
                                  service.status === "in_repair" ||
                                  service.status === "ready") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSendMessage(service)}
                                    title="Enviar mensaje al cliente"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                )}
                              {/* C-1: Edit button only for authorized roles */}
                              {canEdit && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(service)}
                                >
                                  <Wrench className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {services.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center text-muted-foreground"
                          >
                            No se encontraron servicios técnicos
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* M-4: Pagination controls — only visible when needed */}
                {(currentPage > 0 || hasMorePages) && (
                  <div className="flex items-center justify-between px-2 pt-4">
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage + 1}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => p - 1)}
                        disabled={currentPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => p + 1)}
                        disabled={!hasMorePages}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Diálogo para enviar mensajes */}
        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Enviar Mensaje al Cliente
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedServiceForMessage && (
                <>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Cliente:</span>
                      <span className="text-sm">
                        {selectedServiceForMessage.customers?.name}
                      </span>
                    </div>
                    {selectedServiceForMessage.customers?.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Teléfono:</span>
                        <span className="text-sm">
                          {selectedServiceForMessage.customers.phone}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Servicio:</span>
                      <span className="text-sm">
                        {selectedServiceForMessage.service_number}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Estado:</span>
                      <Badge
                        className={
                          statusColors[selectedServiceForMessage.status]
                        }
                      >
                        {statusLabels[selectedServiceForMessage.status]}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensaje de WhatsApp</Label>
                    <Textarea
                      id="message"
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Escribe tu mensaje aquí..."
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      El mensaje se abrirá en WhatsApp Web y quedará registrado
                      en las notas del servicio.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setMessageDialogOpen(false);
                        setMessageContent("");
                        setSelectedServiceForMessage(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => sendMessageMutation.mutate()}
                      disabled={
                        !messageContent.trim() || sendMessageMutation.isPending
                      }
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar por WhatsApp
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
