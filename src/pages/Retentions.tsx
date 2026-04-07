import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { Plus, FileText, Download } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { format } from "date-fns";

// HIGH-3: Zod validation schema
const retentionSchema = z.object({
  retention_type: z.string().min(1, "El tipo de retención es requerido"),
  retention_date: z.string().min(1, "La fecha es requerida"),
  amount: z.number({ invalid_type_error: "El monto debe ser un número" })
    .positive("El monto debe ser mayor a cero"),
  percentage: z.number({ invalid_type_error: "El porcentaje debe ser un número" })
    .min(0, "El porcentaje no puede ser negativo")
    .max(100, "El porcentaje no puede superar el 100%"),
  certificate_number: z.string().optional(),
  jurisdiction: z.string().optional(),
  description: z.string().optional(),
});

export default function Retentions() {
  const { currentCompany } = useCompany();
  // HIGH-1: permission gates
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("retentions", "create");
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    retention_type: "iibb",
    retention_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    percentage: "",
    certificate_number: "",
    jurisdiction: "",
    description: "",
  });
  // MED-4: pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  // MED-5: type filter
  const [filterType, setFilterType] = useState("");

  const { data: retentionsData, isLoading } = useQuery({
    queryKey: ["retentions", currentCompany?.id, page, pageSize, filterType],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("retentions")
        .select(`
          *,
          customer:customers(name),
          supplier:suppliers(name)
        `, { count: "exact" })
        .eq("company_id", currentCompany?.id)
        .order("retention_date", { ascending: false })
        .range(from, to);

      if (filterType) query = query.eq("retention_type", filterType);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count: count || 0 };
    },
    enabled: !!currentCompany?.id,
  });

  // Stats query without pagination
  const { data: allRetentions } = useQuery({
    queryKey: ["retentions-stats", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retentions")
        .select("retention_type, amount")
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const retentions = retentionsData?.data;
  const totalItems = retentionsData?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const createRetention = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("retentions")
        .insert({
          ...data,
          company_id: currentCompany?.id,
          amount: parseFloat(data.amount),
          percentage: parseFloat(data.percentage),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retentions"] });
      queryClient.invalidateQueries({ queryKey: ["retentions-stats"] });
      toast.success("Retención registrada");
      setIsDialogOpen(false);
      setFormErrors({});
      setFormData({
        retention_type: "iibb",
        retention_date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        percentage: "",
        certificate_number: "",
        jurisdiction: "",
        description: "",
      });
    },
    onError: (error) => {
      toast.error("Error al registrar retención");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    try {
      retentionSchema.parse({
        retention_type: formData.retention_type,
        retention_date: formData.retention_date,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        percentage: formData.percentage ? parseFloat(formData.percentage) : undefined,
        certificate_number: formData.certificate_number || undefined,
        jurisdiction: formData.jurisdiction || undefined,
        description: formData.description || undefined,
      });
      setFormErrors({});
      createRetention.mutate(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setFormErrors(newErrors);
      }
    }
  };

  const getRetentionTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      iibb: "Ingresos Brutos",
      ganancias: "Ganancias",
      iva: "IVA",
      suss: "SUSS",
    };
    return labels[type] || type;
  };

  const getRetentionTypeBadge = (type: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      iibb: "default",
      ganancias: "secondary",
      iva: "destructive",
      suss: "outline",
    };
    return variants[type] || "default";
  };

  const totalRetentions = allRetentions?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0;
  const retentionsByType = allRetentions?.reduce((acc: any, r: any) => {
    acc[r.retention_type] = (acc[r.retention_type] || 0) + r.amount;
    return acc;
  }, {});

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Retenciones</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Gestión de retenciones fiscales
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled className="opacity-60 text-xs sm:text-sm" size="sm">
              <Download className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Exportar AFIP</span>
              <span className="sm:hidden">AFIP</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs hidden sm:inline">Próximamente</Badge>
            </Button>

            {/* HIGH-1: canCreate gate */}
            {canCreate && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Retención
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nueva Retención</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">Los campos con <span className="text-destructive">*</span> son obligatorios.</p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Tipo de Retención <span className="text-destructive">*</span></Label>
                        <Select
                          value={formData.retention_type}
                          onValueChange={(value) => { setFormData({ ...formData, retention_type: value, jurisdiction: "" }); if (formErrors.retention_type) setFormErrors((p) => ({ ...p, retention_type: "" })); }}
                        >
                          <SelectTrigger className={formErrors.retention_type ? "border-destructive" : ""}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="iibb">Ingresos Brutos</SelectItem>
                            <SelectItem value="ganancias">Ganancias</SelectItem>
                            <SelectItem value="iva">IVA</SelectItem>
                            <SelectItem value="suss">SUSS</SelectItem>
                          </SelectContent>
                        </Select>
                        {formErrors.retention_type && <p className="text-sm text-destructive mt-1">{formErrors.retention_type}</p>}
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Fecha de Retención <span className="text-destructive">*</span></Label>
                        <Input
                          type="date"
                          value={formData.retention_date}
                          onChange={(e) => { setFormData({ ...formData, retention_date: e.target.value }); if (formErrors.retention_date) setFormErrors((p) => ({ ...p, retention_date: "" })); }}
                          className={formErrors.retention_date ? "border-destructive" : ""}
                        />
                        {formErrors.retention_date && <p className="text-sm text-destructive mt-1">{formErrors.retention_date}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Monto Retenido <span className="text-destructive">*</span></Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={formData.amount}
                          onChange={(e) => { setFormData({ ...formData, amount: e.target.value }); if (formErrors.amount) setFormErrors((p) => ({ ...p, amount: "" })); }}
                          placeholder="0.00"
                          className={formErrors.amount ? "border-destructive" : ""}
                        />
                        {formErrors.amount && <p className="text-sm text-destructive mt-1">{formErrors.amount}</p>}
                      </div>

                      <div>
                        {/* MED-3: label clarifies relationship */}
                        <Label className="text-sm font-medium">Porcentaje Aplicado (%) <span className="text-destructive">*</span></Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.percentage}
                          onChange={(e) => { setFormData({ ...formData, percentage: e.target.value }); if (formErrors.percentage) setFormErrors((p) => ({ ...p, percentage: "" })); }}
                          placeholder="0.00"
                          className={formErrors.percentage ? "border-destructive" : ""}
                        />
                        {formErrors.percentage && <p className="text-sm text-destructive mt-1">{formErrors.percentage}</p>}
                        <p className="text-xs text-muted-foreground mt-1">Ingresá el % y el monto ya calculado</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Número de Certificado</Label>
                        <Input
                          value={formData.certificate_number}
                          onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                          placeholder="Número del comprobante"
                        />
                      </div>

                      {formData.retention_type === "iibb" && (
                        <div>
                          <Label className="text-sm font-medium">Jurisdicción</Label>
                          <Select
                            value={formData.jurisdiction}
                            onValueChange={(value) => setFormData({ ...formData, jurisdiction: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar jurisdicción" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CABA">CABA</SelectItem>
                              <SelectItem value="Buenos Aires">Buenos Aires</SelectItem>
                              <SelectItem value="Córdoba">Córdoba</SelectItem>
                              <SelectItem value="Santa Fe">Santa Fe</SelectItem>
                              <SelectItem value="Mendoza">Mendoza</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Descripción</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Detalles de la retención"
                      />
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={createRetention.isPending}
                      className="w-full"
                    >
                      {createRetention.isPending ? "Registrando..." : "Registrar Retención"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="p-6 bg-card rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Total Retenciones</p>
            </div>
            <p className="text-2xl font-bold">
              {totalRetentions.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {Object.entries(retentionsByType || {}).map(([type, amount]: [string, any]) => (
            <div key={type} className="p-6 bg-card rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">{getRetentionTypeLabel(type)}</p>
              </div>
              <p className="text-2xl font-bold">
                {amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>

        {/* MED-5: type filter */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Tipo</Label>
            <Select
              value={filterType || "all"}
              onValueChange={(v) => { setFilterType(v === "all" ? "" : v); setPage(0); }}
            >
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="iibb">Ingresos Brutos</SelectItem>
                <SelectItem value="ganancias">Ganancias</SelectItem>
                <SelectItem value="iva">IVA</SelectItem>
                <SelectItem value="suss">SUSS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filterType && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterType(""); setPage(0); }}>
              Limpiar filtro
            </Button>
          )}
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[90px]">Fecha</TableHead>
                <TableHead className="min-w-[100px]">Tipo</TableHead>
                {/* MED-2: responsive header classes must match body cells */}
                <TableHead className="hidden sm:table-cell">Certificado</TableHead>
                <TableHead className="hidden md:table-cell">Jurisdicción</TableHead>
                <TableHead className="text-right min-w-[80px]">Monto</TableHead>
                <TableHead className="text-right hidden sm:table-cell">%</TableHead>
                <TableHead className="hidden lg:table-cell">Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Cargando...</TableCell>
                </TableRow>
              ) : retentions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No hay retenciones registradas</TableCell>
                </TableRow>
              ) : (
                retentions?.map((retention: any) => (
                  <TableRow key={retention.id}>
                    <TableCell>
                      {format(new Date(retention.retention_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRetentionTypeBadge(retention.retention_type)}>
                        {getRetentionTypeLabel(retention.retention_type)}
                      </Badge>
                    </TableCell>
                    {/* MED-2: body cells now match header responsive classes */}
                    <TableCell className="hidden sm:table-cell">{retention.certificate_number || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{retention.jurisdiction || "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {retention.amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      {retention.percentage}%
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-xs truncate">
                      {retention.description || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {/* MED-4: pagination */}
          <PaginationControls
            currentPage={page + 1}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={totalItems === 0 ? 0 : page * pageSize + 1}
            endIndex={Math.min((page + 1) * pageSize, totalItems)}
            pageSize={pageSize}
            canGoNext={page < totalPages - 1}
            canGoPrevious={page > 0}
            onPageChange={(p) => setPage(p - 1)}
            onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
            onNextPage={() => setPage((prev) => prev + 1)}
            onPreviousPage={() => setPage((prev) => prev - 1)}
            onFirstPage={() => setPage(0)}
            onLastPage={() => setPage(totalPages - 1)}
          />
        </div>
      </div>
    </Layout>
  );
}
