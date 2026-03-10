import { useState, useDeferredValue } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Tag,
  TrendingDown,
  Gift,
  Percent,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { sanitizeSearchQuery } from "@/lib/searchUtils";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompany } from "@/contexts/CompanyContext";

// B-3: Strong union types instead of plain string
type PromotionType = "percentage" | "fixed" | "volume";
type PromotionTarget = "all" | "category";

// A-3: Explicit interface — replaces all `any` usages
interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: PromotionType;
  value: number;
  min_quantity: number;
  min_amount: number;
  max_uses: number | null;
  current_uses: number | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
  applies_to: PromotionTarget;
  category: string | null;
  company_id: string | null;
}

type PromotionFormData = {
  code: string;
  name: string;
  description: string;
  type: PromotionType;
  value: string;
  min_quantity: string;
  min_amount: string;
  max_uses: string;
  start_date: string;
  end_date: string;
  active: boolean;
  applies_to: PromotionTarget;
  category: string;
};

const EMPTY_FORM: PromotionFormData = {
  code: "",
  name: "",
  description: "",
  type: "percentage",
  value: "0",
  min_quantity: "1",
  min_amount: "0",
  max_uses: "",
  start_date: "",
  end_date: "",
  active: true,
  applies_to: "all",
  category: "",
};

const PAGE_SIZE = 50;

