import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  DollarSign,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle2,
  Info,
  Wallet,
  CreditCard,
  Banknote,
  BarChart3,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompany } from "@/contexts/CompanyContext";
import { z } from "zod";

// B-3: Strong literal types for enum-like fields
type ExpenseStatus = "pending" | "approved" | "rejected";
type PaymentMethod = "cash" | "card" | "transfer" | "check";

// A-2: Expanded schema — validates all user-submitted fields, not just 2
const expenseSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "La descripción es requerida")
    .max(500, "La descripción debe tener máximo 500 caracteres"),
  amount: z
    .number({ invalid_type_error: "El monto debe ser un número" })
    .positive("El monto debe ser mayor a 0")
    .max(9999999999.99, "El monto es demasiado alto"),
  status: z.enum(["pending", "approved", "rejected"], {
    invalid_type_error: "Estado inválido",
  }),
  payment_method: z.enum(["cash", "card", "transfer", "check"], {
    invalid_type_error: "Método de pago inválido",
  }),
  expense_date: z
    .string()
    .min(1, "La fecha es requerida")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  notes: z
    .string()
    .max(2000, "Las notas no pueden superar los 2000 caracteres")
    .optional(),
});

// M-3: Payment method label map for table display
const paymentMethodLabels: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  check: "Cheque",
};

const PAGE_SIZE = 50;

