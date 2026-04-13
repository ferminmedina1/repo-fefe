import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { Plus, CreditCard, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { format } from "date-fns";

// HIGH-3: Zod validation schema
// MED-6: accreditation_date >= sale_date via refine
// LOW-3: installments min 1
const cardMovementSchema = z.object({
  card_type: z.string().min(1),
  card_brand: z.string().min(1),
  sale_date: z.string().min(1, "La fecha de venta es requerida"),
  accreditation_date: z.string().min(1, "La fecha de acreditación es requerida"),
  gross_amount: z.number({ invalid_type_error: "El monto debe ser un número" })
    .positive("El monto bruto debe ser mayor a cero"),
  commission_percentage: z.number({ invalid_type_error: "La comisión debe ser un número" })
    .min(0, "La comisión no puede ser negativa")
    .max(100, "La comisión no puede superar el 100%"),
  installments: z.number({ invalid_type_error: "Las cuotas deben ser un número" })
    .int("Las cuotas deben ser un número entero")
    .min(1, "Las cuotas deben ser al menos 1"),
}).refine((data) => data.accreditation_date >= data.sale_date, {
  message: "La fecha de acreditación debe ser igual o posterior a la fecha de venta",
  path: ["accreditation_date"],
});

// LOW-2: sensible per-brand/type commission defaults
const COMMISSION_DEFAULTS: Record<string, Record<string, string>> = {
  credit: { visa: "3", mastercard: "3", amex: "5", cabal: "3", naranja: "4" },
  debit: { visa: "1.5", mastercard: "1.5", amex: "3", cabal: "1.5", naranja: "2" },
};

export default function CardMovements() {
  const { currentCompany } = useCompany();
  // HIGH-1: permission gates
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("card_movements", "create");
  const canEdit = hasPermission("card_movements", "edit");
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    card_type: "credit",
    card_brand: "visa",
    sale_date: format(new Date(), "yyyy-MM-dd"),
    accreditation_date: format(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    gross_amount: "",
    commission_percentage: COMMISSION_DEFAULTS["credit"]["visa"],
    installments: "1",
    batch_number: "",
  });
  // MED-4: pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  // MED-5: status filter
  const [filterStatus, setFilterStatus] = useState("");

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ["card-movements", currentCompany?.id, page, pageSize, filterStatus],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("card_movements")
        .select("*", { count: "exact" })
        .eq("company_id", currentCompany?.id)
        .order("sale_date", { ascending: false })
        .range(from, to);

      if (filterStatus) query = query.eq("status", filterStatus);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count: count || 0 };
    },
    enabled: !!currentCompany?.id,
  });

  // Stats query without pagination for summary cards
  const { data: allMovements } = useQuery({
    queryKey: ["card-movements-stats", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_movements")
        .select("status, net_amount, commission_amount")
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const movements = movementsData?.data;
  const totalItems = movementsData?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const createMovement = useMutation({
    mutationFn: async (data: any) => {
      const grossAmount = parseFloat(data.gross_amount);
      const commissionPercentage = parseFloat(data.commission_percentage);
      const commissionAmount = (grossAmount * commissionPercentage) / 100;
      const netAmount = grossAmount - commissionAmount;

      const { error } = await supabase
        .from("card_movements")
        .insert({
          ...data,
          company_id: currentCompany?.id,
          gross_amount: grossAmount,
          commission_percentage: commissionPercentage,
          commission_amount: commissionAmount,
          net_amount: netAmount,
          installments: parseInt(data.installments),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-movements"] });
      queryClient.invalidateQueries({ queryKey: ["card-movements-stats"] });
      toast.success("Movimiento de tarjeta registrado");
      setIsDialogOpen(false);
      setFormErrors({});
      setFormData({
        card_type: "credit",
        card_brand: "visa",
        sale_date: format(new Date(), "yyyy-MM-dd"),
        accreditation_date: format(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        gross_amount: "",
        commission_percentage: COMMISSION_DEFAULTS["credit"]["visa"],
        installments: "1",
        batch_number: "",
      });
    },
    onError: (error) => {
      toast.error("Error al registrar movimiento");
      console.error(error);
    },
  });

  const markAsAccredited = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("card_movements")
        .update({
          status: "accredited",
          accredited_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_id", currentCompany?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-movements", currentCompany?.id] });
      toast.success("Movimiento marcado como acreditado");
    },
    // HIGH-2: onError handler
    onError: (error) => {
      toast.error("Error al acreditar el movimiento");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    try {
      cardMovementSchema.parse({
        card_type: formData.card_type,
        card_brand: formData.card_brand,
        sale_date: formData.sale_date,
        accreditation_date: formData.accreditation_date,
        gross_amount: formData.gross_amount ? parseFloat(formData.gross_amount) : undefined,
        commission_percentage: formData.commission_percentage ? parseFloat(formData.commission_percentage) : undefined,
        installments: formData.installments ? parseInt(formData.installments) : undefined,
      });
      setFormErrors({});
      createMovement.mutate(formData);
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

  const pendingMovements = allMovements?.filter((m: any) => m.status === "pending") || [];
  const accreditedMovements = allMovements?.filter((m: any) => m.status === "accredited") || [];
  const totalPending = pendingMovements.reduce((sum: number, m: any) => sum + m.net_amount, 0);
  const totalCommissions = allMovements?.reduce((sum: number, m: any) => sum + m.commission_amount, 0) || 0;

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Movimientos de Tarjetas</h1>
            <p className="text-sm text-muted-foreground">
              Seguimiento de acreditaciones y comisiones
            </p>
          </div>

          {/* HIGH-1: canCreate gate | CRIT-1: single DialogTrigger (duplicate removed) */}
          {canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Movimiento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo Movimiento de Tarjeta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Los campos con <span className="text-destructive">*</span> son obligatorios.</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Tipo de Tarjeta <span className="text-destructive">*</span></Label>
                      <Select
                        value={formData.card_type}
                        onValueChange={(value) => {
                          // LOW-2: update commission default when type changes
                          const commission = COMMISSION_DEFAULTS[value]?.[formData.card_brand] || "3";
                          setFormData({ ...formData, card_type: value, commission_percentage: commission });
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Crédito</SelectItem>
                          <SelectItem value="debit">Débito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Marca <span className="text-destructive">*</span></Label>
                      <Select
                        value={formData.card_brand}
                        onValueChange={(value) => {
                          // LOW-2: update commission default when brand changes
                          const commission = COMMISSION_DEFAULTS[formData.card_type]?.[value] || "3";
                          setFormData({ ...formData, card_brand: value, commission_percentage: commission });
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visa">Visa</SelectItem>
                          <SelectItem value="mastercard">Mastercard</SelectItem>
                          <SelectItem value="amex">American Express</SelectItem>
                          <SelectItem value="cabal">Cabal</SelectItem>
                          <SelectItem value="naranja">Naranja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Fecha de Venta <span className="text-destructive">*</span></Label>
                      <Input
                        type="date"
                        value={formData.sale_date}
                        onChange={(e) => { setFormData({ ...formData, sale_date: e.target.value }); if (formErrors.sale_date) setFormErrors((p) => ({ ...p, sale_date: "" })); }}
                        className={formErrors.sale_date ? "border-destructive" : ""}
                      />
                      {formErrors.sale_date && <p className="text-sm text-destructive mt-1">{formErrors.sale_date}</p>}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Fecha de Acreditación <span className="text-destructive">*</span></Label>
                      <Input
                        type="date"
                        value={formData.accreditation_date}
                        onChange={(e) => { setFormData({ ...formData, accreditation_date: e.target.value }); if (formErrors.accreditation_date) setFormErrors((p) => ({ ...p, accreditation_date: "" })); }}
                        className={formErrors.accreditation_date ? "border-destructive" : ""}
                      />
                      {/* MED-6: date validation message shown here */}
                      {formErrors.accreditation_date && <p className="text-sm text-destructive mt-1">{formErrors.accreditation_date}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Monto Bruto <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.gross_amount}
                        onChange={(e) => { setFormData({ ...formData, gross_amount: e.target.value }); if (formErrors.gross_amount) setFormErrors((p) => ({ ...p, gross_amount: "" })); }}
                        placeholder="0.00"
                        className={formErrors.gross_amount ? "border-destructive" : ""}
                      />
                      {formErrors.gross_amount && <p className="text-sm text-destructive mt-1">{formErrors.gross_amount}</p>}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Comisión (%) <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.commission_percentage}
                        onChange={(e) => { setFormData({ ...formData, commission_percentage: e.target.value }); if (formErrors.commission_percentage) setFormErrors((p) => ({ ...p, commission_percentage: "" })); }}
                        placeholder="3.00"
                        className={formErrors.commission_percentage ? "border-destructive" : ""}
                      />
                      {formErrors.commission_percentage && <p className="text-sm text-destructive mt-1">{formErrors.commission_percentage}</p>}
                    </div>

                    <div>
                      {/* LOW-3: min=1 */}
                      <Label className="text-sm font-medium">Cuotas <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.installments}
                        onChange={(e) => { setFormData({ ...formData, installments: e.target.value }); if (formErrors.installments) setFormErrors((p) => ({ ...p, installments: "" })); }}
                        className={formErrors.installments ? "border-destructive" : ""}
                      />
                      {formErrors.installments && <p className="text-sm text-destructive mt-1">{formErrors.installments}</p>}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Número de Lote (opcional)</Label>
                    <Input
                      value={formData.batch_number}
                      onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                      placeholder="Número de lote del resumen"
                    />
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={createMovement.isPending}
                    className="w-full"
                  >
                    {createMovement.isPending ? "Registrando..." : "Registrar Movimiento"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Alert className="border-blue-500/50 bg-blue-500/10">
          <AlertTriangle className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-600">Próximamente: Sincronización Automática</AlertTitle>
          <AlertDescription className="text-blue-600/80">
            Pronto podrás sincronizar automáticamente los movimientos con Prisma Medios de Pago,
            Mercado Pago, Naranja X y otras procesadoras para conciliación automática.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
          <div className="p-4 md:p-6 bg-card rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <p className="text-sm font-medium text-muted-foreground">Pendientes de Acreditación</p>
            </div>
            <p className="text-xl md:text-2xl font-bold">{pendingMovements.length}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {totalPending.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-4 md:p-6 bg-card rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Acreditados</p>
            </div>
            <p className="text-xl md:text-2xl font-bold">{accreditedMovements.length}</p>
          </div>

          <div className="p-4 md:p-6 bg-card rounded-lg border col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Comisiones</p>
            </div>
            <p className="text-xl md:text-2xl font-bold text-red-600">
              {totalCommissions.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* MED-5: status filter */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Estado</Label>
            <Select
              value={filterStatus || "all"}
              onValueChange={(v) => { setFilterStatus(v === "all" ? "" : v); setPage(0); }}
            >
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="accredited">Acreditados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filterStatus && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus(""); setPage(0); }}>
              Limpiar filtro
            </Button>
          )}
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[80px]">Fecha</TableHead>
                <TableHead className="min-w-[90px]">Tarjeta</TableHead>
                <TableHead className="hidden md:table-cell">Acreditación</TableHead>
                <TableHead className="text-right min-w-[80px]">Bruto</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Comisión</TableHead>
                <TableHead className="text-right min-w-[80px]">Neto</TableHead>
                <TableHead className="hidden lg:table-cell">Cuotas</TableHead>
                <TableHead>Estado</TableHead>
                {canEdit && <TableHead>Acc.</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 9 : 8} className="text-center">Cargando...</TableCell>
                </TableRow>
              ) : movements?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 9 : 8} className="text-center">No hay movimientos registrados</TableCell>
                </TableRow>
              ) : (
                movements?.map((movement: any) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-xs sm:text-sm">
                      {format(new Date(movement.sale_date), "dd/MM/yy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                        <div>
                          <div className="font-medium capitalize text-xs sm:text-sm">{movement.card_brand}</div>
                          <div className="text-xs text-muted-foreground hidden sm:block">
                            {movement.card_type === "credit" ? "Crédito" : "Débito"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(movement.accreditation_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm">
                      {movement.gross_amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600 hidden sm:table-cell text-xs">
                      -{movement.commission_percentage}%
                      <br />
                      <span className="text-xs">
                        ({movement.commission_amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs sm:text-sm">
                      {movement.net_amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{movement.installments}x</TableCell>
                    <TableCell>
                      <Badge variant={movement.status === "accredited" ? "default" : "secondary"}>
                        {movement.status === "accredited" ? "Acreditado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    {/* HIGH-1: canEdit | HIGH-6: disabled during pending */}
                    {canEdit && (
                      <TableCell>
                        {movement.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={markAsAccredited.isPending}
                            onClick={() => markAsAccredited.mutate(movement.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Acreditar
                          </Button>
                        )}
                      </TableCell>
                    )}
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
