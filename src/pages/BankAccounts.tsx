import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { Plus, Search, Building2, CreditCard, Wallet, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PaginationControls } from "@/components/ui/pagination-controls";

// MED-1: schema after all imports
// LOW-1: .finite() catches NaN with accurate message instead of "no puede ser negativo"
const bankAccountSchema = z.object({
  bank_name: z.string().trim().min(1, "El nombre del banco es requerido").max(200, "El nombre debe tener máximo 200 caracteres"),
  account_number: z.string().trim().min(1, "El número de cuenta es requerido").max(50, "El número de cuenta debe tener máximo 50 caracteres"),
  balance: z.number({ invalid_type_error: "El saldo debe ser un número válido" })
    .finite("El saldo debe ser un número válido")
    .nonnegative("El saldo no puede ser negativo")
    .optional(),
});

// Edit schema: balance is NOT editable (managed by movements trigger)
const editAccountSchema = z.object({
  bank_name: z.string().trim().min(1, "El nombre del banco es requerido").max(200, "El nombre debe tener máximo 200 caracteres"),
  account_number: z.string().trim().min(1, "El número de cuenta es requerido").max(50, "El número de cuenta debe tener máximo 50 caracteres"),
});

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  currency: string;
  balance: number;
  active: boolean;
  created_at: string;
}

