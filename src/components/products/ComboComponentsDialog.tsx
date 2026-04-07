import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { Plus, Trash2, Loader2, Package, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFormValidation, useSecureMutation } from "@/lib/useSecureMutation";
import { validateUUID, validateNumber } from "@/lib/validators";

interface ComboComponentsDialogProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Component {
  id: string;
  component_product_id: string;
  quantity: number;
  products?: {
    name: string;
    sku: string | null;
    stock_physical: number;
  };
}

// Validadores específicos para cómponents
const FIELD_VALIDATORS = {
  component_product_id: (value: any) =>
    validateUUID(value).valid 
      ? { valid: true } 
      : { valid: false, error: "Debe seleccionar un producto válido" },
  quantity: (value: any) => {
    const result = validateNumber(value, { required: true, min: 0.01 });
    return result.valid 
      ? { valid: true } 
      : { valid: false, error: result.error || "Cantidad debe ser mayor a 0" };
  },
};

export function ComboComponentsDialog({ productId, productName, isOpen, onClose }: ComboComponentsDialogProps) {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const { errors, validate, clearError } = useFormValidation(FIELD_VALIDATORS);

  const { data: components, isLoading } = useQuery({
    queryKey: ["product-components", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_components")
        .select(`
          *,
          products!product_components_component_product_id_fkey(name, sku, stock_physical)
        `)
        .eq("combo_product_id", productId);
      if (error) throw error;
      return data as Component[];
    },
    enabled: isOpen && !!productId,
  });

  const { data: availableProducts } = useQuery({
    queryKey: ["products-for-combo", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, stock_physical, is_combo")
        .eq("company_id", currentCompany?.id!)
        .eq("active", true)
        .neq("id", productId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!currentCompany?.id,
  });

  const addComponentMutation = useMutation({
    mutationFn: async (data: { component_product_id: string; quantity: number }) => {
      const { error } = await supabase.from("product_components").insert({
        company_id: currentCompany?.id!,
        combo_product_id: productId,
        component_product_id: data.component_product_id,
        quantity: data.quantity,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Componente agregado");
      queryClient.invalidateQueries({ queryKey: ["product-components"] });
      setSelectedProduct("");
      setQuantity("1");
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });

  const handleAddComponent = () => {
    // Validar inputs
    const isValid = validate({
      component_product_id: selectedProduct,
      quantity: quantity,
    });

    if (!isValid) {
      toast.error("Por favor corrija los errores");
      return;
    }

    addComponentMutation.mutate({
      component_product_id: selectedProduct,
      quantity: parseFloat(quantity),
    });
  };

  const calculateAvailableStock = () => {
    if (!components || components.length === 0) return 0;
    return Math.min(
      ...components.map((comp) => {
        const available = comp.products?.stock_physical || 0;
        return Math.floor(available / comp.quantity);
      })
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Componentes del Combo: {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Available Stock Display */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Stock Disponible del Combo:</span>
              <Badge variant="secondary" className="text-lg">
                <Package className="h-4 w-4 mr-2" />
                {calculateAvailableStock()} unidades
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Basado en el stock de componentes disponibles
            </p>
          </div>

          {/* Add Component Form */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">Agregar Componente</h3>
            <div className="grid grid-cols-[1fr,auto,auto] gap-2">
              <div className="space-y-1.5">
                <Label>Producto</Label>
                <Select value={selectedProduct} onValueChange={(value) => {
                  setSelectedProduct(value);
                  clearError("component_product_id");
                }}>
                  <SelectTrigger className={errors.component_product_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} {product.sku ? `(${product.sku})` : ""} - Stock: {product.stock_physical}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.component_product_id && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.component_product_id}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    clearError("quantity");
                  }}
                  className={`w-24 ${errors.quantity ? "border-red-500" : ""}`}
                />
                {errors.quantity && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.quantity}
                  </p>
                )}
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAddComponent}
                  disabled={addComponentMutation.isPending}
                  size="icon"
                >
                  {addComponentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Components List */}
          <div className="space-y-2">
            <h3 className="font-medium">Componentes Actuales</h3>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !components || components.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground border rounded-lg">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay componentes agregados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {components.map((component) => (
                  <div
                    key={component.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{component.products?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {component.products?.sku || "N/A"} | Stock: {component.products?.stock_physical}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">
                        {component.quantity} {component.quantity === 1 ? "unidad" : "unidades"}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteComponentMutation.mutate(component.id)}
                        disabled={deleteComponentMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