export default function Promotions() {
  const { currentCompany } = useCompany();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // M-1: canView now checked — unauthorized users are blocked
  const canView = hasPermission("promotions", "view");
  const canCreate = hasPermission("promotions", "create");
  const canEdit = hasPermission("promotions", "edit");
  const canDelete = hasPermission("promotions", "delete");

  // M-4: Currency from company config
  const currency = currentCompany?.currency || "$";

  const [searchQuery, setSearchQuery] = useState("");
  // M-5: Debounce via useDeferredValue — prevents a DB call per keystroke
  const deferredSearch = useDeferredValue(searchQuery);

  const [currentPage, setCurrentPage] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // A-3: Typed — no more `any`
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  // A-4: Replaces window.confirm()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<PromotionFormData>(EMPTY_FORM);

  // M-2: enabled guard — M-3: isLoading/isError — B-4: pagination
  const {
    data: promotions = [],
    isLoading,
    isError: promotionsError,
  } = useQuery({
    queryKey: ["promotions", deferredSearch, currentCompany?.id, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("promotions")
        .select("*")
        .eq("company_id", currentCompany!.id)
        .order("created_at", { ascending: false })
        // B-4: Paginate — avoids loading all promotions at once
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (deferredSearch) {
        const sanitized = sanitizeSearchQuery(deferredSearch);
        if (sanitized) {
          query = query.or(
            `code.ilike.%${sanitized}%,name.ilike.%${sanitized}%`
          );
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Promotion[];
    },
    // M-2: Don't run without valid company and view permission
    enabled: canView && !!currentCompany?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Promotion, "id" | "current_uses">) => {
      const { error } = await supabase.from("promotions").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Promoción creada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Promotion, "id">>;
    }) => {
      const { error } = await supabase
        .from("promotions")
        .update(data)
        .eq("id", id)
        // C-1: Scope update to current company — prevents cross-tenant modification
        .eq("company_id", currentCompany!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Promoción actualizada");
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("promotions")
        .delete()
        .eq("id", id)
        // C-2: Scope delete to current company — prevents cross-tenant deletion
        .eq("company_id", currentCompany!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Promoción eliminada");
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setDeleteConfirmId(null);
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // A-1: Guard against null company before insert
    if (!currentCompany) {
      toast.error("No hay empresa seleccionada");
      return;
    }

    // A-2: Structured validation
    const value = parseFloat(formData.value);
    const minQuantity = parseInt(formData.min_quantity);
    const minAmount = parseFloat(formData.min_amount);
    const maxUses = formData.max_uses ? parseInt(formData.max_uses) : null;

    if (isNaN(value) || value <= 0) {
      toast.error("El valor del descuento debe ser mayor a 0");
      return;
    }
    if (formData.type === "percentage" && value > 100) {
      toast.error("El descuento porcentual no puede superar el 100%");
      return;
    }
    if (minQuantity < 0) {
      toast.error("La cantidad mínima no puede ser negativa");
      return;
    }
    if (minAmount < 0) {
      toast.error("El monto mínimo no puede ser negativo");
      return;
    }
    if (maxUses !== null && maxUses <= 0) {
      toast.error("El máximo de usos debe ser mayor a 0");
      return;
    }
    if (!formData.start_date) {
      toast.error("La fecha de inicio es requerida");
      return;
    }
    if (formData.end_date && formData.end_date < formData.start_date) {
      toast.error(
        "La fecha de fin debe ser igual o posterior a la fecha de inicio"
      );
      return;
    }

    const submitData = {
      ...formData,
      value,
      min_quantity: minQuantity,
      min_amount: minAmount,
      max_uses: maxUses,
      // A-1: Non-optional company_id — safe because of guard above
      company_id: currentCompany.id,
    };

    if (editingPromotion) {
      updateMutation.mutate({ id: editingPromotion.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  // A-3: Typed parameter — no more `any`
  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      code: promotion.code,
      name: promotion.name,
      description: promotion.description || "",
      type: promotion.type,
      value: promotion.value.toString(),
      min_quantity: promotion.min_quantity.toString(),
      min_amount: promotion.min_amount.toString(),
      max_uses: promotion.max_uses?.toString() || "",
      // B-1: Robust date parsing via date-fns instead of brittle split("T")[0]
      start_date: format(new Date(promotion.start_date), "yyyy-MM-dd"),
      end_date: promotion.end_date
        ? format(new Date(promotion.end_date), "yyyy-MM-dd")
        : "",
      active: promotion.active,
      applies_to: promotion.applies_to,
      category: promotion.category || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPromotion(null);
    setFormData(EMPTY_FORM);
  };

  const getTypeIcon = (type: PromotionType) => {
    switch (type) {
      case "percentage": return <Percent className="h-4 w-4" />;
      case "fixed":      return <TrendingDown className="h-4 w-4" />;
      case "volume":     return <Gift className="h-4 w-4" />;
      default:           return <Tag className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: PromotionType) => {
    switch (type) {
      case "percentage": return "Porcentaje";
      case "fixed":      return "Fijo";
      case "volume":     return "Por Volumen";
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;
  const hasMorePages = promotions.length === PAGE_SIZE;

  if (permissionsLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // M-1: Block access for unauthorized roles
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
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Promociones y Descuentos
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestión de cupones y ofertas
            </p>
          </div>

          {canCreate && (
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Promoción
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPromotion ? "Editar Promoción" : "Nueva Promoción"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Código *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="VERANO2024"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Oferta de Verano"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Descripción de la promoción..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo de Descuento *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: PromotionType) =>
                          setFormData({ ...formData, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Porcentaje</SelectItem>
                          <SelectItem value="fixed">Monto Fijo</SelectItem>
                          <SelectItem value="volume">Por Volumen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="value">
                        Valor *
                        {formData.type === "percentage" && " (máx. 100%)"}
                      </Label>
                      <Input
                        id="value"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={formData.type === "percentage" ? 100 : undefined}
                        value={formData.value}
                        onChange={(e) =>
                          setFormData({ ...formData, value: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_quantity">Cantidad Mínima</Label>
                      <Input
                        id="min_quantity"
                        type="number"
                        min="0"
                        value={formData.min_quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, min_quantity: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_amount">Monto Mínimo</Label>
                      <Input
                        id="min_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.min_amount}
                        onChange={(e) =>
                          setFormData({ ...formData, min_amount: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Fecha Inicio *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) =>
                          setFormData({ ...formData, start_date: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">Fecha Fin</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        // A-2: Browser-level guard — min is start_date
                        min={formData.start_date}
                        onChange={(e) =>
                          setFormData({ ...formData, end_date: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_uses">Máximo de Usos</Label>
                    <Input
                      id="max_uses"
                      type="number"
                      min="1"
                      value={formData.max_uses}
                      onChange={(e) =>
                        setFormData({ ...formData, max_uses: e.target.value })
                      }
                      placeholder="Dejar vacío para ilimitado"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, active: checked })
                      }
                    />
                    <Label htmlFor="active">Promoción Activa</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isMutating}
                    >
                      Cancelar
                    </Button>
                    {/* A-5: Disabled during pending — prevents double-submit */}
                    <Button type="submit" disabled={isMutating}>
                      {isMutating && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingPromotion ? "Actualizar" : "Crear"} Promoción
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o nombre..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(0);
                }}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 overflow-x-auto">
            {/* M-3: Explicit loading and error states */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : promotionsError ? (
              <div className="flex items-center justify-center py-12 gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>
                  Error al cargar las promociones. Intente recargar la página.
                </span>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[80px]">Código</TableHead>
                      <TableHead className="hidden sm:table-cell">Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="hidden md:table-cell">Usos</TableHead>
                      <TableHead className="hidden lg:table-cell">Válido Hasta</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acc.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell className="font-mono font-bold text-xs sm:text-sm">
                          {promo.code}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {promo.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 text-xs">
                            {getTypeIcon(promo.type)}
                            <span className="hidden sm:inline">
                              {getTypeLabel(promo.type)}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-primary text-xs sm:text-sm">
                          {/* M-4: Company currency for fixed discounts */}
                          {promo.type === "percentage"
                            ? `${promo.value}%`
                            : `${currency} ${promo.value}`}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {/* B-2: Null-safe current_uses */}
                          {promo.current_uses ?? 0}/{promo.max_uses || "∞"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {promo.end_date
                            ? format(new Date(promo.end_date), "dd/MM/yyyy", {
                                locale: es,
                              })
                            : "Sin límite"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={promo.active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {promo.active ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {canEdit && (
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleEdit(promo)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            // A-4: Queue for Dialog confirmation — no more window.confirm()
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => setDeleteConfirmId(promo.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {promotions.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-8"
                        >
                          No hay promociones registradas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* B-4: Pagination controls */}
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

      {/* A-4: Delete confirmation Dialog — replaces blocking window.confirm() */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de eliminar esta promoción? Esta acción no se puede
            deshacer y puede afectar ventas en curso que usen este cupón.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
