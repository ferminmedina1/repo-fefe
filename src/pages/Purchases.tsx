import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Pencil, Trash2, ShoppingCart, Package, DollarSign, AlertCircle, CheckCircle2, Info, TrendingUp, BarChart3 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { sanitizeSearchQuery } from "@/lib/searchUtils";
import { format } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";

interface PurchaseItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

const Purchases = () => {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("purchases", "create");
  const canEdit = hasPermission("purchases", "edit");
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [isPurchaseDetailOpen, setIsPurchaseDetailOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  
  // New purchase form state
  const [supplierId, setSupplierId] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [currentProduct, setCurrentProduct] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [currentCost, setCurrentCost] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");

  // Fetch purchases
  const { data: purchases, isLoading } = useQuery({
    queryKey: ["purchases", searchQuery, currentCompany?.id],
    queryFn: async () => {
      let query = supabase
        .from("purchases")
        .select(`
          *,
          suppliers(name)
        `)
        .eq("company_id", currentCompany?.id)
        .order("purchase_date", { ascending: false });

      if (searchQuery) {
        const sanitized = sanitizeSearchQuery(searchQuery);
        if (sanitized) {
          query = query.ilike("purchase_number", `%${sanitized}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch suppliers
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("company_id", currentCompany?.id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["products", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", currentCompany?.id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch items for the selected purchase detail view
  const { data: selectedPurchaseItems, isLoading: isItemsLoading } = useQuery({
    queryKey: ["purchase-items", selectedPurchase?.id],
    queryFn: async () => {
      if (!selectedPurchase?.id || !currentCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("purchase_items")
        .select("*")
        .eq("purchase_id", selectedPurchase.id)
        .eq("company_id", currentCompany.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPurchase?.id && !!currentCompany?.id,
  });

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error("No company selected");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const subtotal = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
      const tax = subtotal * (taxRate / 100);
      const total = subtotal + tax;

      // Generate purchase number (timestamp + random suffix for low collision probability)
      const purchaseNumber = `PUR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Insert purchase
      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .insert({
          purchase_number: purchaseNumber,
          supplier_id: supplierId,
          user_id: user.id,
          subtotal,
          tax,
          tax_rate: taxRate,
          total,
          notes,
          payment_status: "pending",
          company_id: currentCompany?.id,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Insert purchase items
      const items = purchaseItems.map(item => ({
        purchase_id: purchase.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        subtotal: item.subtotal,
        company_id: currentCompany?.id
      }));

      const { error: itemsError } = await supabase
        .from("purchase_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // Atomic stock increment via RPC (no race conditions, single query)
      const adjustments: Record<string, number> = {};
      purchaseItems.forEach(item => {
        adjustments[item.product_id] = (adjustments[item.product_id] || 0) + item.quantity;
      });
      const { error: stockError } = await supabase.rpc('batch_update_product_stock', { adjustments });
      if (stockError) throw stockError;

      // Update supplier balance — fresh fetch to avoid read-modify-write race (HIGH-1)
      const { data: freshSupplier, error: fetchSupplierError } = await supabase
        .from("suppliers")
        .select("current_balance")
        .eq("id", supplierId)
        .eq("company_id", currentCompany?.id)
        .single();
      if (fetchSupplierError) throw fetchSupplierError;
      const { error: balanceError } = await supabase
        .from("suppliers")
        .update({ current_balance: (freshSupplier?.current_balance || 0) + total })
        .eq("id", supplierId)
        .eq("company_id", currentCompany?.id);
      if (balanceError) throw balanceError;

      return purchase;
    },
    onSuccess: () => {
      toast.success("Compra registrada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-stats"] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Error al registrar la compra");
      console.error(error);
    },
  });

  // Update purchase mutation (payment_status + notes only — items/totals not editable to preserve stock integrity)
  const updatePurchaseMutation = useMutation({
    mutationFn: async (data: { id: string; payment_status: string; notes: string }) => {
      if (!currentCompany?.id) throw new Error("No company selected");
      const { error } = await supabase
        .from("purchases")
        .update({ payment_status: data.payment_status, notes: data.notes })
        .eq("id", data.id)
        .eq("company_id", currentCompany.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Compra actualizada exitosamente");
      setIsEditDialogOpen(false);
      setEditingPurchase(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar la compra");
    },
  });

  const openEditDialog = (purchase: any) => {
    setEditingPurchase(purchase);
    setEditPaymentStatus(purchase.payment_status);
    setEditNotes(purchase.notes || "");
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setSupplierId("");
    setPurchaseItems([]);
    setCurrentProduct("");
    setCurrentQuantity(1);
    setCurrentCost(0);
    setTaxRate(0);
    setNotes("");
  };

  const addItem = () => {
    if (!currentProduct) {
      toast.error("Selecciona un producto");
      return;
    }
    if (currentQuantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }
    if (currentCost < 0) {
      toast.error("El costo no puede ser negativo");
      return;
    }

    const product = products?.find(p => p.id === currentProduct);
    if (!product) return;

    const subtotal = currentQuantity * currentCost;
    const newItem: PurchaseItem = {
      product_id: product.id,
      product_name: product.name,
      quantity: currentQuantity,
      unit_cost: currentCost,
      subtotal,
    };

    setPurchaseItems([...purchaseItems, newItem]);
    setCurrentProduct("");
    setCurrentQuantity(1);
    setCurrentCost(0);
  };

  const removeItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const subtotal = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * (taxRate / 100);
    return { subtotal, tax, total: subtotal + tax };
  };

  const { subtotal, tax, total } = calculateTotal();

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; className: string }> = {
      pending: { 
        label: "Pendiente", 
        variant: "secondary",
        icon: AlertCircle,
        className: "gap-1"
      },
      partial: { 
        label: "Parcial", 
        variant: "outline",
        icon: TrendingUp,
        className: "gap-1 border-amber-500 text-amber-700 dark:text-amber-400"
      },
      paid: { 
        label: "Pagado", 
        variant: "default",
        icon: CheckCircle2,
        className: "gap-1 bg-green-500 hover:bg-green-600"
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Gestión de Compras</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Administra las compras a proveedores</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/reports?tab=purchases")} className="w-full sm:w-auto">
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver Reportes
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Compras</span>
              {canCreate && <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          Nueva Compra
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Registrar nueva compra</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                      Nueva Compra
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Sección Proveedor */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Info className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold">Proveedor</h3>
                      </div>
                      <div>
                        <Label>Proveedor *</Label>
                      <Select value={supplierId} onValueChange={setSupplierId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers?.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      </div>
                    </div>

                    {/* Sección Productos */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <Package className="h-4 w-4 text-green-600 dark:text-green-500" />
                        </div>
                        <h3 className="text-sm font-semibold">Agregar Productos</h3>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label>Producto</Label>
                          <Select value={currentProduct} onValueChange={setCurrentProduct}>
                            <SelectTrigger>
                              <SelectValue placeholder="Producto" />
                            </SelectTrigger>
                            <SelectContent>
                              {products?.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            min="1"
                             placeholder="1"
                            value={currentQuantity}
                            onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <Label>Costo Unitario</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                             placeholder="0.00"
                            value={currentCost}
                            onChange={(e) => setCurrentCost(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={addItem} className="w-full gap-2">
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar
                          </Button>
                        </div>
                      </div>

                      {purchaseItems.length > 0 && (
                          <div className="border rounded-lg">
                            <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>Cantidad</TableHead>
                              <TableHead>Costo Unit.</TableHead>
                              <TableHead>Subtotal</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchaseItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.product_name}</TableCell>
                                  <TableCell className="font-medium">{item.quantity}</TableCell>
                                  <TableCell className="text-blue-600 dark:text-blue-400">${item.unit_cost.toFixed(2)}</TableCell>
                                  <TableCell className="font-semibold text-green-600 dark:text-green-400">${item.subtotal.toFixed(2)}</TableCell>
                                <TableCell>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeItem(index)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Eliminar producto</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                          </div>
                      )}
                    </div>

                      {/* Sección Impuestos y Notas */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                          </div>
                          <h3 className="text-sm font-semibold">Impuestos y Notas</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>% Impuesto</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                           placeholder="0"
                          value={taxRate}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Notas</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Notas adicionales..."
                           rows={3}
                        />
                      </div>
                        </div>
                    </div>

                      {/* Resumen de Totales */}
                      <div className="bg-muted/30 border rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold">Resumen</h3>
                        </div>
                        <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                          <span className="font-medium text-muted-foreground">${subtotal.toFixed(2)}</span>
                      </div>
                        <div className="flex justify-between text-sm">
                        <span>Impuesto ({taxRate}%):</span>
                          <span className="font-medium text-amber-600 dark:text-amber-500">${tax.toFixed(2)}</span>
                      </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Total:</span>
                          <span className="text-green-600 dark:text-green-400">${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => createPurchaseMutation.mutate()}
                      disabled={!supplierId || purchaseItems.length === 0 || createPurchaseMutation.isPending}
                        className="w-full gap-2"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                      Registrar Compra
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2" data-tutorial="purchases-filters">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número de compra..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Table data-tutorial="purchase-detail">
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado Pago</TableHead>
                  <TableHead>Registrado por</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                      <TableCell colSpan={7} className="text-center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : purchases?.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={7} className="text-center">
                      No hay compras registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases?.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                      <TableCell>{format(new Date(purchase.purchase_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{purchase.suppliers?.name || "N/A"}</TableCell>
                        <TableCell className="font-semibold text-green-600 dark:text-green-400">${purchase.total.toFixed(2)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(purchase.payment_status)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{purchase.user_id ? purchase.user_id.slice(0, 8) + "…" : "N/D"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPurchase(purchase);
                                      setIsPurchaseDetailOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver detalle</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {canEdit && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDialog(purchase);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit purchase dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditingPurchase(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Compra {editingPurchase?.purchase_number}
            </DialogTitle>
          </DialogHeader>
          {editingPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg text-sm">
                <div>
                  <p className="text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{editingPurchase.suppliers?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">${editingPurchase.total?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{format(new Date(editingPurchase.purchase_date), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">N° Compra</p>
                  <p className="font-medium font-mono text-xs">{editingPurchase.purchase_number}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estado de Pago</Label>
                <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => updatePurchaseMutation.mutate({
                    id: editingPurchase.id,
                    payment_status: editPaymentStatus,
                    notes: editNotes,
                  })}
                  disabled={updatePurchaseMutation.isPending}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {updatePurchaseMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Purchase detail dialog — MED-1 */}
      <Dialog open={isPurchaseDetailOpen} onOpenChange={(open) => { setIsPurchaseDetailOpen(open); if (!open) setSelectedPurchase(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Detalle de Compra {selectedPurchase?.purchase_number}
            </DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-muted-foreground">Proveedor</Label>
                  <p className="font-medium">{selectedPurchase.suppliers?.name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha</Label>
                  <p className="font-medium">{format(new Date(selectedPurchase.purchase_date), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado de Pago</Label>
                  <div className="mt-1">{getPaymentStatusBadge(selectedPurchase.payment_status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Registrado por</Label>
                  <p className="font-medium text-sm text-muted-foreground">
                    {selectedPurchase.user_id ? selectedPurchase.user_id.slice(0, 8) + "…" : "N/D"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Productos</h3>
                {isItemsLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando productos...</p>
                ) : selectedPurchaseItems && selectedPurchaseItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Costo Unit.</TableHead>
                        <TableHead>Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPurchaseItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.unit_cost?.toFixed(2)}</TableCell>
                          <TableCell>${item.subtotal?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin productos registrados</p>
                )}
              </div>

              <div className="bg-muted/30 border rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">${selectedPurchase.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Impuesto ({selectedPurchase.tax_rate}%):</span>
                  <span className="font-medium text-amber-600 dark:text-amber-500">${selectedPurchase.tax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-green-600 dark:text-green-400">${selectedPurchase.total?.toFixed(2)}</span>
                </div>
              </div>

              {selectedPurchase.notes && (
                <div>
                  <Label className="text-muted-foreground">Notas</Label>
                  <p className="text-sm mt-1">{selectedPurchase.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Purchases;
