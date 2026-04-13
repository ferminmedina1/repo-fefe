import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Plus, Search, Edit, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Info, Wallet, Building2, CreditCard as CreditCardIcon, History, DollarSign } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompany } from "@/contexts/CompanyContext";
import { sanitizeSearchQuery } from "@/lib/searchUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().trim().min(1, "El nombre del proveedor es requerido").max(200, "El nombre debe tener máximo 200 caracteres"),
  contact_name: z.string().max(200, "El contacto debe tener máximo 200 caracteres").optional(),
  email: z.string().trim().max(255, "El email debe tener máximo 255 caracteres")
    .refine((val) => val === "" || z.string().email().safeParse(val).success, "Email inválido")
    .optional(),
  phone: z.string().max(20, "El teléfono debe tener máximo 20 caracteres").optional(),
  address: z.string().max(500, "La dirección debe tener máximo 500 caracteres").optional(),
  tax_id: z.string().max(50, "El RUC/DNI debe tener máximo 50 caracteres").optional(),
  payment_terms: z.string().max(100, "Los términos de pago deben tener máximo 100 caracteres").optional(),
  credit_limit: z.number({ invalid_type_error: "El límite de crédito debe ser un número" })
    .nonnegative("El límite de crédito no puede ser negativo")
    .optional(),
});

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  credit_limit: number;
  current_balance: number;
  active: boolean;
  notes: string | null;
  created_at: string;
}

