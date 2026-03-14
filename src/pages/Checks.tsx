import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// M-6: Strong union types instead of plain string
type CheckStatus = "pending" | "deposited" | "cashed" | "rejected" | "cancelled";
type CheckType = "received" | "issued";

interface Check {
  id: string;
  check_number: string;
  bank_name: string;
  amount: number;
  issue_date: string;
  due_date: string;
  status: CheckStatus | null;
  type: CheckType;
  notes: string | null;
  company_id: string | null;
  customer_id: string | null;
  supplier_id: string | null;
}

const statusLabels: Record<CheckStatus, string> = {
  pending: "Pendiente",
  deposited: "Depositado",
  cashed: "Cobrado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

const statusVariants: Record<CheckStatus, string> = {
  pending: "bg-yellow-500",
  deposited: "bg-blue-500",
  cashed: "bg-green-500",
  rejected: "bg-red-500",
  cancelled: "bg-gray-500",
};

const typeLabels: Record<CheckType, string> = {
  received: "Recibido",
  issued: "Emitido",
};

const PAGE_SIZE = 50;

export default function Checks() {
  const { currentCompany } = useCompany();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // C-1: Granular permission checks via usePermissions
  const canView = hasPermission("checks", "view");
  const canCreate = hasPermission("checks", "create");
  const canEdit = hasPermission("checks", "edit");

  // M-5: Currency from company config
  const currency = currentCompany?.currency || "$";

  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // A-3: Pending status change awaiting user confirmation
  const [confirmStatus, setConfirmStatus] = useState<{
    id: string;
    status: CheckStatus;
  } | null>(null);

  const [formData, setFormData] = useState<{
    check_number: string;
    bank_name: string;
    amount: string;
    issue_date: string;
    due_date: string;
    status: CheckStatus;
    type: CheckType;
    notes: string;
  }>({
    check_number: "",
    bank_name: "",
    amount: "",
    issue_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(new Date(), "yyyy-MM-dd"),
    status: "pending",
    type: "received",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      check_number: "",
      bank_name: "",
      amount: "",
      issue_date: format(new Date(), "yyyy-MM-dd"),
      due_date: format(new Date(), "yyyy-MM-dd"),
      status: "pending",
      type: "received",
      notes: "",
    });
  };

  // B-1: Paginated query + M-3: expose isError
  const {
    data: checks = [],
    isLoading,
    isError: checksError,
  } = useQuery({
    queryKey: ["checks", currentCompany?.id, currentPage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checks")
        .select("*")
        .eq("company_id", currentCompany!.id)
        .order("created_at", { ascending: false })
        // B-1: Paginate — avoids loading full history at once
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return data as Check[];
    },
    enabled: canView && !!currentCompany?.id,
  });

  const createCheck = useMutation({
    mutationFn: async (values: typeof formData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");
      // A-2: Guard against null company — prevents orphaned records
      if (!currentCompany) throw new Error("No hay empresa seleccionada");

      const { error } = await supabase.from("checks").insert({
        check_number: values.check_number.trim(),
        bank_name: values.bank_name.trim(),
        amount: parseFloat(values.amount),
        issue_date: values.issue_date,
        due_date: values.due_date,
        status: values.status,
        type: values.type,
        notes: values.notes || null,
        // A-2: Non-optional company_id — safe because of guard above
        company_id: currentCompany.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checks", currentCompany?.id] });
      toast.success("Cheque registrado correctamente");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      // M-4: No console.error — don't leak DB internals to browser console
      toast.error("Error al registrar cheque: " + error.message);
    },
  });

  const updateCheckStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CheckStatus }) => {
      if (!currentCompany) throw new Error("No hay empresa seleccionada");

      const { error } = await supabase
        .from("checks")
        .update({ status })
        .eq("id", id)
        // C-2: Scope update to current company — prevents cross-tenant modification
        .eq("company_id", currentCompany.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checks", currentCompany?.id] });
      toast.success("Estado actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar estado: " + error.message);
    },
  });

  // A-1: Centralized validation before calling the mutation
  const handleCreateCheck = () => {
    const amount = parseFloat(formData.amount);

    if (!formData.check_number.trim()) {
      toast.error("El número de cheque es requerido");
      return;
    }
    if (!formData.bank_name.trim()) {
      toast.error("El nombre del banco es requerido");
      return;
    }
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      toast.error("El monto debe ser un número mayor a 0");
      return;
    }
    if (!formData.issue_date || !formData.due_date) {
      toast.error("Las fechas de emisión y vencimiento son requeridas");
      return;
    }
    // B-3: due_date must not precede issue_date
    if (formData.due_date < formData.issue_date) {
      toast.error(
        "La fecha de vencimiento debe ser igual o posterior a la fecha de emisión"
      );
      return;
    }

    createCheck.mutate(formData);
  };

  const filteredChecks = checks.filter(
    (check) =>
      check.check_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      check.bank_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasMorePages = checks.length === PAGE_SIZE;

  if (permissionsLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // C-1: Block page for unauthorized roles
  if (!canView) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <h2 className="text-2xl font-bold">Sin permisos</h2>
          <p className="text-muted-foreground">
            No tienes permisos para ver esta sección
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Gestión de Cheques
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Registro y seguimiento de cheques recibidos y emitidos
            </p>
          </div>

          {/* C-1: Create button only for authorized roles */}
          {canCreate && (
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                // M-2: Reset form on any close — covers Escape and outside click
                if (!open) resetForm();
                setIsDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Cheque
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Nuevo Cheque</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="check_number">
                        Nº Cheque <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="check_number"
                        value={formData.check_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            check_number: e.target.value,
                          })
                        }
                        placeholder="Ej: 00012345"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">
                        Banco <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="bank_name"
                        value={formData.bank_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bank_name: e.target.value,
                          })
                        }
                        placeholder="Nombre del banco"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">
                        Monto <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: CheckType) =>
                          setFormData({ ...formData, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="received">Recibido</SelectItem>
                          <SelectItem value="issued">Emitido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issue_date">
                        Fecha de Emisión{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="issue_date"
                        type="date"
                        value={formData.issue_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            issue_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due_date">
                        Fecha de Vencimiento{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        // B-3: Browser-level guard — min is issue_date
                        min={formData.issue_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            due_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas (opcional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Observaciones..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={createCheck.isPending}
                    >
                      Cancelar
                    </Button>
                    {/* M-1: Disabled during isPending — prevents double-submit */}
                    <Button
                      onClick={handleCreateCheck}
                      disabled={createCheck.isPending}
                    >
                      {createCheck.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Registrar Cheque
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Cheques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número o banco..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="pl-8"
                />
              </div>
            </div>

            {/* M-3 + B-4: Spinner + explicit error state */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : checksError ? (
              <div className="flex items-center justify-center py-12 gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>
                  Error al cargar los cheques. Intente recargar la página.
                </span>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Cheque</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Emisión</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChecks.map((check) => (
                        <TableRow key={check.id}>
                          <TableCell className="font-medium">
                            {check.check_number}
                          </TableCell>
                          <TableCell>{check.bank_name}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                check.type === "received"
                                  ? "bg-blue-500"
                                  : "bg-purple-500"
                              }
                            >
                              {typeLabels[check.type]}
                            </Badge>
                          </TableCell>
                          {/* M-5: Company currency + explicit locale */}
                          <TableCell className="font-semibold">
                            {currency}{" "}
                            {check.amount.toLocaleString("es", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            {format(new Date(check.issue_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(check.due_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            {/* C-1: Status selector only for authorized roles */}
                            {canEdit ? (
                              <Select
                                value={check.status ?? "pending"}
                                // A-3: Queue for confirmation instead of mutating directly
                                onValueChange={(value) =>
                                  setConfirmStatus({
                                    id: check.id,
                                    status: value as CheckStatus,
                                  })
                                }
                                disabled={updateCheckStatus.isPending}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(
                                    Object.entries(statusLabels) as [
                                      CheckStatus,
                                      string,
                                    ][]
                                  ).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                className={
                                  check.status
                                    ? statusVariants[check.status]
                                    : "bg-gray-400"
                                }
                              >
                                {check.status
                                  ? statusLabels[check.status]
                                  : "—"}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredChecks.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground py-8"
                          >
                            No hay cheques registrados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* B-1: Pagination controls */}
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
      </div>

      {/* A-3: Confirmation dialog — prevents accidental irreversible financial mutations */}
      <Dialog
        open={!!confirmStatus}
        onOpenChange={(open) => {
          if (!open) setConfirmStatus(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar cambio de estado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de cambiar el estado a{" "}
            <span className="font-semibold text-foreground">
              "{confirmStatus ? statusLabels[confirmStatus.status] : ""}"
            </span>
            ? Esta acción tiene impacto contable.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmStatus(null)}
              disabled={updateCheckStatus.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (confirmStatus) {
                  updateCheckStatus.mutate(confirmStatus);
                  setConfirmStatus(null);
                }
              }}
              disabled={updateCheckStatus.isPending}
            >
              {updateCheckStatus.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
