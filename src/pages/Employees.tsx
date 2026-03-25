import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, Plus, Edit, Trash2, Shield, Clock, AlertTriangle, EyeOff, HelpCircle, Linkedin, Facebook, Instagram, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { EmployeePermissionsManager } from "@/components/employees/EmployeePermissionsManager";
import { EmployeeRoleAssignment } from "@/components/employees/EmployeeRoleAssignment";
import { EmployeeTimeTracking } from "@/components/employees/EmployeeTimeTracking";
import { EmployeeSelfTimeTracking } from "@/components/employees/EmployeeSelfTimeTracking";
import { EmployeeWorkLog } from "@/components/employees/EmployeeWorkLog";

interface EmployeeFormData {
  first_name: string;
  last_name: string;
  document_type: string;
  document_number: string;
  email: string;
  phone: string;
  hire_date: string;
  base_salary: number;
  salary_type: string;
  role: string;
  linkedin_url?: string;
  facebook_url?: string;
  instagram_username?: string;
}

const initialFormData: EmployeeFormData = {
  first_name: "",
  last_name: "",
  document_type: "DNI",
  document_number: "",
  email: "",
  phone: "",
  hire_date: new Date().toISOString().split("T")[0],
  base_salary: 0,
  salary_type: "monthly",
  role: "employee",
  linkedin_url: "",
  facebook_url: "",
  instagram_username: "",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  cashier: "Cajero",
  warehouse: "Depósito",
  technician: "Técnico",
  accountant: "Contador",
  auditor: "Auditor",
  viewer: "Visualizador",
  employee: "Empleado",
};

