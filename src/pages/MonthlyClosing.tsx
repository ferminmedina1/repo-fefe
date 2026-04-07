import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Calendar as CalendarIcon, Download, FileText, ShoppingCart, Receipt, CheckCircle2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Step = {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  component: React.ComponentType;
};

// MC-002 + MC-006: sanitiza valores para CSV
// - previene formula injection (=, +, -, @, TAB, CR al inicio)
// - envuelve en comillas si contiene comas, comillas o saltos de línea
const escapeCsvValue = (value: string | number | null | undefined): string => {
  const str = value === null || value === undefined ? "" : String(value);
  const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n")) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
};

const MonthlyClosing = () => {
  const { currentCompany } = useCompany();

  // MC-001: verificación de autorización
  const { isAdmin, isManager } = usePermissions();

  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(1);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // MC-005: resetear progreso al cambiar de mes — evita cierre "fantasma"
  useEffect(() => {
    setCompletedSteps(new Set());
    setCurrentStep(1);
  }, [selectedMonth]);

  // MC-003: join con customers para nombre real en CSV
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["monthly-sales", currentCompany?.id, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, created_at, sale_number, customer_id, subtotal, tax, total, payment_method, sale_items(*), customers:customer_id(name)")
        .eq("company_id", currentCompany?.id)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // MC-003: join con suppliers para nombre real en CSV
  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ["monthly-purchases", currentCompany?.id, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, created_at, purchase_number, supplier_id, subtotal, tax, total, purchase_items(*), suppliers:supplier_id(name)")
        .eq("company_id", currentCompany?.id)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const { data: expensesData } = useQuery({
    queryKey: ["monthly-expenses", currentCompany?.id, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, created_at, expense_number, description, category_id, amount, payment_method")
        .eq("company_id", currentCompany?.id)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const { data: cashMovementsData } = useQuery({
    queryKey: ["monthly-cash", currentCompany?.id, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_movements")
        .select("id, created_at, type, category, description, amount")
        .eq("company_id", currentCompany?.id)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // MC-007: liberar blob URL tras la descarga para evitar memory leak
  const downloadCSV = (filename: string, data: string) => {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadIVASales = () => {
    if (!salesData) return;
    const csv = [
      ["Fecha", "Número", "Cliente", "Subtotal", "IVA", "Total"].join(","),
      ...salesData.map(sale => [
        escapeCsvValue(sale.created_at ? format(new Date(sale.created_at), "dd/MM/yyyy") : "-"),
        escapeCsvValue(sale.sale_number),
        escapeCsvValue((sale.customers as any)?.name || sale.customer_id), // MC-003
        escapeCsvValue((sale.subtotal ?? 0).toFixed(2)),                   // MC-008
        escapeCsvValue((sale.tax ?? 0).toFixed(2)),
        escapeCsvValue((sale.total ?? 0).toFixed(2)),
      ].join(","))
    ].join("\n");
    downloadCSV(`libro-iva-ventas-${format(selectedMonth, "yyyy-MM")}.csv`, csv);
    toast.success("Libro IVA Ventas descargado");
  };

  const downloadIVAPurchases = () => {
    if (!purchasesData) return;
    const csv = [
      ["Fecha", "Número", "Proveedor", "Subtotal", "IVA", "Total"].join(","),
      ...purchasesData.map(purchase => [
        escapeCsvValue(purchase.created_at ? format(new Date(purchase.created_at), "dd/MM/yyyy") : "-"),
        escapeCsvValue(purchase.purchase_number),
        escapeCsvValue((purchase.suppliers as any)?.name || purchase.supplier_id), // MC-003
        escapeCsvValue((purchase.subtotal ?? 0).toFixed(2)),                       // MC-008
        escapeCsvValue((purchase.tax ?? 0).toFixed(2)),
        escapeCsvValue((purchase.total ?? 0).toFixed(2)),
      ].join(","))
    ].join("\n");
    downloadCSV(`libro-iva-compras-${format(selectedMonth, "yyyy-MM")}.csv`, csv);
    toast.success("Libro IVA Compras descargado");
  };

  const downloadMonthlySummary = () => {
    const csv = [
      ["Concepto", "Cantidad", "Monto"].join(","),
      [escapeCsvValue("Ventas"), salesData?.length || 0, escapeCsvValue(totalSales.toFixed(2))].join(","),
      [escapeCsvValue("Compras"), purchasesData?.length || 0, escapeCsvValue(totalPurchases.toFixed(2))].join(","),
      [escapeCsvValue("IVA Débito Fiscal"), "", escapeCsvValue(salesTax.toFixed(2))].join(","),
      [escapeCsvValue("IVA Crédito Fiscal"), "", escapeCsvValue(purchasesTax.toFixed(2))].join(","),
      [escapeCsvValue("IVA a Pagar"), "", escapeCsvValue((salesTax - purchasesTax).toFixed(2))].join(","),
    ].join("\n");
    downloadCSV(`resumen-mensual-${format(selectedMonth, "yyyy-MM")}.csv`, csv);
    toast.success("Resumen mensual descargado");
  };

  const downloadSalesDetail = () => {
    if (!salesData) return;
    const csv = [
      ["Fecha", "Número", "Cliente", "Items", "Subtotal", "IVA", "Total", "Método Pago"].join(","),
      ...salesData.map(sale => [
        escapeCsvValue(sale.created_at ? format(new Date(sale.created_at), "dd/MM/yyyy") : "-"),
        escapeCsvValue(sale.sale_number),
        escapeCsvValue((sale.customers as any)?.name || sale.customer_id),
        sale.sale_items?.length || 0,
        escapeCsvValue((sale.subtotal ?? 0).toFixed(2)),  // MC-008
        escapeCsvValue((sale.tax ?? 0).toFixed(2)),
        escapeCsvValue((sale.total ?? 0).toFixed(2)),
        escapeCsvValue(sale.payment_method),
      ].join(","))
    ].join("\n");
    downloadCSV(`detalle-ventas-${format(selectedMonth, "yyyy-MM")}.csv`, csv);
    toast.success("Detalle de ventas descargado");
  };

  const downloadPurchasesDetail = () => {
    if (!purchasesData) return;
    const csv = [
      ["Fecha", "Número", "Proveedor", "Items", "Subtotal", "IVA", "Total"].join(","),
      ...purchasesData.map(purchase => [
        escapeCsvValue(purchase.created_at ? format(new Date(purchase.created_at), "dd/MM/yyyy") : "-"),
        escapeCsvValue(purchase.purchase_number),
        escapeCsvValue((purchase.suppliers as any)?.name || purchase.supplier_id),
        purchase.purchase_items?.length || 0,
        escapeCsvValue((purchase.subtotal ?? 0).toFixed(2)),  // MC-008
        escapeCsvValue((purchase.tax ?? 0).toFixed(2)),
        escapeCsvValue((purchase.total ?? 0).toFixed(2)),
      ].join(","))
    ].join("\n");
    downloadCSV(`detalle-compras-${format(selectedMonth, "yyyy-MM")}.csv`, csv);
    toast.success("Detalle de compras descargado");
  };

  const downloadCashMovements = () => {
    if (!cashMovementsData) return;
    const csv = [
      ["Fecha", "Tipo", "Categoría", "Descripción", "Monto"].join(","),
      ...cashMovementsData.map(movement => [
        escapeCsvValue(movement.created_at ? format(new Date(movement.created_at), "dd/MM/yyyy") : "-"),
        escapeCsvValue(movement.type),
        escapeCsvValue(movement.category),
        escapeCsvValue(movement.description || ""),
        escapeCsvValue((movement.amount ?? 0).toFixed(2)),  // MC-008
      ].join(","))
    ].join("\n");
    downloadCSV(`movimientos-caja-${format(selectedMonth, "yyyy-MM")}.csv`, csv);
    toast.success("Movimientos de caja descargados");
  };

  const downloadExpenses = () => {
    if (!expensesData) return;
    const csv = [
      ["Fecha", "Número", "Descripción", "Categoría", "Monto", "Método Pago"].join(","),
      ...expensesData.map(expense => [
        escapeCsvValue(expense.created_at ? format(new Date(expense.created_at), "dd/MM/yyyy") : "-"),
        escapeCsvValue(expense.expense_number),
        escapeCsvValue(expense.description),
        escapeCsvValue(expense.category_id || ""),
        escapeCsvValue((expense.amount ?? 0).toFixed(2)),  // MC-008
        escapeCsvValue(expense.payment_method),
      ].join(","))
    ].join("\n");
    downloadCSV(`gastos-${format(selectedMonth, "yyyy-MM")}.csv`, csv);
    toast.success("Gastos descargados");
  };

  // MC-004: función correcta para cuentas corrientes — agrupa ventas por cliente
  const downloadAccountsReceivable = () => {
    if (!salesData) return;
    const customerMap = new Map<string, { name: string; count: number; total: number }>();
    for (const sale of salesData) {
      const key = sale.customer_id;
      const name = (sale.customers as any)?.name || sale.customer_id;
      const existing = customerMap.get(key) ?? { name, count: 0, total: 0 };
      existing.count += 1;
      existing.total += sale.total ?? 0;
      customerMap.set(key, existing);
    }
    const csv = [
      ["Cliente", "Cantidad de Ventas", "Total Facturado"].join(","),
      ...Array.from(customerMap.values()).map(c => [
        escapeCsvValue(c.name),
        c.count,
        escapeCsvValue(c.total.toFixed(2)),
      ].join(","))
    ].join("\n");
    downloadCSV(`cuentas-corrientes-${format(selectedMonth, "yyyy-MM")}.csv`, csv);
    toast.success("Cuentas corrientes descargadas");
  };

  const toggleStep = (stepId: number) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  // MC-008: null guards en todos los acumuladores
  const totalSales = salesData?.reduce((sum, sale) => sum + (sale.total ?? 0), 0) || 0;
  const totalPurchases = purchasesData?.reduce((sum, purchase) => sum + (purchase.total ?? 0), 0) || 0;
  const salesTax = salesData?.reduce((sum, sale) => sum + (sale.tax ?? 0), 0) || 0;
  const purchasesTax = purchasesData?.reduce((sum, purchase) => sum + (purchase.tax ?? 0), 0) || 0;

  // MC-009: skeleton mientras cargan las stats
  const StatSkeleton = () => <Skeleton className="h-8 w-24 mt-1" />;

  const SalesReviewStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Revisar Ventas del Mes
        </CardTitle>
        <CardDescription>
          Verificar todas las ventas registradas en {format(selectedMonth, "MMMM yyyy", { locale: es })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Total Ventas</div>
            {salesLoading ? <StatSkeleton /> : <div className="text-2xl font-bold">{salesData?.length || 0}</div>}
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Monto Total</div>
            {salesLoading ? <StatSkeleton /> : <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>}
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">IVA Ventas</div>
            {salesLoading ? <StatSkeleton /> : <div className="text-2xl font-bold">${salesTax.toFixed(2)}</div>}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-4">
          <Button variant="outline" onClick={() => window.open('/sales', '_blank')} className="w-full sm:w-auto">
            <FileText className="h-4 w-4 mr-2" />
            Ver Ventas Completas
          </Button>
          <Button
            onClick={() => toggleStep(1)}
            variant={completedSteps.has(1) ? "secondary" : "default"}
            className="w-full sm:w-auto"
          >
            {completedSteps.has(1) ? <><Check className="h-4 w-4 mr-2" />Completado</> : "Marcar como Revisado"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const PurchasesReviewStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Revisar Compras del Mes
        </CardTitle>
        <CardDescription>
          Verificar todas las compras registradas en {format(selectedMonth, "MMMM yyyy", { locale: es })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Total Compras</div>
            {purchasesLoading ? <StatSkeleton /> : <div className="text-2xl font-bold">{purchasesData?.length || 0}</div>}
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Monto Total</div>
            {purchasesLoading ? <StatSkeleton /> : <div className="text-2xl font-bold">${totalPurchases.toFixed(2)}</div>}
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">IVA Compras</div>
            {purchasesLoading ? <StatSkeleton /> : <div className="text-2xl font-bold">${purchasesTax.toFixed(2)}</div>}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-4">
          <Button variant="outline" onClick={() => window.open('/purchases', '_blank')} className="w-full sm:w-auto">
            <FileText className="h-4 w-4 mr-2" />
            Ver Compras Completas
          </Button>
          <Button
            onClick={() => toggleStep(2)}
            variant={completedSteps.has(2) ? "secondary" : "default"}
            className="w-full sm:w-auto"
          >
            {completedSteps.has(2) ? <><Check className="h-4 w-4 mr-2" />Completado</> : "Marcar como Revisado"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const IVABooksStep = () => {
    const netIVA = salesTax - purchasesTax;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Libros de IVA
          </CardTitle>
          <CardDescription>
            Resumen de IVA del período {format(selectedMonth, "MMMM yyyy", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
              <div className="text-sm text-muted-foreground">IVA Débito Fiscal (Ventas)</div>
              {salesLoading ? <StatSkeleton /> : (
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">${salesTax.toFixed(2)}</div>
              )}
            </div>
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="text-sm text-muted-foreground">IVA Crédito Fiscal (Compras)</div>
              {purchasesLoading ? <StatSkeleton /> : (
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">${purchasesTax.toFixed(2)}</div>
              )}
            </div>
          </div>
          <Separator />
          <div className="p-4 border-2 rounded-lg bg-primary/5">
            <div className="text-sm text-muted-foreground">IVA a Pagar / (Saldo a Favor)</div>
            {salesLoading || purchasesLoading ? <StatSkeleton /> : (
              <div className={cn("text-3xl font-bold", netIVA >= 0 ? "text-red-600" : "text-green-600")}>
                ${Math.abs(netIVA).toFixed(2)}
                {netIVA < 0 && " (Saldo a favor)"}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-4">
            <Button variant="outline" onClick={downloadIVASales} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Descargar Libro IVA Ventas
            </Button>
            <Button variant="outline" onClick={downloadIVAPurchases} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Descargar Libro IVA Compras
            </Button>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => toggleStep(3)} variant={completedSteps.has(3) ? "secondary" : "default"}>
              {completedSteps.has(3) ? <><Check className="h-4 w-4 mr-2" />Completado</> : "Marcar como Generado"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ReportsStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Reportes para Contador
        </CardTitle>
        <CardDescription>
          Descarga todos los reportes necesarios para el cierre contable
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={downloadMonthlySummary}>
            <Download className="h-4 w-4 mr-2" />
            Resumen Mensual Completo
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={downloadSalesDetail}>
            <Download className="h-4 w-4 mr-2" />
            Detalle de Ventas
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={downloadPurchasesDetail}>
            <Download className="h-4 w-4 mr-2" />
            Detalle de Compras
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={downloadCashMovements}>
            <Download className="h-4 w-4 mr-2" />
            Movimientos de Caja
          </Button>
          {/* MC-004: handler correcto — ya no llama a downloadSalesDetail */}
          <Button variant="outline" className="w-full justify-start" onClick={downloadAccountsReceivable}>
            <Download className="h-4 w-4 mr-2" />
            Cuentas Corrientes Clientes
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={downloadExpenses}>
            <Download className="h-4 w-4 mr-2" />
            Gastos del Período
          </Button>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={() => toggleStep(4)} variant={completedSteps.has(4) ? "secondary" : "default"}>
            {completedSteps.has(4) ? <><Check className="h-4 w-4 mr-2" />Completado</> : "Marcar como Descargado"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const steps: Step[] = [
    { id: 1, title: "Revisar Ventas", description: "Verificar ventas del período", icon: Receipt, component: SalesReviewStep },
    { id: 2, title: "Revisar Compras", description: "Verificar compras del período", icon: ShoppingCart, component: PurchasesReviewStep },
    { id: 3, title: "Libros de IVA", description: "Generar libros de IVA", icon: FileText, component: IVABooksStep },
    { id: 4, title: "Reportes Contador", description: "Descargar reportes", icon: Download, component: ReportsStep },
  ];

  const progress = (completedSteps.size / steps.length) * 100;
  const CurrentStepComponent = steps[currentStep - 1].component;

  // MC-001: guard de autorización — solo admin y manager
  if (!isAdmin && !isManager) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertDescription>
            No tienes permisos para acceder al cierre mensual. Solo administradores y gerentes pueden acceder.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Cierre Mensual</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Proceso de cierre contable
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedMonth, "MMMM yyyy", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedMonth}
                onSelect={(date) => date && setSelectedMonth(date)}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Progreso del Cierre</CardTitle>
                <CardDescription>
                  {completedSteps.size} de {steps.length} pasos completados
                </CardDescription>
              </div>
              {completedSteps.size === steps.length && (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Cierre Completo
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = currentStep === step.id;
            return (
              <Card
                key={step.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  isCurrent && "border-primary shadow-md",
                  isCompleted && "bg-green-50 dark:bg-green-950 border-green-500"
                )}
                onClick={() => setCurrentStep(step.id)}
              >
                <CardHeader className="p-3 md:p-6">
                  <div className="flex items-start justify-between">
                    <Icon className={cn("h-6 w-6 md:h-8 md:w-8", isCompleted ? "text-green-600" : "text-muted-foreground")} />
                    {isCompleted && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm md:text-base">{step.title}</CardTitle>
                  <CardDescription className="text-xs hidden sm:block">{step.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <CurrentStepComponent />

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            Anterior
          </Button>
          <Button
            onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
            disabled={currentStep === steps.length}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default MonthlyClosing;
