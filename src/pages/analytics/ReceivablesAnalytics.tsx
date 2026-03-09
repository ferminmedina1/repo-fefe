import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft, DollarSign, AlertTriangle, Clock, TrendingDown,
  Eye, CreditCard, Bell, Mail, MessageCircle, Download, Search,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);

function daysBadge(daysOverdue: number) {
  if (daysOverdue <= 0) return null;
  const cls =
    daysOverdue > 30 ? "bg-red-100 text-red-700 border-red-200"
    : daysOverdue > 7 ? "bg-orange-100 text-orange-700 border-orange-200"
    : "bg-yellow-100 text-yellow-700 border-yellow-200";
  return (
    <Badge variant="outline" className={`text-xs ${cls}`}>
      {daysOverdue}d vencida
    </Badge>
  );
}

const PAGE_SIZE = 20;

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "tarjeta_debito", label: "Tarjeta débito" },
  { value: "tarjeta_credito", label: "Tarjeta crédito" },
];

type EnrichedMovement = {
  id: string;
  debit_amount: unknown;
  credit_amount: unknown;
  status: string;
  due_date: string | null;
  created_at: string;
  customer_id: string;
  customers: unknown;
  daysOverdue: number;
  amount: number;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
};

export default function ReceivablesAnalytics() {
  const { currentCompany } = useCompany();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canView = hasPermission("sales", "view");

  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [customerFilter, setCustomerFilter] = useState("");
  const [page, setPage] = useState(0);
  const [payingMovement, setPayingMovement] = useState<EnrichedMovement | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [reminderMovement, setReminderMovement] = useState<EnrichedMovement | null>(null);

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["analytics-receivables", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_account_movements")
        .select("id, debit_amount, credit_amount, status, due_date, created_at, customer_id, customers(name, phone, email)")
        .eq("company_id", currentCompany!.id)
        .eq("movement_type", "sale")
        .in("status", ["pending", "partial"])
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: canView && !!currentCompany?.id,
    staleTime: 2 * 60 * 1000,
  });

  const today = new Date();

  const enriched: EnrichedMovement[] = useMemo(
    () =>
      movements.map((m) => ({
        ...m,
        daysOverdue: m.due_date ? differenceInDays(today, new Date(m.due_date)) : 0,
        amount: Number(m.debit_amount) - Number(m.credit_amount ?? 0),
        customerName: (m.customers as any)?.name ?? "Sin nombre",
        customerPhone: (m.customers as any)?.phone ?? null,
        customerEmail: (m.customers as any)?.email ?? null,
      })),
    [movements]
  );

  const filtered = useMemo(() => {
    let r = onlyOverdue ? enriched.filter(m => m.daysOverdue > 0) : enriched;
    if (customerFilter.trim()) {
      const q = customerFilter.toLowerCase();
      r = r.filter(m => m.customerName.toLowerCase().includes(q));
    }
    return r;
  }, [enriched, onlyOverdue, customerFilter]);

  useEffect(() => { setPage(0); }, [onlyOverdue, customerFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const kpis = useMemo(() => {
    const total = enriched.reduce((acc, m) => acc + m.amount, 0);
    const overdue = enriched.filter(m => m.daysOverdue > 0).reduce((acc, m) => acc + m.amount, 0);
    const pct = total > 0 ? (overdue / total) * 100 : 0;
    const overdueItems = enriched.filter(m => m.daysOverdue > 0);
    const avgDays =
      overdueItems.length > 0
        ? overdueItems.reduce((acc, m) => acc + m.daysOverdue, 0) / overdueItems.length
        : 0;
    return { total, overdue, pct, count: enriched.length, overdueCount: overdueItems.length, avgDays };
  }, [enriched]);

  function exportCSV() {
    const rows = filtered.map(m => [
      `"${m.customerName}"`,
      `"${m.created_at ? format(new Date(m.created_at), "dd/MM/yyyy") : "-"}"`,
      `"${m.due_date ? format(new Date(m.due_date), "dd/MM/yyyy") : "-"}"`,
      m.daysOverdue > 0 ? m.daysOverdue : 0,
      `"${m.status}"`,
      m.amount,
    ].join(","));
    const csv = ["Cliente,Emision,Vencimiento,Dias vencido,Estado,Monto", ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuentas-por-cobrar-${format(today, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const payMutation = useMutation({
    mutationFn: async (m: EnrichedMovement) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).rpc("create_customer_payment", {
        p_customer_id: m.customer_id,
        p_amount: m.amount,
        p_payment_method: paymentMethod,
        p_notes: paymentNotes || null,
        p_user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-receivables"] });
      setPayingMovement(null);
      setPaymentNotes("");
      setPaymentMethod("efectivo");
    },
  });

  function buildReminderText(m: EnrichedMovement) {
    const venc = m.due_date
      ? ` con vencimiento el ${format(new Date(m.due_date), "dd/MM/yyyy", { locale: es })}`
      : "";
    return `Estimado/a ${m.customerName},\n\nLe recordamos que tiene un saldo pendiente de ${formatCurrency(m.amount)}${venc}.\n\nQuedamos a su disposición para coordinar el pago.\n\nSaludos.`;
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Por Cobrar</h1>
            <p className="text-sm text-muted-foreground">Cuentas corrientes pendientes y vencidas</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total por cobrar",
              value: formatCurrency(kpis.total),
              icon: DollarSign,
              color: "blue",
              sub: `${kpis.count} movimientos`,
            },
            {
              label: "Total vencido",
              value: formatCurrency(kpis.overdue),
              icon: AlertTriangle,
              color: kpis.overdue > 0 ? "red" : "green",
              sub: `${kpis.overdueCount} movimientos`,
            },
            {
              label: "% vencido",
              value: `${kpis.pct.toFixed(1)}%`,
              icon: TrendingDown,
              color: kpis.pct > 50 ? "red" : kpis.pct > 20 ? "orange" : "green",
            },
            {
              label: "Días prom. vencido",
              value: kpis.avgDays > 0 ? `${Math.round(kpis.avgDays)}d` : "-",
              icon: Clock,
              color: "purple",
              sub: "sobre facturas vencidas",
            },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <Card key={label} className={`border-l-4 border-${color}-500/30`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <div className={`p-1.5 rounded-lg bg-${color}-500/10`}>
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-1">
                {isLoading ? <Skeleton className="h-8 w-28" /> : <p className="text-2xl font-bold">{value}</p>}
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">
              Movimientos pendientes
              <Badge variant="secondary" className="ml-2">{filtered.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por cliente..."
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="pl-8 h-8 text-sm w-44"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={onlyOverdue}
                  onChange={(e) => setOnlyOverdue(e.target.checked)}
                  className="rounded"
                />
                Solo vencidas
              </label>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={exportCSV} disabled={filtered.length === 0}>
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">Cliente</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Emisión</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">Vencimiento</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Estado</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground">Monto</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>{[1, 2, 3, 4, 5, 6].map((j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>)}</tr>
                      ))
                    : paginated.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                            {onlyOverdue ? "No hay facturas vencidas." : customerFilter ? "No hay resultados para ese cliente." : "No hay cuentas pendientes."}
                          </td>
                        </tr>
                      )
                    : paginated.map((m) => (
                        <tr key={m.id} className={`hover:bg-muted/30 ${m.daysOverdue > 0 ? "bg-red-50/30" : ""}`}>
                          <td className="px-4 py-2.5 font-medium">{m.customerName}</td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                            {m.created_at ? format(new Date(m.created_at), "dd/MM/yy", { locale: es }) : "-"}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={m.daysOverdue > 0 ? "text-red-700 font-medium" : ""}>
                                {m.due_date ? format(new Date(m.due_date), "dd/MM/yy", { locale: es }) : "-"}
                              </span>
                              {daysBadge(m.daysOverdue)}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 hidden md:table-cell">
                            <Badge
                              variant="outline"
                              className={`text-xs ${m.status === "partial" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}
                            >
                              {m.status === "partial" ? "Parcial" : "Pendiente"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold">
                            {formatCurrency(m.amount)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7"
                                title="Ver detalle del cliente"
                                onClick={() => navigate("/customer-account", { state: { customerId: m.customer_id } })}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700"
                                title="Marcar como pagada"
                                onClick={() => setPayingMovement(m)}
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:text-blue-700"
                                title="Enviar recordatorio"
                                onClick={() => setReminderMovement(m)}
                              >
                                <Bell className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Página {page + 1} de {totalPages} · {filtered.length} movimientos
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog — Marcar como pagada */}
      <Dialog open={!!payingMovement} onOpenChange={() => setPayingMovement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium">{payingMovement?.customerName}</p>
              <p className="text-muted-foreground">
                Saldo pendiente:{" "}
                <span className="font-semibold text-foreground">{formatCurrency(payingMovement?.amount ?? 0)}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                placeholder="Referencia de pago, número de transferencia..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayingMovement(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => payingMovement && payMutation.mutate(payingMovement)}
                disabled={payMutation.isPending}
              >
                {payMutation.isPending ? "Registrando..." : "Confirmar pago"}
              </Button>
            </div>
            {payMutation.isError && (
              <p className="text-xs text-red-600">Error al registrar el pago. Intentá de nuevo.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Enviar recordatorio */}
      <Dialog open={!!reminderMovement} onOpenChange={() => setReminderMovement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar recordatorio de pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Mensaje</Label>
              <Textarea
                readOnly
                rows={5}
                value={reminderMovement ? buildReminderText(reminderMovement) : ""}
                className="text-sm resize-none"
              />
            </div>
            <div className="flex gap-2">
              {reminderMovement?.customerPhone && (
                <a
                  href={`https://wa.me/${reminderMovement.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(buildReminderText(reminderMovement))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    WhatsApp
                  </Button>
                </a>
              )}
              {reminderMovement?.customerEmail && (
                <a
                  href={`mailto:${reminderMovement.customerEmail}?subject=${encodeURIComponent("Recordatorio de pago")}&body=${encodeURIComponent(buildReminderText(reminderMovement))}`}
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Email
                  </Button>
                </a>
              )}
              {!reminderMovement?.customerPhone && !reminderMovement?.customerEmail && (
                <p className="text-xs text-muted-foreground text-center w-full py-2">
                  Este cliente no tiene teléfono ni email registrado.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
