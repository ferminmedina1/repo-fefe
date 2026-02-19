import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, AlertTriangle, Package, Tag, Bell, Power } from "lucide-react";
import { toast } from "sonner";

interface AlertRule {
  id: string;
  company_id: string;
  created_by: string | null;
  condition_type: string;
  scope: string;
  scope_category: string | null;
  scope_product_id: string | null;
  threshold: number;
  notify_system: boolean;
  notify_email: boolean;
  notify_whatsapp: boolean;
  active: boolean;
  name: string | null;
  last_triggered_at: string | null;
  triggered_count: number;
  created_at: string;
  updated_at: string;
}

interface CreateAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule?: AlertRule | null;
}

const CONDITION_TYPES = [
  { value: "stock_lte", label: "Stock menor o igual a", description: "Alerta cuando el stock baja a este nivel" },
  { value: "stock_eq_zero", label: "Sin stock", description: "Alerta cuando un producto se queda sin stock" },
  { value: "stock_gte", label: "Stock mayor o igual a", description: "Alerta de sobrestock" },
] as const;

const SCOPE_OPTIONS = [
  { value: "all", label: "Todos los productos" },
  { value: "category", label: "Categoría específica" },
  { value: "product", label: "Producto específico" },
] as const;

export function CreateAlertDialog({ open, onOpenChange, editingRule }: CreateAlertDialogProps) {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const isEditing = !!editingRule;

  // Form state
  const [conditionType, setConditionType] = useState<string>("stock_lte");
  const [scope, setScope] = useState<string>("all");
  const [scopeCategory, setScopeCategory] = useState<string>("");
  const [scopeProductId, setScopeProductId] = useState<string>("");
  const [threshold, setThreshold] = useState<string>("10");
  const [notifySystem, setNotifySystem] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [activeImmediately, setActiveImmediately] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [alertName, setAlertName] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (editingRule && open) {
      setConditionType(editingRule.condition_type);
      setScope(editingRule.scope);
      setScopeCategory(editingRule.scope_category || "");
      setScopeProductId(editingRule.scope_product_id || "");
      setThreshold(String(editingRule.threshold));
      setNotifySystem(editingRule.notify_system);
      setNotifyEmail(editingRule.notify_email);
      setNotifyWhatsapp(editingRule.notify_whatsapp);
      setActiveImmediately(editingRule.active);
      setAlertName(editingRule.name || "");
      setProductSearch("");
    } else if (!open) {
      resetForm();
    }
  }, [editingRule, open]);

  // Fetch products for categories and product selector
  const { data: products } = useQuery({
    queryKey: ["products-for-alerts", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, category, stock")
        .eq("company_id", currentCompany?.id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id && open,
  });

  // Extract unique categories
  const categories = useMemo(() => {
    if (!products) return [];
    return Array.from(new Set(products.filter(p => p.category).map(p => p.category!))).sort();
  }, [products]);

  // Filter products for autocomplete
  const filteredProducts = useMemo(() => {
    if (!products || !productSearch) return products?.slice(0, 10) || [];
    const q = productSearch.toLowerCase();
    return products
      .filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [products, productSearch]);

  // Determine if threshold field is needed
  const needsThreshold = conditionType !== "stock_eq_zero";

  // Validation
  const isValid = useMemo(() => {
    if (!conditionType) return false;
    if (needsThreshold) {
      const num = Number(threshold);
      if (!threshold || isNaN(num) || num < 0 || !Number.isInteger(num)) return false;
    }
    if (scope === "category" && !scopeCategory) return false;
    if (scope === "product" && !scopeProductId) return false;
    return true;
  }, [conditionType, threshold, needsThreshold, scope, scopeCategory, scopeProductId]);

  // Reset form
  const resetForm = () => {
    setConditionType("stock_lte");
    setScope("all");
    setScopeCategory("");
    setScopeProductId("");
    setThreshold("10");
    setNotifySystem(true);
    setNotifyEmail(false);
    setNotifyWhatsapp(false);
    setActiveImmediately(true);
    setProductSearch("");
    setAlertName("");
  };

  // Build payload helper
  const buildPayload = () => ({
    condition_type: conditionType,
    scope,
    scope_category: scope === "category" ? scopeCategory : null,
    scope_product_id: scope === "product" ? scopeProductId : null,
    threshold: conditionType === "stock_eq_zero" ? 0 : Number(threshold),
    notify_system: notifySystem,
    notify_email: notifyEmail,
    notify_whatsapp: notifyWhatsapp,
    active: activeImmediately,
    name: alertName.trim() || null,
  });

  // Create mutation
  const createAlert = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");
      if (!currentCompany?.id) throw new Error("No hay empresa seleccionada");

      const { data, error } = await supabase
        .from("inventory_alert_rules")
        .insert({ ...buildPayload(), company_id: currentCompany.id, created_by: userData.user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Alerta creada exitosamente", {
        description: "La regla de alerta se ha guardado y está activa.",
      });
      queryClient.invalidateQueries({ queryKey: ["inventory-alert-rules"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Error creating alert:", error);
      toast.error("Error al crear la alerta", {
        description: error.message || "Intenta nuevamente.",
      });
    },
  });

  // Update mutation
  const updateAlert = useMutation({
    mutationFn: async () => {
      if (!editingRule) throw new Error("No hay alerta para editar");

      const { data, error } = await supabase
        .from("inventory_alert_rules")
        .update(buildPayload())
        .eq("id", editingRule.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Alerta actualizada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["inventory-alert-rules"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Error updating alert:", error);
      toast.error("Error al actualizar la alerta", {
        description: error.message || "Intenta nuevamente.",
      });
    },
  });

  const isSaving = createAlert.isPending || updateAlert.isPending;

  const handleSubmit = () => {
    if (!isValid) return;
    if (isEditing) {
      updateAlert.mutate();
    } else {
      createAlert.mutate();
    }
  };

  const selectedProduct = products?.find(p => p.id === scopeProductId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSaving) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{isEditing ? "Editar alerta de inventario" : "Nueva alerta de inventario"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modificá los parámetros de esta alerta." : "Configura una condición automática para monitorear tu stock."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nombre opcional */}
          <div className="space-y-2">
            <Label htmlFor="alert-name">Nombre de la alerta (opcional)</Label>
            <Input
              id="alert-name"
              placeholder="Ej: Alerta bajo stock general"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
            />
          </div>

          {/* BLOQUE 1 — Tipo de alerta */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <Label className="text-sm font-semibold">Tipo de condición</Label>
              <Badge variant="outline" className="text-xs">Obligatorio</Badge>
            </div>
            <Select value={conditionType} onValueChange={setConditionType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo de condición" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    <div className="flex flex-col">
                      <span>{ct.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {CONDITION_TYPES.find(c => c.value === conditionType)?.description}
            </p>
          </div>

          {/* BLOQUE 2 — Alcance */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <Label className="text-sm font-semibold">Aplicar a</Label>
              <Badge variant="outline" className="text-xs">Obligatorio</Badge>
            </div>
            <Select value={scope} onValueChange={(v) => { setScope(v); setScopeCategory(""); setScopeProductId(""); setProductSearch(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar alcance" />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category selector */}
            {scope === "category" && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Seleccionar categoría
                </Label>
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No hay categorías definidas en tus productos.</p>
                ) : (
                  <Select value={scopeCategory} onValueChange={setScopeCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegir categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Product selector with search */}
            {scope === "product" && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Buscar producto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {selectedProduct && (
                  <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{selectedProduct.name}</span>
                    {selectedProduct.sku && <Badge variant="secondary" className="text-xs">{selectedProduct.sku}</Badge>}
                    <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => { setScopeProductId(""); setProductSearch(""); }}>
                      Cambiar
                    </Button>
                  </div>
                )}
                {!selectedProduct && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground text-center">No se encontraron productos</p>
                    ) : (
                      filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between transition-colors"
                          onClick={() => { setScopeProductId(p.id); setProductSearch(p.name); }}
                        >
                          <div>
                            <span className="font-medium">{p.name}</span>
                            {p.sku && <span className="text-muted-foreground ml-2 text-xs">({p.sku})</span>}
                          </div>
                          <Badge variant="outline" className="text-xs">Stock: {p.stock}</Badge>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BLOQUE 3 — Condición (umbral) */}
          {needsThreshold && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <Label className="text-sm font-semibold">Umbral</Label>
                <Badge variant="outline" className="text-xs">Obligatorio</Badge>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  Disparar alerta cuando el stock sea {conditionType === "stock_lte" ? "menor o igual" : "mayor o igual"} a:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="threshold"
                  type="number"
                  min={0}
                  step={1}
                  value={threshold}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || (Number(val) >= 0 && Number.isInteger(Number(val)))) {
                      setThreshold(val);
                    }
                  }}
                  className="w-32"
                  placeholder="10"
                />
                <span className="text-sm text-muted-foreground">unidades</span>
              </div>
              {threshold && Number(threshold) < 0 && (
                <p className="text-xs text-destructive">El umbral no puede ser negativo.</p>
              )}
            </div>
          )}

          {/* BLOQUE 4 — Notificación */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-purple-500" />
              <Label className="text-sm font-semibold">Método de notificación</Label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="notify-system"
                  checked={notifySystem}
                  onCheckedChange={() => {/* always on */}}
                  disabled
                />
                <Label htmlFor="notify-system" className="text-sm cursor-pointer">
                  Notificar dentro del sistema
                </Label>
                <Badge variant="secondary" className="text-xs">Siempre activo</Badge>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="notify-email"
                  checked={notifyEmail}
                  onCheckedChange={(checked) => setNotifyEmail(!!checked)}
                />
                <Label htmlFor="notify-email" className="text-sm cursor-pointer">
                  Enviar email
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="notify-whatsapp"
                  checked={notifyWhatsapp}
                  onCheckedChange={(checked) => setNotifyWhatsapp(!!checked)}
                  disabled
                />
                <Label htmlFor="notify-whatsapp" className="text-sm cursor-pointer text-muted-foreground">
                  Enviar WhatsApp
                </Label>
                <Badge variant="outline" className="text-xs">Próximamente</Badge>
              </div>
            </div>
          </div>

          {/* BLOQUE 5 — Estado */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Power className="h-4 w-4 text-green-500" />
              <Label className="text-sm font-semibold">Estado</Label>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Activar inmediatamente</p>
                <p className="text-xs text-muted-foreground">La alerta comenzará a monitorear apenas se guarde</p>
              </div>
              <Switch
                checked={activeImmediately}
                onCheckedChange={setActiveImmediately}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => { resetForm(); onOpenChange(false); }}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              isEditing ? "Actualizar alerta" : "Guardar alerta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
