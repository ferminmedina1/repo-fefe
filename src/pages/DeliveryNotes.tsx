import { useState } from "react";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Truck, Package, CheckCircle, Download, FileText } from "lucide-react";
import { generateDeliveryNotePDF } from "@/components/pdf/DeliveryNotePDF";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { usePermissions } from "@/hooks/usePermissions";
import { sanitizeSearchQuery } from "@/lib/searchUtils";
import { getUserErrorMessage } from "@/lib/errorUtils";
import { useCompany } from "@/contexts/CompanyContext";

export default function DeliveryNotes() {
  const { currentCompany } = useCompany();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  // LOW-04: Use count queries instead of fetching all rows
  const { data: deliveryNoteStats } = useQuery({
    queryKey: ["delivery-notes-stats", currentCompany?.id],
    queryFn: async () => {
      const [total, pending, inTransit, delivered] = await Promise.all([
        supabase.from("delivery_notes").select("*", { count: "exact", head: true }).eq("company_id", currentCompany?.id),
        supabase.from("delivery_notes").select("*", { count: "exact", head: true }).eq("company_id", currentCompany?.id).eq("status", "pending"),
        supabase.from("delivery_notes").select("*", { count: "exact", head: true }).eq("company_id", currentCompany?.id).eq("status", "in_transit"),
        supabase.from("delivery_notes").select("*", { count: "exact", head: true }).eq("company_id", currentCompany?.id).eq("status", "delivered"),
      ]);
      return {
        total: total.count || 0,
        pending: pending.count || 0,
        inTransit: inTransit.count || 0,
        delivered: delivered.count || 0,
      };
    },
    enabled: !!currentCompany?.id,
  });

  const { data: deliveryNoteResult, isLoading } = useQuery({
    queryKey: ["delivery-notes", searchQuery, currentCompany?.id, page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("delivery_notes")
        .select("*", { count: "exact" })
        .eq("company_id", currentCompany?.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (searchQuery) {
        const sanitized = sanitizeSearchQuery(searchQuery);
        if (sanitized) {
          query = query.or(`delivery_number.ilike.%${sanitized}%,customer_name.ilike.%${sanitized}%`);
        }
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!currentCompany?.id,
  });

  const deliveryNotes = deliveryNoteResult?.data || [];
  const deliveryNotesTotal = deliveryNoteResult?.count || 0;
  const deliveryNotesTotalPages = Math.max(1, Math.ceil(deliveryNotesTotal / pageSize));

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", currentCompany.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "in_transit" | "delivered" | "cancelled" }) => {
      const updateData: any = { status };
      
      if (status === "delivered") {
        updateData.received_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("delivery_notes")
        .update(updateData)
        .eq("id", id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
      // HIGH-6: Actualizar también los contadores de estadísticas
      queryClient.invalidateQueries({ queryKey: ["delivery-notes-stats"] });
    },
    onError: (error: Error) => {
      toast.error(getUserErrorMessage(error, "Error al actualizar estado"));
    },
  });

  const convertToSaleMutation = useMutation({
    mutationFn: async (deliveryNoteId: string) => {
      // HIGH-5: Verificar desde el servidor que el remito no haya sido facturado ya (previene doble clic / carrera)
      const { data: checkNote, error: checkError } = await supabase
        .from("delivery_notes")
        .select("id, sale_id")
        .eq("id", deliveryNoteId)
        .eq("company_id", currentCompany?.id)
        .single();
      if (checkError) throw checkError;
      if (checkNote.sale_id) throw new Error("Este remito ya fue facturado");

      const { data: deliveryNote, error: noteError } = await supabase
        .from("delivery_notes")
        .select("*, delivery_note_items(*)")
        .eq("id", deliveryNoteId)
        .single();
      
      if (noteError) throw noteError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Atomic sale number — no race conditions
      const { data: saleNumberData, error: saleNumberError } = await supabase.rpc("generate_sale_number");
      if (saleNumberError) throw saleNumberError;
      const saleNumber = saleNumberData as string;

      // Crear venta
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          sale_number: saleNumber,
          customer_id: deliveryNote.customer_id,
          user_id: user.id,
          subtotal: deliveryNote.subtotal,
          total: deliveryNote.total,
          payment_method: "credit",
          installments: 1,
          notes: `Facturado desde remito ${deliveryNote.delivery_number}`,
          status: "completed",
          company_id: currentCompany?.id,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Crear items de venta
      const saleItems = deliveryNote.delivery_note_items.map((item: any) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        company_id: currentCompany?.id,
      }));

      await supabase.from("sale_items").insert(saleItems);

      // MED-02: Link delivery note to the generated sale so it can't be billed twice
      await supabase
        .from("delivery_notes")
        .update({ sale_id: sale.id })
        .eq("id", deliveryNoteId);

      // Atomic stock decrement via RPC (no race conditions, single query)
      const itemProductIds = deliveryNote.delivery_note_items
        .map((item: any) => item.product_id)
        .filter(Boolean);

      if (itemProductIds.length > 0) {
        const adjustments: Record<string, number> = {};
        deliveryNote.delivery_note_items.forEach((item: any) => {
          if (item.product_id) {
            adjustments[item.product_id] = (adjustments[item.product_id] || 0) - item.quantity;
          }
        });
        const { error: stockError } = await supabase.rpc('batch_update_product_stock', { adjustments });
        if (stockError) throw stockError;
      }

      return sale;
    },
    onSuccess: () => {
      toast.success("Remito facturado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      // HIGH-5: Refrescar lista y estadísticas de remitos tras facturar
      queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-notes-stats"] });
    },
    onError: (error: Error) => {
      toast.error(getUserErrorMessage(error, "Error al facturar remito"));
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: any }> = {
      pending: { variant: "secondary", label: "Pendiente", icon: Package },
      in_transit: { variant: "default", label: "En tránsito", icon: Truck },
      delivered: { variant: "default", label: "Entregado", icon: CheckCircle },
      cancelled: { variant: "destructive", label: "Cancelado", icon: null },
    };
    const config = variants[status] || { variant: "outline", label: status, icon: null };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        {Icon && <Icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  const handleDownloadPDF = async (deliveryNoteId: string) => {
    try {
      // HIGH-4: Filtrar por company_id para prevenir IDOR
      const { data: deliveryNote, error: noteError } = await supabase
        .from("delivery_notes")
        .select("*")
        .eq("id", deliveryNoteId)
        .eq("company_id", currentCompany?.id)
        .single();

      if (noteError) throw noteError;

      const { data: items, error: itemsError } = await supabase
        .from("delivery_note_items")
        .select("*")
        .eq("delivery_note_id", deliveryNoteId);
      
      if (itemsError) throw itemsError;

      await generateDeliveryNotePDF(
        {
          ...deliveryNote,
          items: items || [],
        },
        companySettings
      );

      toast.success("PDF generado exitosamente");
    } catch (error: any) {
      toast.error(getUserErrorMessage(error, "Error al generar PDF"));
    }
  };

  const canEdit = hasPermission("delivery_notes", "edit");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" data-tutorial="btn-create-delivery">Remitos</h1>
            <p className="text-muted-foreground">Gestiona entregas y remitos de ventas</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Remitos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deliveryNoteStats?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deliveryNoteStats?.pending || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">En Tránsito</CardTitle>
              <Truck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deliveryNoteStats?.inTransit || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Entregados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deliveryNoteStats?.delivered || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número o cliente..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table data-tutorial="delivery-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead>Fecha Entrega</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Cargando...</TableCell>
                  </TableRow>
                ) : deliveryNotes.length > 0 ? (
                  deliveryNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">{note.delivery_number}</TableCell>
                      <TableCell>{note.customer_name}</TableCell>
                      <TableCell>${Number(note.total).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(note.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {note.delivery_address || "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(note.created_at), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {note.delivery_date 
                          ? format(new Date(note.delivery_date), "dd/MM/yyyy", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPDF(note.id)}
                            title="Descargar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canEdit && note.status === "delivered" && !note.sale_id && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => convertToSaleMutation.mutate(note.id)}
                              title="Facturar remito"
                              disabled={convertToSaleMutation.isPending}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Facturar
                            </Button>
                          )}
                          {canEdit && (
                            <>
                              {note.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatusMutation.mutate({ 
                                    id: note.id, 
                                    status: "in_transit" 
                                  })}
                                  title="Marcar en tránsito"
                                >
                                  <Truck className="h-4 w-4" />
                                </Button>
                              )}
                              {note.status === "in_transit" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatusMutation.mutate({ 
                                    id: note.id, 
                                    status: "delivered" 
                                  })}
                                  title="Marcar como entregado"
                                  data-tutorial="track-delivery"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No hay remitos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <PaginationControls
              currentPage={page + 1}
              totalPages={deliveryNotesTotalPages}
              totalItems={deliveryNotesTotal}
              startIndex={deliveryNotesTotal === 0 ? 0 : page * pageSize + 1}
              endIndex={Math.min((page + 1) * pageSize, deliveryNotesTotal)}
              pageSize={pageSize}
              canGoNext={page + 1 < deliveryNotesTotalPages}
              canGoPrevious={page > 0}
              onPageChange={(p) => setPage(p - 1)}
              onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
              onNextPage={() => setPage(prev => prev + 1)}
              onPreviousPage={() => setPage(prev => prev - 1)}
              onFirstPage={() => setPage(0)}
              onLastPage={() => setPage(deliveryNotesTotalPages - 1)}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