const Employees = () => {
  const { currentCompany } = useCompany();
  const { hasPermission, isAdmin, isEmployee, canManageEmployees, canManageTimeTracking } = usePermissions();

  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);

  const canCreate = hasPermission("employees", "create");
  const canEdit = hasPermission("employees", "edit");
  const canDelete = hasPermission("employees", "delete");

  const canViewAllTimeTracking = canManageTimeTracking;
  const showMyTime = !canViewAllTimeTracking;
  const defaultTab = canViewAllTimeTracking ? "all-times" : "list";
  const canManageRoles = canManageEmployees;

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees", currentCompany?.id, canManageRoles],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (employeesError) throw employeesError;

      const { data: authData } = await supabase.auth.getUser();
      const currentEmail = authData?.user?.email?.toLowerCase();

      const filteredEmployees = !canManageEmployees && currentEmail
        ? (employeesData || []).filter((employee: any) => employee.email?.toLowerCase() === currentEmail)
        : (employeesData || []);

      const base = filteredEmployees.map((employee: any) => ({ ...employee, role: "-" }));

      if (!canManageRoles) return base;

      const normalizeEmail = (email?: string | null) => (email || "").trim().toLowerCase();
      const emails = base.map((employee: any) => normalizeEmail(employee.email)).filter(Boolean);
      if (emails.length === 0) return base;

      const { data, error } = await supabase.functions.invoke("company-users-roles", {
        body: {
          companyId: currentCompany.id,
          emails,
        },
      });

      if (error) throw error;

      const roleByEmail = new Map<string, string>();
      (data as any)?.items?.forEach((item: any) => {
        const email = normalizeEmail(item?.email);
        if (email && item?.role) {
          roleByEmail.set(email, item.role);
        }
      });

      return base.map((employee: any) => {
        const email = normalizeEmail(employee.email);
        const role = email ? roleByEmail.get(email) : undefined;
        return { ...employee, role: role || "-" };
      });

    },
    enabled: !!currentCompany?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      if (!currentCompany?.id) throw new Error("No hay empresa seleccionada");

      const { role, ...employeeData } = data;

      const { error: employeeError } = await supabase
        .from("employees")
        .insert({
          ...employeeData,
          company_id: currentCompany.id,
          active: true,
        })
        .select()
        .single();

      if (employeeError) throw employeeError;

      if (data.email) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            const response = await supabase.functions.invoke("invite-employee", {
              body: {
                email: data.email,
                role: role,
                companyId: currentCompany.id,
                full_name: `${data.first_name} ${data.last_name}`,
              },
            });

            if (response.error) {
              console.error("Error al enviar invitacion:", response.error);
            }
          } catch (inviteError) {
            console.error("Error al enviar invitacion:", inviteError);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      toast.success("Empleado creado exitosamente. Se ha enviado una invitacion por email.");
      setDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error: any) => {
      toast.error("Error al crear empleado: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmployeeFormData> }) => {
      if (!currentCompany?.id) throw new Error("No hay empresa seleccionada");

      const { role, ...employeeData } = data;

      const { error: employeeError } = await supabase
        .from("employees")
        .update(employeeData)
        .eq("id", id);

      if (employeeError) throw employeeError;

      if (role && data.email) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) throw new Error("Sesion no valida");

        const fullName = `${(employeeData as any).first_name || ""} ${(employeeData as any).last_name || ""}`.trim();

        const response = await supabase.functions.invoke("invite-employee", {
          body: {
            email: data.email,
            role: role,
            companyId: currentCompany.id,
            full_name: fullName,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || "No se pudo guardar el rol");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Empleado actualizado exitosamente");
      setDialogOpen(false);
      setEditingEmployee(null);
      setFormData(initialFormData);
    },
    onError: (error: any) => {
      toast.error("Error al actualizar empleado: " + error.message);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (employee: any) => {
      if (!currentCompany?.id) throw new Error("No hay empresa seleccionada");

      const { error: deactivateError } = await supabase
        .from("employees")
        .update({ active: false })
        .eq("id", employee.id);

      if (deactivateError) throw deactivateError;

      if (employee.email) {
        const supabaseClient = supabase as any;
        const profileResult = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("email", employee.email)
          .maybeSingle();

        const profiles = profileResult.data;

        if (profiles) {
          await supabase
            .from("company_users")
            .update({ active: false })
            .eq("user_id", profiles.id)
            .eq("company_id", currentCompany.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Empleado desactivado exitosamente. Su acceso al sistema ha sido revocado.");
      setEmployeeToDelete(null);
      setDeleteConfirmOpen(false);
    },
    onError: (error: any) => {
      toast.error("Error al desactivar empleado: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (employee: any) => {
      if (!currentCompany?.id) throw new Error("No hay empresa seleccionada");

      const { error: deleteError } = await supabase
        .from("employees")
        .delete()
        .eq("id", employee.id);

      if (deleteError) throw deleteError;

      if (employee.email) {
        const supabaseClient = supabase as any;
        const profileResult = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("email", employee.email)
          .maybeSingle();

        const profiles = profileResult.data;

        if (profiles) {
          await supabase
            .from("company_users")
            .update({ active: false })
            .eq("user_id", profiles.id)
            .eq("company_id", currentCompany.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      toast.success("Empleado eliminado permanentemente de la base de datos");
      setEmployeeToDelete(null);
      setDeleteConfirmOpen(false);
    },
    onError: (error: any) => {
      toast.error("Error al eliminar el empleado: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.first_name || !formData.last_name) {
      toast.error("Nombre y apellido son requeridos");
      return;
    }
    if (!formData.hire_date) {
      toast.error("Fecha de ingreso es requerida");
      return;
    }

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    const normalizedRole =
      employee.role === "admin" ||
      employee.role === "manager" ||
      employee.role === "cashier" ||
      employee.role === "warehouse" ||
      employee.role === "technician" ||
      employee.role === "accountant" ||
      employee.role === "viewer" ||
      employee.role === "auditor" ||
      employee.role === "employee"
        ? employee.role
        : "employee";

    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      document_type: employee.document_type || "DNI",
      document_number: employee.document_number || "",
      email: employee.email || "",
      phone: employee.phone || "",
      hire_date: employee.hire_date || "",
      base_salary: employee.base_salary || 0,
      salary_type: employee.salary_type || "monthly",
      role: normalizedRole,
      linkedin_url: employee.linkedin_url || "",
      facebook_url: employee.facebook_url || "",
      instagram_username: employee.instagram_username || "",
    });
    setDialogOpen(true);
  };

  const handleOpenDialog = () => {
    setEditingEmployee(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8" />
              <h1 className="text-3xl font-bold">Empleados</h1>
            </div>
          </div>
          <div className="animate-pulse bg-muted h-96 rounded-lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <Users className="h-6 w-6 md:h-8 md:w-8" />
          <h1 className="text-2xl md:text-3xl font-bold">Empleados</h1>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-4 md:space-y-6">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="list" className="flex-1 min-w-[100px] text-xs sm:text-sm">
              <Users className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Empleados</span>
            </TabsTrigger>
            <TabsTrigger value="work" className="flex-1 min-w-[80px] text-xs sm:text-sm">
              <Briefcase className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Trabajo</span>
            </TabsTrigger>
            {showMyTime && (
              <TabsTrigger value="my-time" className="flex-1 min-w-[100px] text-xs sm:text-sm">
                <Clock className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Mi Horario</span>
              </TabsTrigger>
            )}
            {canViewAllTimeTracking && (
              <TabsTrigger value="all-times" className="flex-1 min-w-[100px] text-xs sm:text-sm">
                <Clock className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Horarios</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="permissions" className="flex-1 min-w-[80px] text-xs sm:text-sm">
                <Shield className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Permisos</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="list">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Gestion de Empleados</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Administra la informacion de tus empleados
                    </CardDescription>
                  </div>
                  {canCreate && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={handleOpenDialog} size="sm" className="w-full sm:w-auto">
                          <Plus className="mr-2 h-4 w-4" />
                          <span className="sm:inline">Nuevo Empleado</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {editingEmployee ? "Editar Empleado" : "Nuevo Empleado"}
                          </DialogTitle>
                          <DialogDescription>
                            {editingEmployee
                              ? "Modifica los datos del empleado"
                              : "Completa los datos del nuevo empleado"}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="first_name">Nombre *</Label>
                            <Input
                              id="first_name"
                              value={formData.first_name}
                              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                              placeholder="Juan"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="last_name">Apellido *</Label>
                            <Input
                              id="last_name"
                              value={formData.last_name}
                              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                              placeholder="Perez"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="document_type">Tipo Documento</Label>
                            <Select
                              value={formData.document_type}
                              onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DNI">DNI</SelectItem>
                                <SelectItem value="CUIL">CUIL</SelectItem>
                                <SelectItem value="CUIT">CUIT</SelectItem>
                                <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="document_number">Numero Documento</Label>
                            <Input
                              id="document_number"
                              value={formData.document_number}
                              onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                              placeholder="12345678"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              placeholder="juan@empresa.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Telefono</Label>
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder="+54 11 1234-5678"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="hire_date">Fecha de Ingreso *</Label>
                            <Input
                              id="hire_date"
                              type="date"
                              value={formData.hire_date}
                              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                            />
                          </div>
                          {canManageEmployees && (
                            <div className="space-y-2">
                              <Label htmlFor="salary_type">Tipo de Salario</Label>
                              <Select
                                value={formData.salary_type}
                                onValueChange={(value) => setFormData({ ...formData, salary_type: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="monthly">Mensual</SelectItem>
                                  <SelectItem value="hourly">Por hora</SelectItem>
                                  <SelectItem value="daily">Diario</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-2 col-span-2">
                            <Label htmlFor="role">Rol en el Sistema *</Label>
                            <Select
                              value={formData.role}
                              onValueChange={(value) => setFormData({ ...formData, role: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="employee">Empleado - Solo ver horarios y datos basicos</SelectItem>
                                <SelectItem value="cashier">Cajero - POS, ventas y cobros</SelectItem>
                                <SelectItem value="warehouse">Deposito - Inventario y compras</SelectItem>
                                <SelectItem value="technician">Tecnico - Servicios tecnicos</SelectItem>
                                <SelectItem value="accountant">Contador - Reportes y finanzas (solo lectura)</SelectItem>
                                <SelectItem value="viewer">Visualizador - Solo lectura general</SelectItem>
                                <SelectItem value="auditor">Auditor - Ver todo y exportar</SelectItem>
                                <SelectItem value="manager">Gerente - Gestion completa sin eliminar</SelectItem>
                                {isAdmin && <SelectItem value="admin">Administrador - Acceso total</SelectItem>}
                              </SelectContent>
                            </Select>
                          </div>
                          {canManageEmployees && (
                            <div className="space-y-2 col-span-2">
                              <Label htmlFor="base_salary">Salario Base</Label>
                              <Input
                                id="base_salary"
                                type="number"
                                value={formData.base_salary || ""}
                                onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })}
                                placeholder="100000"
                              />
                            </div>
                          )}

                          <div className="col-span-2 border-t border-border pt-4 mt-2">
                            <h3 className="text-sm font-semibold mb-4">Redes Sociales (Opcional)</h3>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                              <Linkedin className="h-4 w-4 text-blue-700" />
                              LinkedIn
                            </Label>
                            <Input
                              id="linkedin_url"
                              value={formData.linkedin_url || ""}
                              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                              placeholder="https://linkedin.com/in/usuario"
                              type="url"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="facebook_url" className="flex items-center gap-2">
                              <Facebook className="h-4 w-4 text-blue-600" />
                              Facebook
                            </Label>
                            <Input
                              id="facebook_url"
                              value={formData.facebook_url || ""}
                              onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                              placeholder="https://facebook.com/usuario"
                              type="url"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="instagram_username" className="flex items-center gap-2">
                              <Instagram className="h-4 w-4 text-pink-600" />
                              Instagram
                            </Label>
                            <Input
                              id="instagram_username"
                              value={formData.instagram_username || ""}
                              onChange={(e) => setFormData({ ...formData, instagram_username: e.target.value })}
                              placeholder="@usuario"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                          >
                            {createMutation.isPending || updateMutation.isPending
                              ? "Guardando..."
                              : editingEmployee
                                ? "Actualizar"
                                : "Crear Empleado"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto p-2 sm:p-6">
                {employees && employees.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell">Documento</TableHead>
                        <TableHead className="hidden md:table-cell">Rol</TableHead>
                        <TableHead className="hidden lg:table-cell">Ingreso</TableHead>
                        {!isEmployee && <TableHead className="hidden md:table-cell">Salario</TableHead>}
                        <TableHead className="hidden xl:table-cell">Redes</TableHead>
                        <TableHead>Estado</TableHead>
                        {(canEdit || canDelete) && <TableHead>Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              <span>{employee.first_name} {employee.last_name}</span>
                              {employee.email && (
                                <span className="text-xs text-muted-foreground">{employee.email}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                            {employee.document_type} {employee.document_number}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                            {employee.role === "admin" ? "Administrador" :
                             employee.role === "manager" ? "Gerente" :
                             employee.role === "cashier" ? "Cajero" :
                             employee.role === "warehouse" ? "Deposito" :
                             employee.role === "technician" ? "Tecnico" :
                             employee.role === "accountant" ? "Contador" :
                             employee.role === "employee" ? "Empleado" :
                             employee.role === "viewer" ? "Visualizador" :
                             employee.role === "auditor" ? "Auditor" : "-"}

                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs sm:text-sm">
                            {employee.hire_date
                              ? format(new Date(employee.hire_date), "dd/MM/yyyy", { locale: es })
                              : "-"}
                          </TableCell>
                          {!isEmployee && (
                            <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                              ${employee.base_salary?.toLocaleString() || 0}
                            </TableCell>
                          )}
                          <TableCell className="hidden xl:table-cell">
                            <div className="flex gap-2">
                              {employee.linkedin_url && (
                                <a
                                  href={employee.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:opacity-70 transition-opacity"
                                  title="LinkedIn"
                                >
                                  <Linkedin className="h-4 w-4 text-blue-700" />
                                </a>
                              )}
                              {employee.facebook_url && (
                                <a
                                  href={employee.facebook_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:opacity-70 transition-opacity"
                                  title="Facebook"
                                >
                                  <Facebook className="h-4 w-4 text-blue-600" />
                                </a>
                              )}
                              {employee.instagram_username && (
                                <a
                                  href={`https://instagram.com/${employee.instagram_username.replace("@", "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:opacity-70 transition-opacity"
                                  title="Instagram"
                                >
                                  <Instagram className="h-4 w-4 text-pink-600" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={employee.active ? "default" : "secondary"}>
                              {employee.active ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          {(canEdit || canDelete) && (
                            <TableCell>
                              <div className="flex gap-2">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(employee)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      title="Desactivar acceso (soft delete)"
                                      onClick={() => {
                                        setEmployeeToDelete(employee);
                                        setDeleteConfirmOpen(true);
                                      }}
                                    >
                                      <EyeOff className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEmployeeToDelete(employee);
                                        setDeleteConfirmOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay empleados registrados</h3>
                    <p className="text-muted-foreground mb-4">
                      Comienza agregando el primer empleado a tu empresa
                    </p>
                    {canCreate && (
                      <Button onClick={handleOpenDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Primer Empleado
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            {canManageRoles && (
              <div className="mt-4 md:mt-6">
                <EmployeeRoleAssignment />
              </div>
            )}
          </TabsContent>

          <TabsContent value="work">
            <EmployeeWorkLog />
          </TabsContent>

          {showMyTime && (
            <TabsContent value="my-time">
              <EmployeeSelfTimeTracking />
            </TabsContent>
          )}

          {canViewAllTimeTracking && (
            <TabsContent value="all-times">
              <EmployeeTimeTracking />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="permissions">
              <EmployeePermissionsManager />
            </TabsContent>
          )}
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <AlertDialogTitle>¿Qué deseas hacer con este empleado?</AlertDialogTitle>
              </div>
            </AlertDialogHeader>
            <AlertDialogDescription className="space-y-4">
              <div>
                <p className="font-semibold text-foreground mb-2">
                  {employeeToDelete?.first_name} {employeeToDelete?.last_name}
                </p>
                <p className="text-sm">Elige una de las siguientes opciones:</p>
              </div>
            </AlertDialogDescription>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <Button
                variant="outline"
                onClick={() => {
                  if (employeeToDelete) {
                    deactivateMutation.mutate(employeeToDelete);
                  }
                }}
                disabled={deactivateMutation.isPending}
                className="gap-2"
              >
                <EyeOff className="h-4 w-4" />
                Desactivar
              </Button>
              <AlertDialogAction
                onClick={() => {
                  if (employeeToDelete) {
                    deleteMutation.mutate(employeeToDelete);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar Permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
            <div className="bg-destructive/10 p-3 rounded-md text-sm space-y-2 border border-destructive/20">
              <div className="flex gap-2">
                <HelpCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive mb-1">Diferencia importante:</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li><strong>Desactivar:</strong> Revoca acceso pero mantiene datos históricos</li>
                    <li><strong>Eliminar:</strong> Borra permanentemente (sin recuperación)</li>
                  </ul>
                </div>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Employees;
