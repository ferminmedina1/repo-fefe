import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeftRight, Plus, Check, X, Package } from "lucide-react";
import { format } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface TransferItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

interface TransferLine {
  id: string; // Temporary ID for UI
  from_warehouse_id: string;
  to_warehouse_id: string;
  items: TransferItem[];
}

interface Transfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: string;
  notes: string;
  transfer_date: string;
  requested_by: string;
  from_warehouse: { name: string; code: string };
  to_warehouse: { name: string; code: string };
}

export default function WarehouseTransfers() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [notes, setNotes] = useState("");
  
  // State for adding new line
  const [fromWarehouse, setFromWarehouse] = useState<string>("");
  const [toWarehouse, setToWarehouse] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, code")
        .eq("company_id", currentCompany?.id)
        .eq("active", true);
      if (error) throw error;
      return data as Warehouse[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-for-transfer", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("company_id", currentCompany?.id)
        .eq("active", true);
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: transfers, isLoading } = useQuery({
    queryKey: ["warehouse-transfers", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_transfers")
        .select(`
          *,
          from_warehouse:warehouses!warehouse_transfers_from_warehouse_id_fkey(name, code),
          to_warehouse:warehouses!warehouse_transfers_to_warehouse_id_fkey(name, code)
        `)
        .eq("company_id", currentCompany?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Transfer[];
    },
  });

  const createTransfer = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error("Empresa no seleccionada");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autorizado");

      const transferNumber = await generateTransferNumber();
      
      // Create a transfer record for each line
      const transfersToCreate = lines.map(line => ({
        transfer_number: transferNumber,
        from_warehouse_id: line.from_warehouse_id,
        to_warehouse_id: line.to_warehouse_id,
        status: "pending",
        requested_by: user.id,
        notes,
        company_id: currentCompany.id,
      }));

      const { data: createdTransfers, error: transferError } = await supabase
        .from("warehouse_transfers")
        .insert(transfersToCreate)
        .select();

      if (transferError) throw transferError;

      // Add items for each transfer line
      const allItems: any[] = [];
      createdTransfers.forEach((transfer, index) => {
        const lineItems = lines[index].items.map(item => ({
          transfer_id: transfer.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          company_id: currentCompany.id
        }));
        allItems.push(...lineItems);
      });

      if (allItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("warehouse_transfer_items")
          .insert(allItems);

        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-transfers"] });
      toast.success("Transferencia creada exitosamente");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateTransferStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!currentCompany?.id) throw new Error("Empresa no seleccionada");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autorizado");

      const updates: any = { status };
      if (status === "approved") {
        updates.approved_by = user.id;
      } else if (status === "received") {
        updates.received_by = user.id;
      }

      const { error } = await supabase
        .from("warehouse_transfers")
        .update(updates)
        .eq("company_id", currentCompany.id)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-transfers"] });
      toast.success("Estado actualizado");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const generateTransferNumber = async () => {
    const { data, error } = await supabase.rpc("generate_transfer_number");
    if (error) throw error;
    return data;
  };

  const resetForm = () => {
    setFromWarehouse("");
    setToWarehouse("");
    setNotes("");
    setLines([]);
    setSelectedProduct("");
    setQuantity(1);
  };

  const addItem = (lineId: string) => {
    if (!selectedProduct || quantity <= 0) {
      toast.error("Seleccione un producto y cantidad válida");
      return;
    }

    const product = products?.find((p) => p.id === selectedProduct);
    if (!product) return;

    setLines(lines.map(line => {
      if (line.id !== lineId) return line;

      const existingItem = line.items.find((i) => i.product_id === selectedProduct);
      if (existingItem) {
        return {
          ...line,
          items: line.items.map((i) =>
            i.product_id === selectedProduct
              ? { ...i, quantity: i.quantity + quantity }
              : i
          )
        };
      } else {
        return {
          ...line,
          items: [
            ...line.items,
            {
              product_id: product.id,
              product_name: product.name,
              quantity,
            },
          ]
        };
      }
    }));

    setSelectedProduct("");
    setQuantity(1);
  };

  const removeItem = (lineId: string, productId: string) => {
    setLines(lines.map(line => {
      if (line.id !== lineId) return line;
      return {
        ...line,
        items: line.items.filter((i) => i.product_id !== productId)
      };
    }));
  };

  const addNewLine = () => {
    if (!fromWarehouse || !toWarehouse) {
      toast.error("Seleccione depósito origen y destino");
      return;
    }

    if (fromWarehouse === toWarehouse) {
      toast.error("El depósito origen y destino no pueden ser el mismo");
      return;
    }

    setLines([
      ...lines,
      {
        id: crypto.randomUUID(),
        from_warehouse_id: fromWarehouse,
        to_warehouse_id: toWarehouse,
        items: [],
      }
    ]);

    setFromWarehouse("");
    setToWarehouse("");
  };

  const removeLine = (lineId: string) => {
    setLines(lines.filter(line => line.id !== lineId));
  };

  const handleSubmit = () => {
    if (!currentCompany?.id) {
      toast.error("Empresa no seleccionada");
      return;
    }

    if (lines.length === 0) {
      toast.error("Agregue al menos una línea de transferencia");
      return;
    }

    const allItemsCount = lines.reduce((sum, line) => sum + line.items.length, 0);
    if (allItemsCount === 0) {
      toast.error("Agregue al menos un producto en alguna línea");
      return;
    }

    validateAndCreateTransfer();
  };

  const validateAndCreateTransfer = async () => {
    try {
      const companyId = currentCompany?.id;
      if (!companyId) throw new Error("Empresa no seleccionada");

      // Validate stock for all lines
      for (const line of lines) {
        const { data: warehouseStock, error: stockError } = await supabase
          .from("warehouse_stock")
          .select("product_id, stock")
          .eq("company_id", companyId)
          .eq("warehouse_id", line.from_warehouse_id);

        if (stockError) throw stockError;

        const stockMap = new Map((warehouseStock || []).map(s => [s.product_id, s.stock]));
        
        for (const item of line.items) {
          const availableStock = stockMap.get(item.product_id) || 0;
          if (availableStock < item.quantity) {
            toast.error(
              `Stock insuficiente para ${item.product_name} en destino. ` +
              `Disponible: ${availableStock}, Solicitado: ${item.quantity}`
            );
            return;
          }
        }
      }

      createTransfer.mutate();
    } catch (error: any) {
      toast.error("Error validando stock: " + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>;
      case "approved":
        return <Badge variant="default">Aprobada</Badge>;
      case "received":
        return <Badge className="bg-green-600">Recibida</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <ArrowLeftRight className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Transferencias entre Depósitos</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="hover:scale-105 transition-transform">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Transferencia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl animate-scale-in max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nueva Transferencia (Múltiples Depósitos)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones sobre la transferencia..."
                    rows={3}
                  />
                </div>

                {/* Líneas de transferencia */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <Label className="text-lg">Líneas de Transferencia</Label>
                    <Badge variant="secondary">{lines.length} línea{lines.length !== 1 ? 's' : ''}</Badge>
                  </div>

                  <div className="space-y-4 mb-4">
                    {lines.map((line, lineIndex) => {
                      const fromWarehouseName = warehouses?.find(w => w.id === line.from_warehouse_id)?.name;
                      const toWarehouseName = warehouses?.find(w => w.id === line.to_warehouse_id)?.name;
                      const fromWarehouseCode = warehouses?.find(w => w.id === line.from_warehouse_id)?.code;
                      const toWarehouseCode = warehouses?.find(w => w.id === line.to_warehouse_id)?.code;

                      return (
                        <Card key={line.id} className="p-4 bg-muted/30 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 flex-1">
                              <Badge variant="outline">{lineIndex + 1}</Badge>
                              <div className="text-sm">
                                <span className="font-semibold">{fromWarehouseCode} - {fromWarehouseName}</span>
                                <ArrowLeftRight className="h-4 w-4 inline mx-2 text-primary" />
                                <span className="font-semibold">{toWarehouseCode} - {toWarehouseName}</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLine(line.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Agregar productos a esta línea */}
                          <div className="flex gap-2 border-t pt-3">
                            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Seleccionar producto" />
                              </SelectTrigger>
                              <SelectContent>
                                {products?.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min={1}
                              value={quantity}
                              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                              className="w-24"
                              placeholder="Cant."
                            />
                            <Button onClick={() => addItem(line.id)} type="button">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Items en esta línea */}
                          {line.items.length > 0 && (
                            <div className="space-y-2 border-t pt-3">
                              {line.items.map((item) => (
                                <div key={item.product_id} className="flex justify-between items-center p-2 bg-background rounded">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{item.product_name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline">x{item.quantity}</Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeItem(line.id, item.product_id)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>

                  {/* Agregar nueva línea */}
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                    <div className="text-sm font-medium">Agregar nueva línea de transferencia</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1 block">Depósito Origen *</Label>
                        <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses?.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.code} - {w.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Depósito Destino *</Label>
                        <Select value={toWarehouse} onValueChange={setToWarehouse}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses?.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.code} - {w.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={addNewLine} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Línea
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>
                    Crear Transferencia ({lines.length} línea{lines.length !== 1 ? 's' : ''})
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-2 sm:p-6">
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Número</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="hidden md:table-cell">Solicitado por</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {transfers?.map((transfer, index) => (
                  <TableRow key={transfer.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <TableCell>
                      <code className="font-mono text-xs sm:text-sm">{transfer.transfer_number}</code>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {format(new Date(transfer.transfer_date), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{transfer.from_warehouse.code}</Badge>
                      <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
                        {transfer.from_warehouse.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{transfer.to_warehouse.code}</Badge>
                      <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
                        {transfer.to_warehouse.name}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">-</TableCell>
                    <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {transfer.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateTransferStatus.mutate({ id: transfer.id, status: "approved" })}
                              className="hover:scale-110 transition-transform"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateTransferStatus.mutate({ id: transfer.id, status: "cancelled" })}
                              className="hover:scale-110 transition-transform"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          </>
                        )}
                        {transfer.status === "approved" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateTransferStatus.mutate({ id: transfer.id, status: "received" })}
                            className="hover:scale-110 transition-transform"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Recibir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
