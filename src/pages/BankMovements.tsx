import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, CheckCircle } from "lucide-react";
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
// LOW-4: destination_account_id required when movement_type === "transfer_out"
const bankMovementSchema = z.object({
  bank_account_id: z.string().min(1, "Seleccione una cuenta bancaria"),
  movement_type: z.string().min(1, "Seleccione un tipo de movimiento"),
  movement_date: z.string().min(1, "La fecha es requerida"),
  amount: z.number({ invalid_type_error: "El monto debe ser un número" })
    .positive("El monto debe ser mayor a cero"),
  destination_account_id: z.string().optional(),
}).refine((data) => {
  if (data.movement_type === "transfer_out") {
    return !!data.destination_account_id;
  }
  return true;
}, { message: "Seleccione la cuenta destino para la transferencia", path: ["destination_account_id"] });

export default function BankMovements() {
  const { currentCompany } = useCompany();
  // HIGH-1: permission gates
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("bank_movements", "create");
  const canEdit = hasPermission("bank_movements", "edit");
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    bank_account_id: "",
    movement_type: "deposit",
    // HIGH-5: movement_date field in form (defaults to today)
    movement_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    reference: "",
    description: "",
    destination_account_id: "",
  });
  // MED-4: pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  // MED-5: filters
  const [filterAccount, setFilterAccount] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const { data: accounts } = useQuery({
    queryKey: ["bank-accounts", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("company_id", currentCompany?.id)
        .eq("active", true)
        .order("bank_name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ["bank-movements", currentCompany?.id, page, pageSize, filterAccount, filterFrom, filterTo],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("bank_movements")
        .select(`
          *,
          bank_account:bank_accounts!bank_movements_bank_account_id_fkey(bank_name, account_number),
          destination:bank_accounts!bank_movements_destination_account_id_fkey(bank_name, account_number)
        `, { count: "exact" })
        .eq("company_id", currentCompany?.id)
        .order("movement_date", { ascending: false })
        .range(from, to);

      if (filterAccount) query = query.eq("bank_account_id", filterAccount);
      if (filterFrom) query = query.gte("movement_date", filterFrom);
      if (filterTo) query = query.lte("movement_date", `${filterTo}T23:59:59`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count: count || 0 };
    },
    enabled: !!currentCompany?.id,
  });

  const movements = movementsData?.data;
  const totalItems = movementsData?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const createMovement = useMutation({
    mutationFn: async (data: any) => {
      // CRIT-2: fetch user inside mutation — avoids race condition with separate query
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { error } = await supabase
        .from("bank_movements")
        .insert({
          bank_account_id: data.bank_account_id,
          movement_type: data.movement_type,
          movement_date: data.movement_date,
          amount: parseFloat(data.amount),
          reference: data.reference || null,
          description: data.description || null,
          // CRIT-2: empty string → null, avoids invalid UUID error for non-transfer movements
          destination_account_id: data.destination_account_id || null,
          company_id: currentCompany?.id,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-movements"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Movimiento registrado");
      setIsDialogOpen(false);
      setFormErrors({});
      setFormData({
        bank_account_id: "",
        movement_type: "deposit",
        movement_date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        reference: "",
        description: "",
        destination_account_id: "",
      });
    },
    onError: (error) => {
      toast.error("Error al registrar movimiento");
      console.error(error);
    },
  });

  const reconcileMovement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bank_movements")
        .update({ reconciled: true, reconciliation_date: new Date().toISOString() })
        .eq("id", id)
        .eq("company_id", currentCompany?.id); // IDOR defense-in-depth
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-movements"] });
      toast.success("Movimiento conciliado");
    },
    // HIGH-2: onError handler
    onError: (error) => {
      toast.error("Error al conciliar el movimiento");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    try {
      bankMovementSchema.parse({
        bank_account_id: formData.bank_account_id,
        movement_type: formData.movement_type,
        movement_date: formData.movement_date,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        destination_account_id: formData.destination_account_id || undefined,
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

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "deposit":
      case "transfer_in":
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case "withdrawal":
      case "transfer_out":
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      default:
        return <ArrowRightLeft className="h-4 w-4" />;
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      deposit: "Depósito",
      withdrawal: "Extracción",
      transfer_in: "Transferencia Recibida",
      transfer_out: "Transferencia Enviada",
    };
    return labels[type] || type;
  };

  const hasFilters = !!filterAccount || !!filterFrom || !!filterTo;

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Movimientos Bancarios</h1>
            <p className="text-sm text-muted-foreground">
              Registra y concilia movimientos bancarios
            </p>
          </div>

          {/* HIGH-1: canCreate gate */}
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
                  <DialogTitle>Nuevo Movimiento Bancario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Los campos con <span className="text-destructive">*</span> son obligatorios.</p>

                  <div>
                    <Label className="text-sm font-medium">Cuenta Bancaria <span className="text-destructive">*</span></Label>
                    <Select
                      value={formData.bank_account_id}
                      onValueChange={(value) => { setFormData({ ...formData, bank_account_id: value }); if (formErrors.bank_account_id) setFormErrors((p) => ({ ...p, bank_account_id: "" })); }}
                    >
                      <SelectTrigger className={formErrors.bank_account_id ? "border-destructive" : ""}>
                        <SelectValue placeholder="Seleccionar cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.bank_name} - {account.account_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.bank_account_id && <p className="text-sm text-destructive mt-1">{formErrors.bank_account_id}</p>}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Tipo de Movimiento <span className="text-destructive">*</span></Label>
                    <Select
                      value={formData.movement_type}
                      onValueChange={(value) => setFormData({ ...formData, movement_type: value, destination_account_id: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit">Depósito</SelectItem>
                        <SelectItem value="withdrawal">Extracción</SelectItem>
                        <SelectItem value="transfer_out">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* LOW-4: destination required when transfer_out */}
                  {formData.movement_type === "transfer_out" && (
                    <div>
                      <Label className="text-sm font-medium">Cuenta Destino <span className="text-destructive">*</span></Label>
                      <Select
                        value={formData.destination_account_id}
                        onValueChange={(value) => { setFormData({ ...formData, destination_account_id: value }); if (formErrors.destination_account_id) setFormErrors((p) => ({ ...p, destination_account_id: "" })); }}
                      >
                        <SelectTrigger className={formErrors.destination_account_id ? "border-destructive" : ""}>
                          <SelectValue placeholder="Seleccionar cuenta destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            ?.filter((a: any) => a.id !== formData.bank_account_id)
                            .map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.bank_name} - {account.account_number}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {formErrors.destination_account_id && <p className="text-sm text-destructive mt-1">{formErrors.destination_account_id}</p>}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* HIGH-5: movement_date field */}
                    <div>
                      <Label className="text-sm font-medium">Fecha <span className="text-destructive">*</span></Label>
                      <Input
                        type="date"
                        value={formData.movement_date}
                        onChange={(e) => { setFormData({ ...formData, movement_date: e.target.value }); if (formErrors.movement_date) setFormErrors((p) => ({ ...p, movement_date: "" })); }}
                        className={formErrors.movement_date ? "border-destructive" : ""}
                      />
                      {formErrors.movement_date && <p className="text-sm text-destructive mt-1">{formErrors.movement_date}</p>}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Monto <span className="text-destructive">*</span></Label>
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
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Referencia</Label>
                    <Input
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="Número de comprobante, cheque, etc."
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Descripción</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detalles del movimiento"
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

        {/* MED-5: filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Cuenta</Label>
            <Select
              value={filterAccount || "all"}
              onValueChange={(v) => { setFilterAccount(v === "all" ? "" : v); setPage(0); }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas las cuentas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cuentas</SelectItem>
                {accounts?.map((acc: any) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.bank_name} - {acc.account_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Desde</Label>
            <Input
              type="date"
              value={filterFrom}
              onChange={(e) => { setFilterFrom(e.target.value); setPage(0); }}
              className="h-9 w-36"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Hasta</Label>
            <Input
              type="date"
              value={filterTo}
              onChange={(e) => { setFilterTo(e.target.value); setPage(0); }}
              className="h-9 w-36"
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterAccount(""); setFilterFrom(""); setFilterTo(""); setPage(0); }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[90px]">Fecha</TableHead>
                <TableHead className="min-w-[100px]">Cuenta</TableHead>
                <TableHead className="min-w-[100px]">Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Referencia</TableHead>
                <TableHead className="hidden lg:table-cell">Descripción</TableHead>
                <TableHead className="text-right min-w-[90px]">Monto</TableHead>
                <TableHead className="min-w-[80px]">Estado</TableHead>
                {canEdit && <TableHead>Acc.</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="text-center">Cargando...</TableCell>
                </TableRow>
              ) : movements?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="text-center">No hay movimientos registrados</TableCell>
                </TableRow>
              ) : (
                movements?.map((movement: any) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-xs sm:text-sm">
                      {format(new Date(movement.movement_date), "dd/MM/yy")}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs sm:text-sm">{movement.bank_account?.bank_name}</span>
                      <br />
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {movement.bank_account?.account_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 sm:gap-2">
                        {getMovementIcon(movement.movement_type)}
                        <span className="text-xs sm:text-sm">{getMovementTypeLabel(movement.movement_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{movement.reference || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell max-w-xs truncate">{movement.description || "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          movement.movement_type === "deposit" || movement.movement_type === "transfer_in"
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {movement.movement_type === "deposit" || movement.movement_type === "transfer_in" ? "+" : "-"}
                        {movement.amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={movement.reconciled ? "default" : "secondary"}>
                        {movement.reconciled ? "Conciliado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    {/* HIGH-1: canEdit | HIGH-6: disabled during pending */}
                    {canEdit && (
                      <TableCell>
                        {!movement.reconciled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={reconcileMovement.isPending}
                            onClick={() => reconcileMovement.mutate(movement.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Conciliar
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