export default function Expenses() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();

  // M-2: Currency from company config
  const currency = currentCompany?.currency || "$";

  const [currentPage, setCurrentPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<{
    category_id: string;
    description: string;
    amount: string;
    expense_date: string;
    payment_method: PaymentMethod;
    reference_number: string;
    supplier_id: string;
    notes: string;
    status: ExpenseStatus;
  }>({
    category_id: "",
    description: "",
    amount: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "cash",
    reference_number: "",
    supplier_id: "",
    notes: "",
    status: "pending",
  });

  const queryClient = useQueryClient();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const canView = hasPermission("expenses", "view");
  const canCreate = hasPermission("expenses", "create");
  // M-5: Removed canEdit and canDelete — unused until actions are implemented

  // C-1: Filter categories by company_id — prevents cross-company data leak
  const { data: categories } = useQuery({
    queryKey: ["expense-categories", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("company_id", currentCompany!.id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: canView && !!currentCompany?.id,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("company_id", currentCompany?.id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: canView && !!currentCompany?.id,
  });

  // A-3: Expose isError for explicit error state in the table
  const {
    data: expenses,
    isLoading,
    isError: expensesError,
  } = useQuery({
    queryKey: ["expenses", currentCompany?.id, currentPage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_categories(name, color),
          suppliers(name)
        `)
        .eq("company_id", currentCompany?.id)
        .order("expense_date", { ascending: false })
        // M-4: Paginate to avoid loading all records at once
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return data;
    },
    enabled: canView && !!currentCompany?.id,
  });

  // Stats — calculated client-side from the current page data
  const totalExpenses =
    expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
  const pendingExpenses =
    expenses?.filter((exp) => exp.status === "pending").length || 0;

  // B-1: Parse date components directly to avoid timezone offset on midnight UTC dates
  const monthExpenses =
    expenses
      ?.filter((exp) => {
        const [year, month] = exp.expense_date.split("-").map(Number);
        const now = new Date();
        return month - 1 === now.getMonth() && year === now.getFullYear();
      })
      .reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

  const resetForm = () => {
    setFormData({
      category_id: "",
      description: "",
      amount: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "cash",
      reference_number: "",
      supplier_id: "",
      notes: "",
      status: "pending",
    });
    setFormErrors({});
  };

  const createExpenseMutation = useMutation({
    mutationFn: async (values: typeof formData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      // A-1: Guard against null company — prevents orphaned records
      if (!currentCompany) throw new Error("No hay empresa seleccionada");

      const { data: expenseNumber, error: fnError } = await supabase.rpc(
        "generate_expense_number"
      );
      if (fnError) throw fnError;

      const { error } = await supabase.from("expenses").insert({
        ...values,
        expense_number: expenseNumber,
        amount: parseFloat(values.amount),
        user_id: user.id,
        category_id: values.category_id || null,
        supplier_id: values.supplier_id || null,
        // A-1: Non-optional company_id — safe because of guard above
        company_id: currentCompany.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Gasto registrado correctamente");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al registrar gasto: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // A-2: Validate all relevant fields, not just description and amount
      expenseSchema.parse({
        description: formData.description,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        status: formData.status,
        payment_method: formData.payment_method,
        expense_date: formData.expense_date,
        notes: formData.notes || undefined,
      });
      setFormErrors({});
      createExpenseMutation.mutate(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(newErrors);
      } else {
        toast.error("Error al validar los datos del gasto");
      }
    }
  };

  const hasMorePages = (expenses?.length ?? 0) === PAGE_SIZE;

  if (permissionsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Cargando permisos...</p>
        </div>
      </Layout>
    );
  }

  if (!canView) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <AlertCircle className="h-16 w-16 text-warning" />
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
              Gestión de Gastos
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Control y seguimiento de gastos operativos
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => navigate("/reports")}
              className="w-full sm:w-auto"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Reportes
            </Button>
            {canCreate && (
              // M-1: onOpenChange resets form and errors on any close (Escape, outside click)
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  if (!open) resetForm();
                  setDialogOpen(open);
                }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          Nuevo Gasto
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Registrar nuevo gasto</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Registrar Nuevo Gasto
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <p className="text-xs text-muted-foreground">
                      Los campos con{" "}
                      <span className="text-destructive">*</span> son
                      obligatorios.
                    </p>

                    {/* Información básica */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Info className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold">
                          Información Básica
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="description">
                            Descripción{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                description: e.target.value,
                              });
                              if (formErrors.description)
                                setFormErrors((p) => ({
                                  ...p,
                                  description: "",
                                }));
                            }}
                            className={
                              formErrors.description ? "border-destructive" : ""
                            }
                          />
                          {formErrors.description && (
                            <p className="text-sm text-destructive mt-1">
                              {formErrors.description}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="expense_date">
                            Fecha <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="expense_date"
                            type="date"
                            value={formData.expense_date}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                expense_date: e.target.value,
                              })
                            }
                            className={
                              formErrors.expense_date ? "border-destructive" : ""
                            }
                          />
                          {formErrors.expense_date && (
                            <p className="text-sm text-destructive mt-1">
                              {formErrors.expense_date}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="amount">
                          Monto <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) => {
                            setFormData({ ...formData, amount: e.target.value });
                            if (formErrors.amount)
                              setFormErrors((p) => ({ ...p, amount: "" }));
                          }}
                          className={
                            formErrors.amount ? "border-destructive" : ""
                          }
                        />
                        {formErrors.amount && (
                          <p className="text-sm text-destructive mt-1">
                            {formErrors.amount}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Categoría y Proveedor */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <FileText className="h-4 w-4 text-green-600 dark:text-green-500" />
                        </div>
                        <h3 className="text-sm font-semibold">
                          Categoría y Proveedor
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="category">Categoría</Label>
                          <Select
                            value={formData.category_id}
                            onValueChange={(value) =>
                              setFormData({ ...formData, category_id: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="supplier">Proveedor</Label>
                          <Select
                            value={formData.supplier_id}
                            onValueChange={(value) =>
                              setFormData({ ...formData, supplier_id: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Opcional" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers?.map((sup) => (
                                <SelectItem key={sup.id} value={sup.id}>
                                  {sup.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Pago y Referencia */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                          <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                        </div>
                        <h3 className="text-sm font-semibold">
                          Pago y Referencia
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="payment_method">
                            Método de Pago{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={formData.payment_method}
                            onValueChange={(value: PaymentMethod) =>
                              setFormData({
                                ...formData,
                                payment_method: value,
                              })
                            }
                          >
                            <SelectTrigger
                              className={
                                formErrors.payment_method
                                  ? "border-destructive"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Selecciona método" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Efectivo</SelectItem>
                              <SelectItem value="card">Tarjeta</SelectItem>
                              <SelectItem value="transfer">
                                Transferencia
                              </SelectItem>
                              <SelectItem value="check">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                          {formErrors.payment_method && (
                            <p className="text-sm text-destructive mt-1">
                              {formErrors.payment_method}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="reference_number">Nº Referencia</Label>
                          <Input
                            id="reference_number"
                            value={formData.reference_number}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                reference_number: e.target.value,
                              })
                            }
                            placeholder="Opcional"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                        </div>
                        <h3 className="text-sm font-semibold">Notas</h3>
                      </div>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        rows={3}
                        placeholder="Notas internas..."
                        className={formErrors.notes ? "border-destructive" : ""}
                      />
                      {formErrors.notes && (
                        <p className="text-sm text-destructive mt-1">
                          {formErrors.notes}
                        </p>
                      )}
                    </div>

                    {/* Resumen */}
                    <div className="bg-muted/30 border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">Resumen</h3>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Monto:</span>
                        {/* M-2: Company currency */}
                        <span className="text-red-600 dark:text-red-400">
                          {currency} {Number(formData.amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createExpenseMutation.isPending}
                        className="gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {createExpenseMutation.isPending
                          ? "Guardando..."
                          : "Guardar Gasto"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Gastos
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* M-2: Company currency */}
              <div className="text-2xl font-bold">
                {currency} {totalExpenses.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Acumulado total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Gastos del Mes
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currency} {monthExpenses.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Mes actual</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingExpenses}</div>
              <p className="text-xs text-muted-foreground">Por aprobar</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            {/* A-3 + B-2: Explicit loading spinner and error state */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : expensesError ? (
              <div className="flex items-center justify-center py-8 gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>
                  Error al cargar los gastos. Intente recargar la página.
                </span>
              </div>
            ) : expenses && expenses.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Gasto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Método Pago</TableHead>
                      <TableHead>Monto</TableHead>
                      {/* M-5: Removed empty "Acciones" column — no actions implemented yet */}
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {expense.expense_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(expense.expense_date), "dd/MM/yyyy", {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell>
                          {expense.expense_categories && (
                            <Badge
                              style={{
                                backgroundColor:
                                  expense.expense_categories.color,
                              }}
                              className="text-white"
                            >
                              {expense.expense_categories.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          {expense.suppliers?.name || "-"}
                        </TableCell>
                        <TableCell className="capitalize">
                          <Badge
                            className={
                              expense.payment_method === "cash"
                                ? "bg-green-500"
                                : expense.payment_method === "card"
                                ? "bg-blue-600"
                                : expense.payment_method === "transfer"
                                ? "bg-purple-600"
                                : "bg-amber-600"
                            }
                          >
                            {/* M-3: Spanish label instead of raw English value */}
                            {paymentMethodLabels[expense.payment_method] ??
                              expense.payment_method}
                          </Badge>
                        </TableCell>
                        {/* M-2: Company currency */}
                        <TableCell className="font-bold text-red-600 dark:text-red-400">
                          {currency} {Number(expense.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              expense.status === "approved"
                                ? "bg-green-600"
                                : expense.status === "rejected"
                                ? "bg-red-600"
                                : "bg-yellow-500"
                            }
                          >
                            {expense.status === "approved"
                              ? "Aprobado"
                              : expense.status === "rejected"
                              ? "Rechazado"
                              : "Pendiente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* M-4: Pagination controls */}
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
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No hay gastos registrados
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
