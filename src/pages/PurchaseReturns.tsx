import { useState } from "react";
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
import { Plus, Search, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { sanitizeSearchQuery } from "@/lib/searchUtils";

interface ReturnItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  reason: string;
}

const PurchaseReturns = () => {
  const { currentCompany } = useCompany();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("purchases", "create");
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  
  const [supplierId, setSupplierId] = useState("");
  const [purchaseId, setPurchaseId] = useState("");
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [currentProduct, setCurrentProduct] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [currentReason, setCurrentReason] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch purchase returns
  const { data: returns, isLoading } = useQuery({
    queryKey: ["purchase-returns", searchQuery, currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = (supabase as any)
        .from("purchase_returns")
        .select(`
          *,
          suppliers(name),
          purchases(purchase_number),
          purchase_return_items(
            *,
            products(name, sku)
          )
        `)
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        const sanitized = sanitizeSearchQuery(searchQuery);
        if (sanitized) query = query.ilike("return_number", `%${sanitized}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch suppliers
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch purchases by supplier
  const { data: purchases } = useQuery({
    queryKey: ["purchases-by-supplier", supplierId, currentCompany?.id],
    queryFn: async () => {
      if (!supplierId || !currentCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("purchases")
        .select(`
          *,
          purchase_items(
            *,
            products(id, name, sku)
          )
        `)
        .eq("company_id", currentCompany.id)
        .eq("supplier_id", supplierId)
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!supplierId && !!currentCompany?.id,
  });

  // Get products from selected purchase
  const selectedPurchaseProducts = purchases?.find(p => p.id === purchaseId)?.purchase_items || [];

  const createReturnMutation = useMutation({
    mutationFn: async (returnData: any) => {
      if (!currentCompany?.id) throw new Error("No company selected");

      // Calculate total
      const total = returnData.items.reduce((sum: number, item: ReturnItem) => 
        sum + (item.quantity * item.unit_cost), 0
      );

      const { data: returnRecord, error: returnError } = await (supabase as any)
        .from("purchase_returns")
        .insert({
          company_id: currentCompany.id,
          supplier_id: returnData.supplier_id,
          purchase_id: returnData.purchase_id,
          return_number: `PR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          total_amount: total,
          status: "pending",
          notes: returnData.notes,
        })
        .select()
        .single();

      if (returnError) throw returnError;

      const itemsToInsert = returnData.items.map((item: ReturnItem) => ({
        purchase_return_id: (returnRecord as any).id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        reason: item.reason,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("purchase_return_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Atomic stock decrement via RPC (no race conditions, single query)
      const adjustments: Record<string, number> = {};
      returnData.items.forEach((item: ReturnItem) => {
        adjustments[item.product_id] = (adjustments[item.product_id] || 0) - item.quantity;
      });
      const { error: stockError } = await supabase.rpc('batch_update_product_stock', { adjustments });
      if (stockError) throw stockError;

      // MED-4: Update supplier balance — return reduces debt (fresh fetch to avoid race)
      const { data: freshSupplier, error: fetchSupplierError } = await supabase
        .from("suppliers")
        .select("current_balance")
        .eq("id", returnData.supplier_id)
        .eq("company_id", currentCompany.id)
        .single();
      if (fetchSupplierError) throw fetchSupplierError;
      const { error: balanceError } = await supabase
        .from("suppliers")
        .update({ current_balance: (freshSupplier?.current_balance || 0) - total })
        .eq("id", returnData.supplier_id)
        .eq("company_id", currentCompany.id);
      if (balanceError) throw balanceError;

      return returnRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-stats"] });
      toast.success("Devolución creada exitosamente");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear devolución");
    },
  });

  const deleteReturnMutation = useMutation({
    mutationFn: async (returnId: string) => {
      if (!currentCompany?.id) throw new Error("No company selected");

      // CRIT-1: Fetch return + items from DB to reverse stock and supplier balance
      const { data: returnRecord, error: fetchError } = await (supabase as any)
        .from("purchase_returns")
        .select("supplier_id, total_amount, purchase_return_items(product_id, quantity)")
        .eq("id", returnId)
        .eq("company_id", currentCompany.id)
        .single();
      if (fetchError) throw fetchError;

      // Re-increment stock for all returned items
      const adjustments: Record<string, number> = {};
      returnRecord.purchase_return_items.forEach((item: any) => {
        adjustments[item.product_id] = (adjustments[item.product_id] || 0) + item.quantity;
      });
      if (Object.keys(adjustments).length > 0) {
        const { error: stockError } = await supabase.rpc('batch_update_product_stock', { adjustments });
        if (stockError) throw stockError;
      }

      // Re-increment supplier balance (fresh fetch to avoid race)
      const { data: freshSupplier, error: fetchSupplierError } = await supabase
        .from("suppliers")
        .select("current_balance")
        .eq("id", returnRecord.supplier_id)
        .eq("company_id", currentCompany.id)
        .single();
      if (fetchSupplierError) throw fetchSupplierError;
      const { error: balanceError } = await supabase
        .from("suppliers")
        .update({ current_balance: (freshSupplier?.current_balance || 0) + returnRecord.total_amount })
        .eq("id", returnRecord.supplier_id)
        .eq("company_id", currentCompany.id);
      if (balanceError) throw balanceError;

      // Delete the return (cascade deletes purchase_return_items)
      const { error } = await (supabase as any)
        .from("purchase_returns")
        .delete()
        .eq("id", returnId)
        .eq("company_id", currentCompany.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-stats"] });
      toast.success("Devolución eliminada");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar devolución");
    },
  });

  const addItemToReturn = () => {
    if (!currentProduct || currentQuantity <= 0 || !currentReason) {
      toast.error("Complete todos los campos del producto");
      return;
    }

    const product = selectedPurchaseProducts.find((p: any) => p.product_id === currentProduct);
    if (!product) return;

    // MED-5: Account for quantities already queued in returnItems for this product
    const alreadyQueued = returnItems
      .filter(i => i.product_id === currentProduct)
      .reduce((sum, i) => sum + i.quantity, 0);
    const remaining = product.quantity - alreadyQueued;
    if (currentQuantity > remaining) {
      toast.error(`Solo puedes devolver ${remaining} unidades más de este producto`);
      return;
    }

    const newItem: ReturnItem = {
      product_id: currentProduct,
      product_name: product.products?.name || "",
      quantity: currentQuantity,
      unit_cost: product.unit_cost || 0,
      reason: currentReason,
    };

    setReturnItems([...returnItems, newItem]);
    setCurrentProduct("");
    setCurrentQuantity(1);
    setCurrentReason("");
  };

  const removeItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return returnItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  };

  const handleCreateReturn = () => {
    if (!supplierId || !purchaseId || returnItems.length === 0) {
      toast.error("Complete todos los campos requeridos");
      return;
    }

    createReturnMutation.mutate({
      supplier_id: supplierId,
      purchase_id: purchaseId,
      items: returnItems,
      notes,
    });
  };

  const resetForm = () => {
    setSupplierId("");
    setPurchaseId("");
    setReturnItems([]);
    setCurrentProduct("");
    setCurrentQuantity(1);
    setCurrentReason("");
    setNotes("");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any }> = {
      pending:  { label: "Pendiente",  variant: "default" },
      approved: { label: "Aprobada",   variant: "secondary" },
      rejected: { label: "Rechazada",  variant: "destructive" },
    };
    const { label, variant } = config[status] || { label: status, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Devoluciones a Proveedores</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Gestiona las devoluciones de productos a proveedores</p>
          </div>
          {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto" data-tutorial="refund-status">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Devolución
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Devolución a Proveedor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Proveedor *</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
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
                  <div className="space-y-2">
                    <Label>Compra Original *</Label>
                    <Select value={purchaseId} onValueChange={setPurchaseId} disabled={!supplierId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar compra" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchases?.map((purchase) => (
                          <SelectItem key={purchase.id} value={purchase.id}>
                            {purchase.purchase_number} - {format(new Date(purchase.purchase_date), "dd/MM/yyyy")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {purchaseId && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Productos a Devolver</h3>
                    <div className="grid grid-cols-12 gap-2 mb-3">
                      <div className="col-span-4">
                        <Select value={currentProduct} onValueChange={setCurrentProduct}>
                          <SelectTrigger>
                            <SelectValue placeholder="Producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedPurchaseProducts.map((item: any) => (
                              <SelectItem key={item.product_id} value={item.product_id}>
                                {item.products?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Cantidad"
                          value={currentQuantity}
                          onChange={(e) => setCurrentQuantity(Number(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          placeholder="Motivo"
                          value={currentReason}
                          onChange={(e) => setCurrentReason(e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Button type="button" onClick={addItemToReturn} className="w-full">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {returnItems.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Costo Unit.</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead>Subtotal</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {returnItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>${item.unit_cost.toFixed(2)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{item.reason}</TableCell>
                              <TableCell>${(item.quantity * item.unit_cost).toFixed(2)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell colSpan={4} className="text-right font-bold">
                              Total:
                            </TableCell>
                            <TableCell className="font-bold">
                              ${calculateTotal().toFixed(2)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales sobre la devolución..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateReturn} disabled={createReturnMutation.isPending}>
                    {createReturnMutation.isPending ? "Creando..." : "Crear Devolución"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle>Listado de Devoluciones</CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-full sm:w-[300px]"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">Cargando...</div>
            ) : returns && returns.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Compra Original</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((returnItem: any) => (
                    <TableRow key={returnItem.id}>
                      <TableCell className="font-medium">{returnItem.return_number}</TableCell>
                      <TableCell>{returnItem.suppliers?.name}</TableCell>
                      <TableCell>{returnItem.purchases?.purchase_number}</TableCell>
                      <TableCell>{format(new Date(returnItem.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell>${returnItem.total_amount?.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(returnItem.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReturn(returnItem)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canCreate && returnItem.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteReturnMutation.mutate(returnItem.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                No hay devoluciones registradas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Return detail dialog — MED-3 */}
      <Dialog open={selectedReturn !== null} onOpenChange={(open) => { if (!open) setSelectedReturn(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Devolución {selectedReturn?.return_number}</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{selectedReturn.suppliers?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Compra Original</p>
                  <p className="font-medium">{selectedReturn.purchases?.purchase_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">{format(new Date(selectedReturn.created_at), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <div className="mt-1">{getStatusBadge(selectedReturn.status)}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Productos Devueltos</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Costo Unit.</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReturn.purchase_return_items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.products?.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${item.unit_cost?.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.reason}</TableCell>
                        <TableCell>${(item.quantity * item.unit_cost).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between font-bold text-lg p-3 bg-muted rounded-lg">
                <span>Total Devuelto:</span>
                <span className="text-green-600 dark:text-green-400">${selectedReturn.total_amount?.toFixed(2)}</span>
              </div>

              {selectedReturn.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm mt-1">{selectedReturn.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default PurchaseReturns;