export default function BankAccounts() {
  const { currentCompany } = useCompany();
  // HIGH-1: permission gates
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("bank_accounts", "create");
  const canEdit = hasPermission("bank_accounts", "edit");
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    bank_name: "",
    account_number: "",
    account_type: "checking",
    currency: "ARS",
    balance: "0",
  });
  // MED-4: pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  // MED-7: confirmation state for toggle
  const [confirmToggle, setConfirmToggle] = useState<{ id: string; active: boolean; name: string } | null>(null);
  // Edit state
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editData, setEditData] = useState({ bank_name: "", account_number: "", account_type: "", currency: "" });

  // Paginated query with server-side search
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ["bank-accounts", currentCompany?.id, searchQuery, page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("bank_accounts")
        .select("*", { count: "exact" })
        .eq("company_id", currentCompany?.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (searchQuery.trim()) {
        query = query.or(`bank_name.ilike.%${searchQuery.trim()}%,account_number.ilike.%${searchQuery.trim()}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as BankAccount[], count: count || 0 };
    },
    enabled: !!currentCompany?.id,
  });

  // Separate global stats query (no pagination/search) — HIGH-4: per-currency breakdown
  const { data: allAccounts } = useQuery({
    queryKey: ["bank-accounts-stats", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("balance, currency, active")
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
      return data as Pick<BankAccount, "balance" | "currency" | "active">[];
    },
    enabled: !!currentCompany?.id,
  });

  const accounts = accountsData?.data;
  const totalItems = accountsData?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const createAccount = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("bank_accounts")
        .insert({ ...data, company_id: currentCompany?.id, balance: parseFloat(data.balance) });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-stats"] });
      toast.success("Cuenta bancaria creada");
      setIsDialogOpen(false);
      setFormErrors({});
      setFormData({ bank_name: "", account_number: "", account_type: "checking", currency: "ARS", balance: "0" });
    },
    onError: (error) => {
      toast.error("Error al crear cuenta bancaria");
      console.error(error);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editData }) => {
      const { error } = await supabase
        .from("bank_accounts")
        .update({
          bank_name: data.bank_name.trim(),
          account_number: data.account_number.trim(),
          account_type: data.account_type,
          currency: data.currency,
        })
        .eq("id", id)
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-stats"] });
      toast.success("Cuenta actualizada");
      setEditingAccount(null);
      setEditErrors({});
    },
    onError: (error) => {
      toast.error("Error al actualizar la cuenta");
      console.error(error);
    },
  });

  const toggleAccountStatus = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("bank_accounts")
        .update({ active })
        .eq("id", id)
        .eq("company_id", currentCompany?.id); // IDOR defense-in-depth
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-stats"] });
      toast.success("Estado actualizado");
      setConfirmToggle(null);
    },
    // HIGH-2: onError handler
    onError: (error) => {
      toast.error("Error al actualizar el estado de la cuenta");
      console.error(error);
      setConfirmToggle(null);
    },
  });

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "savings": return <Wallet className="h-4 w-4" />;
      case "credit": return <CreditCard className="h-4 w-4" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      checking: "Cuenta Corriente",
      savings: "Caja de Ahorro",
      credit: "Tarjeta de Crédito",
    };
    return labels[type] || type;
  };

  const totalAccountsCount = allAccounts?.length || 0;
  const activeCount = allAccounts?.filter((a) => a.active).length || 0;
  // HIGH-4: per-currency — no mixed-currency sum
  const balanceByCurrency = allAccounts
    ?.filter((a) => a.active)
    .reduce((acc, a) => {
      acc[a.currency] = (acc[a.currency] || 0) + a.balance;
      return acc;
    }, {} as Record<string, number>) || {};

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Cuentas Bancarias</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gestiona las cuentas bancarias de tu empresa
            </p>
          </div>

          {/* HIGH-1: canCreate gate */}
          {canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cuenta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Cuenta Bancaria</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Los campos con <span className="text-destructive">*</span> son obligatorios.</p>
                  <div>
                    <Label className="text-sm font-medium">Banco <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.bank_name}
                      onChange={(e) => { setFormData({ ...formData, bank_name: e.target.value }); if (formErrors.bank_name) setFormErrors((p) => ({ ...p, bank_name: "" })); }}
                      placeholder="Nombre del banco"
                      className={formErrors.bank_name ? "border-destructive" : ""}
                    />
                    {formErrors.bank_name && <p className="text-sm text-destructive mt-1">{formErrors.bank_name}</p>}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Número de Cuenta <span className="text-destructive">*</span></Label>
                    <Input
                      value={formData.account_number}
                      onChange={(e) => { setFormData({ ...formData, account_number: e.target.value }); if (formErrors.account_number) setFormErrors((p) => ({ ...p, account_number: "" })); }}
                      placeholder="Número de cuenta"
                      className={formErrors.account_number ? "border-destructive" : ""}
                    />
                    {formErrors.account_number && <p className="text-sm text-destructive mt-1">{formErrors.account_number}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tipo de Cuenta</label>
                    <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Cuenta Corriente</SelectItem>
                        <SelectItem value="savings">Caja de Ahorro</SelectItem>
                        <SelectItem value="credit">Tarjeta de Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Moneda</label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                        <SelectItem value="USD">USD (Dólares)</SelectItem>
                        <SelectItem value="EUR">EUR (Euros)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Saldo Inicial</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.balance}
                      onChange={(e) => { setFormData({ ...formData, balance: e.target.value }); if (formErrors.balance) setFormErrors((p) => ({ ...p, balance: "" })); }}
                      placeholder="0.00"
                      className={formErrors.balance ? "border-destructive" : ""}
                    />
                    {formErrors.balance && <p className="text-sm text-destructive mt-1">{formErrors.balance}</p>}
                  </div>

                  <Button
                    onClick={() => {
                      try {
                        bankAccountSchema.parse({
                          bank_name: formData.bank_name,
                          account_number: formData.account_number,
                          balance: formData.balance ? parseFloat(formData.balance) : undefined,
                        });
                        setFormErrors({});
                        createAccount.mutate(formData);
                      } catch (error) {
                        if (error instanceof z.ZodError) {
                          const newErrors: Record<string, string> = {};
                          error.errors.forEach((err) => {
                            if (err.path[0]) newErrors[err.path[0] as string] = err.message;
                          });
                          setFormErrors(newErrors);
                        }
                      }
                    }}
                    disabled={createAccount.isPending}
                    className="w-full"
                  >
                    {createAccount.isPending ? "Creando..." : "Crear Cuenta"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-6 bg-card rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Total Cuentas</p>
            </div>
            <p className="text-2xl font-bold">{totalAccountsCount}</p>
          </div>

          <div className="p-6 bg-card rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-muted-foreground">Cuentas Activas</p>
            </div>
            <p className="text-2xl font-bold">{activeCount}</p>
          </div>

          {/* HIGH-4: per-currency — avoids misleading mixed-currency sum */}
          <div className="p-6 bg-card rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-muted-foreground">Saldo por Moneda</p>
            </div>
            {Object.keys(balanceByCurrency).length === 0 ? (
              <p className="text-2xl font-bold">—</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(balanceByCurrency).map(([currency, total]) => (
                  <p key={currency} className="text-lg font-bold">
                    <span className="text-sm font-normal text-muted-foreground mr-1">{currency}</span>
                    {total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por banco o número de cuenta..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-8"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Número de Cuenta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                {canEdit && <TableHead>Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center">Cargando...</TableCell>
                </TableRow>
              ) : accounts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="text-center">No hay cuentas bancarias registradas</TableCell>
                </TableRow>
              ) : (
                accounts?.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.bank_name}</TableCell>
                    <TableCell>{account.account_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAccountTypeIcon(account.account_type)}
                        {getAccountTypeLabel(account.account_type)}
                      </div>
                    </TableCell>
                    <TableCell>{account.currency}</TableCell>
                    <TableCell className="text-right font-mono">
                      {account.balance.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.active ? "default" : "secondary"}>
                        {account.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    {/* HIGH-1: canEdit | HIGH-6: disabled during pending | MED-7: opens confirmation */}
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAccount(account);
                              setEditData({
                                bank_name: account.bank_name,
                                account_number: account.account_number,
                                account_type: account.account_type,
                                currency: account.currency,
                              });
                              setEditErrors({});
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={toggleAccountStatus.isPending}
                            onClick={() => setConfirmToggle({ id: account.id, active: !account.active, name: account.bank_name })}
                          >
                            {account.active ? "Desactivar" : "Activar"}
                          </Button>
                        </div>
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

      {/* Edit dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cuenta Bancaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              El saldo no es editable — se actualiza automáticamente con los movimientos.
            </p>
            <div>
              <Label className="text-sm font-medium">Banco <span className="text-destructive">*</span></Label>
              <Input
                value={editData.bank_name}
                onChange={(e) => { setEditData({ ...editData, bank_name: e.target.value }); if (editErrors.bank_name) setEditErrors((p) => ({ ...p, bank_name: "" })); }}
                placeholder="Nombre del banco"
                className={editErrors.bank_name ? "border-destructive" : ""}
              />
              {editErrors.bank_name && <p className="text-sm text-destructive mt-1">{editErrors.bank_name}</p>}
            </div>

            <div>
              <Label className="text-sm font-medium">Número de Cuenta <span className="text-destructive">*</span></Label>
              <Input
                value={editData.account_number}
                onChange={(e) => { setEditData({ ...editData, account_number: e.target.value }); if (editErrors.account_number) setEditErrors((p) => ({ ...p, account_number: "" })); }}
                placeholder="Número de cuenta"
                className={editErrors.account_number ? "border-destructive" : ""}
              />
              {editErrors.account_number && <p className="text-sm text-destructive mt-1">{editErrors.account_number}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Tipo de Cuenta</label>
              <Select value={editData.account_type} onValueChange={(value) => setEditData({ ...editData, account_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Cuenta Corriente</SelectItem>
                  <SelectItem value="savings">Caja de Ahorro</SelectItem>
                  <SelectItem value="credit">Tarjeta de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Moneda</label>
              <Select value={editData.currency} onValueChange={(value) => setEditData({ ...editData, currency: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                  <SelectItem value="USD">USD (Dólares)</SelectItem>
                  <SelectItem value="EUR">EUR (Euros)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => {
                try {
                  editAccountSchema.parse({ bank_name: editData.bank_name, account_number: editData.account_number });
                  setEditErrors({});
                  updateAccount.mutate({ id: editingAccount!.id, data: editData });
                } catch (error) {
                  if (error instanceof z.ZodError) {
                    const newErrors: Record<string, string> = {};
                    error.errors.forEach((err) => { if (err.path[0]) newErrors[err.path[0] as string] = err.message; });
                    setEditErrors(newErrors);
                  }
                }
              }}
              disabled={updateAccount.isPending}
              className="w-full"
            >
              {updateAccount.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MED-7: confirmation dialog for toggle */}
      <AlertDialog open={!!confirmToggle} onOpenChange={(open) => !open && setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.active ? "Activar cuenta" : "Desactivar cuenta"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.active
                ? `¿Activar la cuenta de ${confirmToggle?.name}? Quedará disponible para registrar movimientos.`
                : `¿Desactivar la cuenta de ${confirmToggle?.name}? No podrá usarse para nuevos movimientos mientras esté inactiva.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmToggle && toggleAccountStatus.mutate({ id: confirmToggle.id, active: confirmToggle.active })}
            >
              {confirmToggle?.active ? "Activar" : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