export default function Suppliers() {
  const { currentCompany } = useCompany();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('suppliers', 'create');
  const canEdit = hasPermission('suppliers', 'edit');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    tax_id: "",
    payment_terms: "",
    credit_limit: "0",
    current_balance: "0",
    active: true,
    notes: "",
  });
  const [paymentFormData, setPaymentFormData] = useState({
    amount: "",
    payment_method: "cash",
    notes: "",
  });

  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", searchQuery, currentCompany?.id],
    queryFn: async () => {
      let query = supabase
        .from("suppliers")
        .select("*")
        .eq("company_id", currentCompany?.id)
        .order("name");

      if (searchQuery) {
        const sanitized = sanitizeSearchQuery(searchQuery);
        if (sanitized) {
          query = query.or(
            `name.ilike.%${sanitized}%,contact_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`
          );
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!currentCompany?.id,
  });

  // MED-5: Separate stats query — not affected by searchQuery so totals are always global
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ["suppliers-stats", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("active, current_balance, credit_limit")
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
      return data as Pick<Supplier, "active" | "current_balance" | "credit_limit">[];
    },
    enabled: !!currentCompany?.id,
  });

  const { data: supplierPayments = [] } = useQuery({
    queryKey: ["supplier-payments", selectedSupplier?.id],
    queryFn: async () => {
      if (!selectedSupplier?.id) return [];
      
      const { data, error } = await supabase
        .from("supplier_payments")
        .select("*")
        .eq("supplier_id", selectedSupplier.id)
        .eq("company_id", currentCompany?.id)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedSupplier?.id,
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("suppliers").insert({
        name: data.name,
        contact_name: data.contact_name || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        tax_id: data.tax_id || null,
        payment_terms: data.payment_terms || null,
        credit_limit: parseFloat(data.credit_limit),
        active: data.active,
        notes: data.notes || null,
        company_id: currentCompany?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-stats"] });
      toast.success("Proveedor creado exitosamente");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al crear el proveedor: " + error.message);
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplier) throw new Error("No supplier selected");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const amount = parseFloat(paymentFormData.amount);
      
      // Insert payment
      const { error: paymentError } = await supabase
        .from("supplier_payments")
        .insert({
          supplier_id: selectedSupplier.id,
          user_id: user.id,
          amount: amount,
          payment_method: paymentFormData.payment_method,
          notes: paymentFormData.notes || null,
          company_id: currentCompany?.id,
        });

      if (paymentError) throw paymentError;

      // HIGH-3: Fresh fetch to avoid read-modify-write race + company_id for IDOR protection
      const { data: freshSupplier, error: fetchError } = await supabase
        .from("suppliers")
        .select("current_balance")
        .eq("id", selectedSupplier.id)
        .eq("company_id", currentCompany?.id)
        .single();
      if (fetchError) throw fetchError;
      const newBalance = (freshSupplier?.current_balance || 0) - amount;
      const { error: balanceError } = await supabase
        .from("suppliers")
        .update({ current_balance: newBalance })
        .eq("id", selectedSupplier.id)
        .eq("company_id", currentCompany?.id);

      if (balanceError) throw balanceError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-stats"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      toast.success("Pago registrado exitosamente");
      setPaymentDialogOpen(false);
      setPaymentFormData({ amount: "", payment_method: "cash", notes: "" });
      setSelectedSupplier(null);
    },
    onError: (error) => {
      toast.error("Error al registrar el pago: " + error.message);
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("suppliers")
        .update({
          name: data.name,
          contact_name: data.contact_name || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          tax_id: data.tax_id || null,
          payment_terms: data.payment_terms || null,
          credit_limit: parseFloat(data.credit_limit),
          current_balance: parseFloat(data.current_balance),
          active: data.active,
          notes: data.notes || null,
        })
        .eq("id", data.id)
        .eq("company_id", currentCompany?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-stats"] });
      toast.success("Proveedor actualizado exitosamente");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al actualizar el proveedor: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      tax_id: "",
      payment_terms: "",
      credit_limit: "0",
      current_balance: "0",
      active: true,
      notes: "",
    });
    setEditingSupplier(null);
    setFormErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      supplierSchema.parse({
        name: formData.name,
        contact_name: formData.contact_name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        tax_id: formData.tax_id || undefined,
        payment_terms: formData.payment_terms || undefined,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : undefined,
      });
      setFormErrors({});
      if (editingSupplier) {
        updateSupplierMutation.mutate({ ...formData, id: editingSupplier.id });
      } else {
        createSupplierMutation.mutate(formData);
      }
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
        toast.error("Error al validar los datos del proveedor");
      }
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_name: supplier.contact_name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      tax_id: supplier.tax_id || "",
      payment_terms: supplier.payment_terms || "",
      credit_limit: supplier.credit_limit.toString(),
      current_balance: supplier.current_balance.toString(),
      active: supplier.active,
      notes: supplier.notes || "",
    });
    setDialogOpen(true);
  };

  const getBalanceStatus = (balance: number, creditLimit: number) => {
    if (balance === 0) return { color: "bg-green-500", text: "Al día" };
    if (balance > creditLimit) return { color: "bg-red-500", text: "Excedido" };
    if (balance > creditLimit * 0.8) return { color: "bg-yellow-500", text: "Alto" };
    return { color: "bg-blue-500", text: "Normal" };
  };

  const handlePayment = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setPaymentDialogOpen(true);
  };

  const handleHistory = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setHistoryDialogOpen(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPaymentMutation.mutate();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">Proveedores</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Gestión de proveedores y crédito</p>
          </div>
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button onClick={resetForm} className="gap-2 w-full sm:w-auto" data-tutorial="btn-add-supplier">
                        <Plus className="h-4 w-4" />
                        Nuevo Proveedor
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Crear proveedor</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <p className="text-xs text-muted-foreground">Los campos con <span className="text-destructive">*</span> son obligatorios.</p>
                {/* Sección Identidad */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Info className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold">Identidad</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Proveedor <span className="text-destructive">*</span></Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (formErrors.name) setFormErrors((p) => ({ ...p, name: "" })); }}
                      className={formErrors.name ? "border-destructive" : ""}
                    />
                    {formErrors.name && <p className="text-sm text-destructive mt-1">{formErrors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Persona de Contacto</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_name: e.target.value })
                      }
                    />
                  </div>
                  </div>
                </div>

                {/* Sección Contacto */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Wallet className="h-4 w-4 text-green-600 dark:text-green-500" />
                    </div>
                    <h3 className="text-sm font-semibold">Contacto</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (formErrors.email) setFormErrors((p) => ({ ...p, email: "" })); }}
                      className={formErrors.email ? "border-destructive" : ""}
                    />
                    {formErrors.email && <p className="text-sm text-destructive mt-1">{formErrors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                {/* Sección Fiscal y Pago */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold">Fiscal y Condiciones</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">RUC/DNI</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2" data-tutorial="supplier-terms">
                    <Label htmlFor="payment_terms">Términos de Pago</Label>
                    <Input
                      id="payment_terms"
                      placeholder="Ej: 30 días"
                      value={formData.payment_terms}
                      onChange={(e) =>
                        setFormData({ ...formData, payment_terms: e.target.value })
                      }
                    />
                  </div>
                  </div>
                </div>

                {/* Sección Crédito */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <CreditCardIcon className="h-4 w-4 text-purple-600 dark:text-purple-500" />
                    </div>
                    <h3 className="text-sm font-semibold">Crédito</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="credit_limit">Límite de Crédito</Label>
                      <Input
                        id="credit_limit"
                        type="number"
                        step="0.01"
                        value={formData.credit_limit}
                        onChange={(e) => { setFormData({ ...formData, credit_limit: e.target.value }); if (formErrors.credit_limit) setFormErrors((p) => ({ ...p, credit_limit: "" })); }}
                        className={formErrors.credit_limit ? "border-destructive" : ""}
                      />
                      {formErrors.credit_limit && <p className="text-sm text-destructive mt-1">{formErrors.credit_limit}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Badge variant="outline" className="bg-muted font-medium">
                        {parseFloat(formData.credit_limit || '0') > 0 ? 'Con crédito' : 'Sin crédito'}
                      </Badge>
                    </div>
                  </div>
                  {editingSupplier && (
                    <div className="space-y-2">
                      <Label htmlFor="current_balance">Saldo Actual (ajuste manual)</Label>
                      <Input
                        id="current_balance"
                        type="number"
                        step="0.01"
                        value={formData.current_balance}
                        onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                      />
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠ Modificar este valor sobreescribe el saldo directamente. Usalo solo para correcciones manuales.
                      </p>
                    </div>
                  )}
                </div>

                {/* Sección Extra */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Info className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    </div>
                    <h3 className="text-sm font-semibold">Notas</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                  />
                  <Label htmlFor="active">Proveedor Activo</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="gap-2" disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}>
                    {editingSupplier ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Actualizar
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Crear Proveedor
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allSuppliers.length}</div>
              <p className="text-xs text-muted-foreground">
                {allSuppliers.filter((s) => s.active).length} activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold break-all leading-tight">

                ${allSuppliers.reduce((sum, s) => sum + s.current_balance, 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Balance pendiente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Crédito Disponible</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold break-all leading-tight">
                $
                {allSuppliers
                  .reduce(
                    (sum, s) => sum + Math.max(0, s.credit_limit - s.current_balance),
                    0
                  )
                  .toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Límite restante</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Proveedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar proveedores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Crédito</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => {
                    const balanceStatus = getBalanceStatus(
                      supplier.current_balance,
                      supplier.credit_limit
                    );
                    return (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.contact_name || "-"}</TableCell>
                        <TableCell>{supplier.email || "-"}</TableCell>
                        <TableCell>{supplier.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              ${supplier.current_balance.toFixed(2)}
                            </span>
                            <Badge className={balanceStatus.color}>
                              {balanceStatus.text}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>${supplier.credit_limit.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={supplier.active ? "default" : "secondary"}>
                            {supplier.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleHistory(supplier)}
                                    title="Ver historial de pagos"
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Historial</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handlePayment(supplier); }}
                                    title="Registrar pago"
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Registrar pago</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {canEdit && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEdit(supplier)}
                                      title="Editar proveedor"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {suppliers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No se encontraron proveedores
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pago a Proveedor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Input value={selectedSupplier?.name || ""} disabled />
              </div>

              <div className="space-y-2">
                <Label>Balance Actual</Label>
                <Input 
                  value={`$${selectedSupplier?.current_balance.toFixed(2) || "0.00"}`} 
                  disabled 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_amount">Monto del Pago *</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedSupplier?.current_balance || 0}
                  value={paymentFormData.amount}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, amount: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_payment_method">Método de Pago *</Label>
                <Select
                  value={paymentFormData.payment_method}
                  onValueChange={(value) =>
                    setPaymentFormData({ ...paymentFormData, payment_method: value })
                  }
                >
                  <SelectTrigger id="payment_payment_method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_notes">Notas</Label>
                <Textarea
                  id="payment_notes"
                  value={paymentFormData.notes}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, notes: e.target.value })
                  }
                  placeholder="Notas adicionales sobre el pago..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setPaymentFormData({ amount: "", payment_method: "cash", notes: "" });
                    setSelectedSupplier(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createPaymentMutation.isPending}>
                  {createPaymentMutation.isPending ? "Registrando..." : "Registrar Pago"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Payment History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historial de Pagos - {selectedSupplier?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Balance Actual</p>
                  <p className="text-2xl font-bold">
                    ${selectedSupplier?.current_balance.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pagado</p>
                  <p className="text-2xl font-bold">
                    ${supplierPayments.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No hay pagos registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      supplierPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="capitalize">
                            {payment.payment_method === "cash" && "Efectivo"}
                            {payment.payment_method === "transfer" && "Transferencia"}
                            {payment.payment_method === "check" && "Cheque"}
                            {payment.payment_method === "card" && "Tarjeta"}
                          </TableCell>
                          <TableCell className="font-medium">
                            ${Number(payment.amount).toFixed(2)}
                          </TableCell>
                          <TableCell>{payment.notes || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
