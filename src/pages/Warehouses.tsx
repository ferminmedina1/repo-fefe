import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Trash2, Package, ArrowLeftRight, Info, MapPin, Phone, User, CheckCircle2, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  manager_name?: string;
  is_main: boolean;
  active: boolean;
}

export default function Warehouses() {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    manager_name: "",
    is_main: false,
    active: true,
  });

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ["warehouses", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("company_id", currentCompany?.id)
        .order("is_main", { ascending: false })
        .order("name");
      if (error) throw error;
      return data as Warehouse[];
    },
  });

  const createWarehouse = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("warehouses").insert([{
        ...data,
        company_id: currentCompany?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Depósito creado exitosamente");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateWarehouse = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("warehouses").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Depósito actualizado exitosamente");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteWarehouse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Depósito eliminado exitosamente");
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      address: "",
      phone: "",
      manager_name: "",
      is_main: false,
      active: true,
    });
    setSelectedWarehouse(null);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address || "",
      phone: warehouse.phone || "",
      manager_name: warehouse.manager_name || "",
      is_main: warehouse.is_main,
      active: warehouse.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code) {
      toast.error("Nombre y código son requeridos");
      return;
    }

    if (selectedWarehouse) {
      updateWarehouse.mutate({ id: selectedWarehouse.id, data: formData });
    } else {
      createWarehouse.mutate(formData);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Depósitos</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate("/warehouse-transfers")}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <ArrowLeftRight className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden xs:inline">Transferencias</span>
              <span className="xs:hidden">Transf.</span>
            </Button>
            <Button
              onClick={() => navigate("/warehouse-stock")}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <Package className="mr-1 sm:mr-2 h-4 w-4" />
              Stock
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button onClick={resetForm} className="hover:scale-105 transition-transform gap-2">
                        <Plus className="h-4 w-4" />
                  Nuevo Depósito
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Crear nuevo depósito</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {selectedWarehouse ? "Editar Depósito" : "Nuevo Depósito"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Sección Información Básica */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Info className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold">Información Básica</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nombre *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Depósito Central"
                        />
                      </div>
                      <div>
                        <Label>Código *</Label>
                        <Input
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          placeholder="DEP-01"
                          disabled={!!selectedWarehouse}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección Ubicación y Contacto */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <MapPin className="h-4 w-4 text-green-600 dark:text-green-500" />
                      </div>
                      <h3 className="text-sm font-semibold">Ubicación y Contacto</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Dirección</Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Calle 123"
                        />
                      </div>
                      <div>
                        <Label>Teléfono</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+54 11 1234-5678"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección Gestión */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <User className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                      </div>
                      <h3 className="text-sm font-semibold">Gestión</h3>
                    </div>
                    <div>
                      <Label>Encargado</Label>
                      <Input
                        value={formData.manager_name}
                        onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <Label className="cursor-pointer">Depósito Principal</Label>
                        </div>
                        <Switch
                          checked={formData.is_main}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_main: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          <Label className="cursor-pointer">Activo</Label>
                        </div>
                        <Switch
                          checked={formData.active}
                          onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                </Button>
                    <Button onClick={handleSubmit} className="gap-2">
                      {selectedWarehouse ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Actualizar
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Crear
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin"><Building2 className="h-6 w-6" /></div>
              <p className="mt-2 text-muted-foreground">Cargando depósitos...</p>
            </div>
          ) : warehouses && warehouses.length > 0 ? (
            <>
              {/* Contenedor Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.map((warehouse, index) => (
                  <div key={warehouse.id} className="animate-fade-in group rounded-lg border p-4 hover:border-primary hover:shadow-md transition-all duration-200" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-sm font-mono font-bold text-primary px-2 py-1 bg-primary/10 rounded">
                              {warehouse.code}
                            </code>
                            {warehouse.is_main && (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1">
                                <Building2 className="h-3 w-3" />
                                Principal
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold mt-2">{warehouse.name}</h3>
                        </div>
                        <Badge variant={warehouse.active ? "default" : "secondary"} className={warehouse.active ? "bg-green-500 hover:bg-green-600" : ""}>
                          {warehouse.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>

                      {/* Info */}
                      <div className="space-y-2 text-sm">
                        {warehouse.address && (
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{warehouse.address}</span>
                          </div>
                        )}
                        {warehouse.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{warehouse.phone}</span>
                          </div>
                        )}
                        {warehouse.manager_name && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{warehouse.manager_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEdit(warehouse)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        {!warehouse.is_main && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedWarehouse(warehouse);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No hay depósitos configurados</p>
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar depósito?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el depósito y todo su stock asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedWarehouse && deleteWarehouse.mutate(selectedWarehouse.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
