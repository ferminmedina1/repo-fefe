import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Briefcase, Plus, Filter, X } from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { ContributionHeatmap } from "./ContributionHeatmap";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-700 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completado",
  cancelled: "Cancelado",
};

interface WorkLog {
  id: string;
  employee_id: string;
  task_title: string;
  task_description?: string;
  task_date: string;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  status: "pending" | "completed" | "cancelled";
  category?: string;
  notes?: string;
  created_at: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface EmployeeWorkLogProps {
  preselectedEmployeeId?: string | null;
}

export function EmployeeWorkLog({ preselectedEmployeeId }: EmployeeWorkLogProps) {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const workLogsRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedFromHeatmap, setSelectedFromHeatmap] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: "",
    task_title: "",
    task_description: "",
    task_date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    duration_hours: "",
    category: "",
    notes: "",
    status: "pending" as const,
  });

  // Auto-select employee when preselectedEmployeeId changes
  useEffect(() => {
    if (preselectedEmployeeId) {
      setSelectedEmployees(new Set([preselectedEmployeeId]));
    }
  }, [preselectedEmployeeId]);

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-work-logs", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email")
        .eq("company_id", currentCompany.id)
        .eq("active", true)
        .order("first_name");

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch work logs
  const { data: workLogs = [], isLoading } = useQuery({
    queryKey: ["work-logs", currentCompany?.id, filterDate],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const supabaseClient = supabase as any;
      const { data, error } = await supabaseClient
        .from("work_logs")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("task_date", filterDate)
        .order("task_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WorkLog[];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch work logs for last year (for contribution heatmap)
  const { data: yearlyWorkLogs = [] } = useQuery({
    queryKey: ["work-logs-yearly", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const oneYearAgo = subDays(new Date(), 365);
      const supabaseClient = supabase as any;
      const { data, error } = await supabaseClient
        .from("work_logs")
        .select("task_date, status, employee_id")
        .eq("company_id", currentCompany.id)
        .eq("status", "completed")
        .gte("task_date", format(oneYearAgo, 'yyyy-MM-dd'))
        .order("task_date", { ascending: true });

      if (error) throw error;
      return (data || []).map((item: any) => ({
        task_date: item?.task_date,
        status: item?.status,
        employee_id: item?.employee_id
      })) as Array<{ task_date: string; status: string; employee_id: string }>;
    },
    enabled: !!currentCompany?.id,
    refetchInterval: 5000, // Actualizar cada 5 segundos para cambios en tiempo real
  });

  // Calculate contribution data for heatmap - filtered by selected employees
  const contributionData = useMemo(() => {
    if (!Array.isArray(yearlyWorkLogs) || yearlyWorkLogs.length === 0) return [];
    
    // If no employees selected, show data from all employees
    // If employees selected, filter by selected employees
    const logsToUse = selectedEmployees.size === 0 
      ? yearlyWorkLogs 
      : yearlyWorkLogs.filter((log: any) => selectedEmployees.has(log.employee_id));
    
    const dateMap = new Map<string, number>();
    logsToUse.forEach((log: any) => {
      if (log && log.task_date) {
        dateMap.set(log.task_date, (dateMap.get(log.task_date) || 0) + 1);
      }
    });
    return Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));
  }, [yearlyWorkLogs, selectedEmployees]);

  // Filter logs by selected employees
  const filteredLogs = useMemo(() => {
    if (selectedEmployees.size === 0) return workLogs;
    return workLogs.filter((log) => selectedEmployees.has(log.employee_id));
  }, [workLogs, selectedEmployees]);

  // Create work log
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!currentCompany?.id) throw new Error("No hay empresa seleccionada");
      if (!data.employee_id) throw new Error("Debe seleccionar un empleado");
      if (!data.task_title) throw new Error("El título de la tarea es requerido");

      let durationHours: number | null = null;
      if (data.start_time && data.end_time) {
        const [startH, startM] = data.start_time.split(":").map(Number);
        const [endH, endM] = data.end_time.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        durationHours = Math.max(0, endMinutes - startMinutes) / 60;
      } else if (data.duration_hours) {
        durationHours = parseFloat(data.duration_hours);
      }

      const supabaseClient = supabase as any;
      const { error } = await supabaseClient
        .from("work_logs")
        .insert({
          company_id: currentCompany.id,
          employee_id: data.employee_id,
          task_title: data.task_title,
          task_description: data.task_description || null,
          task_date: data.task_date,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          duration_hours: durationHours,
          category: data.category || null,
          notes: data.notes || null,
          status: data.status,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-logs", currentCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ["work-logs-yearly", currentCompany?.id] });
      toast.success("Tarea registrada correctamente");
      setDialogOpen(false);
      setFormData({
        employee_id: "",
        task_title: "",
        task_description: "",
        task_date: new Date().toISOString().split("T")[0],
        start_time: "",
        end_time: "",
        duration_hours: "",
        category: "",
        notes: "",
        status: "pending",
      });
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    },
  });

  // Update work log status
  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const supabaseClient = supabase as any;
      const { error } = await supabaseClient
        .from("work_logs")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-logs", currentCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ["work-logs-yearly", currentCompany?.id] });
      toast.success("Estado actualizado");
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    },
  });

  const toggleEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const toggleAllEmployees = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map((e) => e.id)));
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? `${emp.first_name} ${emp.last_name}` : "Desconocido";
  };

  // Handle click on heatmap day
  const handleDayClick = (date: string, count: number) => {
    setFilterDate(date);
    setSelectedFromHeatmap(true);
    // Scroll to work logs section after a short delay to ensure render
    setTimeout(() => {
      if (workLogsRef.current) {
        workLogsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Clear heatmap filter
  const clearHeatmapFilter = () => {
    setSelectedFromHeatmap(false);
    setFilterDate(new Date().toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6">
      {/* Contribution Heatmap - Yearly Activity */}
      <ContributionHeatmap 
        data={contributionData} 
        title="Actividad del Último Año"
        onDayClick={handleDayClick}
      />

      {/* Employees Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Seleccionar Empleados</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2 pb-3 border-b">
              <Checkbox
                id="select-all"
                checked={selectedEmployees.size === employees.length && employees.length > 0}
                onCheckedChange={() => toggleAllEmployees()}
              />
              <Label htmlFor="select-all" className="font-semibold cursor-pointer">
                Seleccionar todos ({selectedEmployees.size}/{employees.length})
              </Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {employees.map((employee) => (
                <div key={employee.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={employee.id}
                    checked={selectedEmployees.has(employee.id)}
                    onCheckedChange={() => toggleEmployee(employee.id)}
                  />
                  <Label
                    htmlFor={employee.id}
                    className="cursor-pointer text-sm"
                  >
                    {employee.first_name} {employee.last_name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Logs */}
      <Card ref={workLogsRef}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              <div>
                <CardTitle>Registros de Trabajo</CardTitle>
                <CardDescription>
                  {selectedEmployees.size > 0
                    ? `Mostrando ${filteredLogs.length} tareas de ${selectedEmployees.size} empleado(s)`
                    : `Total: ${workLogs.length} tareas`}
                </CardDescription>
                {selectedFromHeatmap && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                      📊 Filtrado desde gráfico: {format(new Date(filterDate), 'dd/MM/yyyy', { locale: es })}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHeatmapFilter}
                      className="h-5 w-5 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full sm:w-auto"
              />
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Tarea
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Registrar Nueva Tarea</DialogTitle>
                    <DialogDescription>
                      Completa los datos de la tarea realizada
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="employee">Empleado *</Label>
                        <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar empleado" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.first_name} {emp.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="task_title">Título de la Tarea *</Label>
                        <Input
                          id="task_title"
                          value={formData.task_title}
                          onChange={(e) => setFormData({ ...formData, task_title: e.target.value })}
                          placeholder="Ej: Reparación de equipo, Instalación, etc."
                        />
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="task_description">Descripción</Label>
                        <Textarea
                          id="task_description"
                          value={formData.task_description}
                          onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                          placeholder="Detalles de la tarea realizada"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="task_date">Fecha *</Label>
                        <Input
                          id="task_date"
                          type="date"
                          value={formData.task_date}
                          onChange={(e) => setFormData({ ...formData, task_date: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Categoría</Label>
                        <Input
                          id="category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          placeholder="Ej: Mantenimiento, Instalación"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="start_time">Hora Inicio</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end_time">Hora Fin</Label>
                        <Input
                          id="end_time"
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="duration">Duración (horas)</Label>
                        <Input
                          id="duration"
                          type="number"
                          step="0.5"
                          value={formData.duration_hours}
                          onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                          placeholder="Ej: 2.5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Estado</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="completed">Completado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="notes">Notas Adicionales</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Observaciones o comentarios"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => createMutation.mutate(formData)}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "Guardando..." : "Registrar Tarea"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay tareas registradas</h3>
              <p className="text-muted-foreground mb-4">
                {selectedEmployees.size > 0
                  ? "No hay tareas para los empleados seleccionados en esta fecha"
                  : "Selecciona empleados o crea una nueva tarea"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Tarea</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="hidden md:table-cell">Duración</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{getEmployeeName(log.employee_id)}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.task_date), "dd/MM/yyyy", { locale: es })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{log.task_title}</span>
                          {log.task_description && (
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {log.task_description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{log.category || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {log.duration_hours ? `${log.duration_hours.toFixed(1)}h` : "-"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={log.status}
                          onValueChange={(newStatus) =>
                            updateMutation.mutate({ id: log.id, status: newStatus })
                          }
                          disabled={updateMutation.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              <Badge className={STATUS_COLORS.pending}>
                                {STATUS_LABELS.pending}
                              </Badge>
                            </SelectItem>
                            <SelectItem value="completed">
                              <Badge className={STATUS_COLORS.completed}>
                                {STATUS_LABELS.completed}
                              </Badge>
                            </SelectItem>
                            <SelectItem value="cancelled">
                              <Badge className={STATUS_COLORS.cancelled}>
                                {STATUS_LABELS.cancelled}
                              </Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[log.status] || ""}>
                          {STATUS_LABELS[log.status] || log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
