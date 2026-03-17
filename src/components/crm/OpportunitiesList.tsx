import type { Database } from "@/integrations/supabase/types";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LucideMoreVertical, Pencil, Trash2, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { opportunityService } from "@/domain/crm/services/opportunityService";
import { bulkOperationService } from "@/domain/crm/services/bulkOperationService";
import type { OpportunityDTO } from "@/domain/crm/dtos/opportunity";
import { pipelineService } from "@/domain/crm/services/pipelineService";
import { tagService } from "@/domain/crm/services/tagService";

// --- Helpers ---
function getStageBadgeClass(stage: string) {
  const s = stage.toLowerCase();
  if (s.includes("ganad") || s.includes("won")) return "bg-green-100 text-green-800 border-green-200";
  if (s.includes("perdid") || s.includes("lost")) return "bg-red-100 text-red-800 border-red-200";
  return "";
}

function getStatusBadgeClass(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("ganado") || s === "won") return "bg-green-100 text-green-800 border-green-200";
  if (s.includes("perdido") || s === "lost") return "bg-red-100 text-red-800 border-red-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

function getStatusLabel(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("ganado") || s === "won") return "Ganado";
  if (s.includes("perdido") || s === "lost") return "Perdido";
  return "Abierta";
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);

// --- Column definitions ---
interface ColDef {
  key: string;
  label: string;
  sortKey?: keyof Database["public"]["Tables"]["crm_opportunities"]["Row"];
  alwaysVisible?: boolean;
}

const ALL_COLUMNS: ColDef[] = [
  { key: "name",                 label: "Oportunidad",      sortKey: "name",                 alwaysVisible: true },
  { key: "stage",                label: "Etapa",            sortKey: "stage" },
  { key: "status",               label: "Estado" },
  { key: "value",                label: "Monto",            sortKey: "value" },
  { key: "estimated_close_date", label: "Cierre",           sortKey: "estimated_close_date" },
  { key: "probability",          label: "%",                sortKey: "probability" },
  { key: "score_total",          label: "Score",            sortKey: "score_total" },
  { key: "owner",                label: "Responsable" },
  { key: "tags",                 label: "Tags" },
  { key: "next_step",            label: "Próximo paso" },
  { key: "last_activity_at",     label: "Última actividad", sortKey: "last_activity_at" },
];

const DEFAULT_VISIBLE_KEYS = ["name", "stage", "status", "value", "estimated_close_date", "probability"];

// --- Types ---
type SortableField = keyof Omit<
  Database["public"]["Tables"]["crm_opportunities"]["Row"],
  "closed_at" | "close_date" | "currency" | "expected_revenue" | "lost_reason" | "next_step" | "source" | "status" | "tags" | "won_reason"
>;
type OpportunityRow = Database["public"]["Tables"]["crm_opportunities"]["Row"];

interface OpportunitiesListProps {
  companyId: string;
  search: string;
  filters: {
    pipelineId?: string;
    stageId?: string;
    ownerId?: string;
    status?: string;
    dateRange?: { from: string; to: string };
    value?: { min: number; max: number };
  };
  onCreate?: () => void;
}

type OpportunitiesQueryResult = { data: OpportunityDTO[]; total: number };

// --- Component ---
export function OpportunitiesList({ companyId, search, filters, onCreate }: OpportunitiesListProps) {
  const queryClient = useQueryClient();
  const [editingOpportunity, setEditingOpportunity] = useState<OpportunityRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState("");
  const [bulkOwner, setBulkOwner] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sort, setSort] = useState<{ field: SortableField; direction: "asc" | "desc" }>({
    field: "created_at" as SortableField,
    direction: "desc",
  });

  // Visible columns (persisted per company)
  const STORAGE_KEY = `crm:opp:visibleColumns:${companyId}`;
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_VISIBLE_KEYS;
    } catch {
      return DEFAULT_VISIBLE_KEYS;
    }
  });

  const visibleColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => c.alwaysVisible || visibleColumnKeys.includes(c.key)),
    [visibleColumnKeys]
  );

  const toggleColumn = useCallback(
    (key: string) => {
      setVisibleColumnKeys((prev) => {
        const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [STORAGE_KEY]
  );

  // Persist selection
  useEffect(() => {
    const stored = localStorage.getItem(`crm:oppSelection:${companyId}`);
    if (!stored) return;
    try { setSelectedIds(new Set(JSON.parse(stored) as string[])); } catch { setSelectedIds(new Set()); }
  }, [companyId]);

  useEffect(() => {
    localStorage.setItem(`crm:oppSelection:${companyId}`, JSON.stringify(Array.from(selectedIds)));
  }, [companyId, selectedIds]);

  // Normalized filters
  const normalizedFilters = useMemo(() => {
    const pipelineId = filters.pipelineId?.trim() || undefined;
    const stageId = filters.stageId?.trim() || undefined;
    const ownerId = filters.ownerId?.trim() || undefined;
    const status = filters.status?.trim() || undefined;
    const from = filters.dateRange?.from?.trim() || "";
    const to = filters.dateRange?.to?.trim() || "";
    const dateRange = from && to ? { from, to } : undefined;
    const min = Number.isFinite(filters.value?.min) ? filters.value!.min : undefined;
    const max = Number.isFinite(filters.value?.max) ? filters.value!.max : undefined;
    const value = min != null && max != null ? { min, max } : undefined;
    return { pipelineId, stageId, ownerId, status, dateRange, value };
  }, [
    filters.pipelineId, filters.stageId, filters.ownerId, filters.status,
    filters.dateRange?.from, filters.dateRange?.to, filters.value?.min, filters.value?.max,
  ]);

  const queryKey = useMemo(
    () => [
      "opportunities", companyId, search ?? "",
      normalizedFilters.pipelineId ?? "", normalizedFilters.stageId ?? "",
      normalizedFilters.ownerId ?? "", normalizedFilters.status ?? "",
      normalizedFilters.dateRange?.from ?? "", normalizedFilters.dateRange?.to ?? "",
      normalizedFilters.value?.min ?? "", normalizedFilters.value?.max ?? "",
      sort.field, sort.direction, page, pageSize,
    ] as const,
    [companyId, search, normalizedFilters.pipelineId, normalizedFilters.stageId,
     normalizedFilters.ownerId, normalizedFilters.status,
     normalizedFilters.dateRange?.from, normalizedFilters.dateRange?.to,
     normalizedFilters.value?.min, normalizedFilters.value?.max,
     sort.field, sort.direction, page, pageSize]
  );

  const toOpportunityRow = (dto: OpportunityDTO): OpportunityRow => ({
    id: dto.id, company_id: dto.companyId, name: dto.name, email: dto.email, phone: dto.phone,
    customer_id: dto.customerId, pipeline_id: dto.pipelineId, stage: dto.stage, value: dto.value,
    estimated_close_date: dto.estimatedCloseDate, probability: dto.probability,
    description: dto.description, owner_id: dto.ownerId, status: dto.status ?? "abierta",
    close_date: dto.closeDate, lost_reason: dto.lostReason, won_reason: dto.wonReason,
    source: dto.source, currency: dto.currency, expected_revenue: dto.expectedRevenue,
    next_step: dto.nextStep, last_activity_at: dto.lastActivityAt, sla_due_at: dto.slaDueAt,
    score_total: dto.scoreTotal ?? 0, score_updated_at: dto.scoreUpdatedAt,
    custom_fields: dto.customFields ?? {},
    tags: dto.tags, created_at: dto.createdAt, updated_at: dto.updatedAt, closed_at: null,
  });

  // Queries
  const { data, isLoading, isError, refetch, isFetching } = useQuery<OpportunitiesQueryResult, Error>({
    queryKey,
    queryFn: () => opportunityService.list({ companyId, search, filters: normalizedFilters, sort, page, pageSize }),
    enabled: !!companyId,
    placeholderData: (prev) => prev,
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ["crm-pipelines", companyId],
    queryFn: () => pipelineService.list(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: owners = [] } = useQuery({
    queryKey: ["crm-owners", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees").select("id, first_name, last_name")
        .eq("company_id", companyId).order("first_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["crm-tags", companyId],
    queryFn: () => tagService.list(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const stageOptions = useMemo(() => {
    if (normalizedFilters.pipelineId) {
      const pipeline = pipelines.find((p: any) => p.id === normalizedFilters.pipelineId);
      return pipeline?.stages ?? [];
    }
    return Array.from(new Set(pipelines.flatMap((p: any) => p.stages || [])));
  }, [normalizedFilters.pipelineId, pipelines]);

  // Mutations
  const deleteOpportunityMutation = useMutation({
    mutationFn: (id: string) => opportunityService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities", companyId] });
      toast.success("Oportunidad eliminada");
    },
    onError: () => toast.error("Error al eliminar oportunidad"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      return bulkOperationService.bulkDelete({
        companyId,
        opportunityIds: Array.from(selectedIds),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities", companyId] });
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      toast.success("Oportunidades eliminadas y registradas");
    },
    onError: (e: any) => toast.error(e.message || "Error al eliminar"),
  });

  const bulkEditMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (bulkStage) updates.stage = bulkStage;
      if (bulkOwner) updates.owner_id = bulkOwner;
      if (bulkTag) updates.tags = [bulkTag];

      if (!bulkStage && !bulkOwner && !bulkTag) {
        throw new Error("Seleccioná al menos un cambio");
      }

      // ✅ Usa bulkOperationService que AUTOMÁTICAMENTE registra en activity log
      return bulkOperationService.bulkUpdate({
        companyId,
        opportunityIds: Array.from(selectedIds),
        updates,
        stage: bulkStage || undefined,
        ownerId: bulkOwner || undefined,
        tags: bulkTag ? [bulkTag] : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities", companyId] });
      setSelectedIds(new Set());
      setBulkStage(""); setBulkOwner(""); setBulkTag("");
      setBulkModalOpen(false);
      toast.success("Cambios aplicados y registrados");
    },
    onError: (e: any) => toast.error(e.message || "Error al aplicar cambios"),
  });

  // Sort handler
  const handleSort = (col: ColDef) => {
    if (!col.sortKey) return;
    setSort((s) => ({
      field: col.sortKey as SortableField,
      direction: s.field === col.sortKey && s.direction === "desc" ? "asc" : "desc",
    }));
    setPage(1);
  };

  // Cell renderer
  const renderCell = (opp: OpportunityDTO, key: string) => {
    switch (key) {
      case "name":
        return (
          <button
            type="button"
            className="text-left font-semibold text-sm hover:underline truncate block max-w-[220px]"
            onClick={() => setEditingOpportunity(toOpportunityRow(opp))}
          >
            {opp.name}
          </button>
        );
      case "stage":
        return opp.stage
          ? <Badge variant="secondary" className={getStageBadgeClass(opp.stage)}>{opp.stage}</Badge>
          : <span className="text-muted-foreground">-</span>;
      case "status":
        return (
          <Badge variant="secondary" className={getStatusBadgeClass(opp.status)}>
            {getStatusLabel(opp.status)}
          </Badge>
        );
      case "value":
        return opp.value != null
          ? <span className="font-mono text-sm">{formatCurrency(opp.value)}</span>
          : <span className="text-muted-foreground">-</span>;
      case "estimated_close_date":
        return opp.estimatedCloseDate
          ? <span className="text-sm">{format(new Date(opp.estimatedCloseDate + "T00:00:00"), "dd/MM/yy")}</span>
          : <span className="text-muted-foreground">-</span>;
      case "probability":
        return opp.probability != null
          ? <span className="text-sm">{opp.probability}%</span>
          : <span className="text-muted-foreground">-</span>;
      case "score_total":
        return <span className="font-mono text-sm">{opp.scoreTotal ?? 0}</span>;
      case "owner": {
        const owner = owners.find((o: any) => o.id === opp.ownerId);
        return owner
          ? <span className="text-sm">{`${owner.first_name} ${owner.last_name}`.trim()}</span>
          : <span className="text-muted-foreground">-</span>;
      }
      case "tags":
        return opp.tags?.length
          ? (
            <div className="flex flex-wrap gap-1">
              {opp.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-xs px-1.5">{t}</Badge>
              ))}
            </div>
          )
          : <span className="text-muted-foreground">-</span>;
      case "next_step":
        return opp.nextStep
          ? <span className="text-sm truncate block max-w-[180px]">{opp.nextStep}</span>
          : <span className="text-muted-foreground">-</span>;
      case "last_activity_at":
        return opp.lastActivityAt
          ? <span className="text-sm">{format(new Date(opp.lastActivityAt), "dd/MM/yy")}</span>
          : <span className="text-muted-foreground">-</span>;
      default:
        return "-";
    }
  };

  const rows = data?.data ?? [];
  const allIds = rows.map((o) => o.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const selectedOpportunities = rows.filter((o) => selectedIds.has(o.id));
  const selectedOwnerName = (() => {
    const o = owners.find((o: any) => o.id === bulkOwner) as any;
    return o ? `${o.first_name} ${o.last_name}`.trim() : "";
  })();

  return (
    <div className="bg-card rounded-lg border">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-muted/50">
          <span className="text-sm text-muted-foreground">Seleccionadas: <strong>{selectedIds.size}</strong></span>
          <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Edición masiva</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Edición masiva</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Se aplicará a {selectedIds.size} oportunidades.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium">Etapa</label>
                    <Select value={bulkStage} onValueChange={setBulkStage}>
                      <SelectTrigger><SelectValue placeholder="Cambiar etapa" /></SelectTrigger>
                      <SelectContent>
                        {stageOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Responsable</label>
                    <Select value={bulkOwner} onValueChange={setBulkOwner}>
                      <SelectTrigger><SelectValue placeholder="Cambiar responsable" /></SelectTrigger>
                      <SelectContent>
                        {owners.map((o: any) => (
                          <SelectItem key={o.id} value={o.id}>{`${o.first_name} ${o.last_name}`.trim()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium">Tag</label>
                    <Select value={bulkTag} onValueChange={setBulkTag}>
                      <SelectTrigger><SelectValue placeholder="Cambiar tag" /></SelectTrigger>
                      <SelectContent>
                        {tags.map((t: any) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold">Preview</p>
                  {bulkStage && <p>Etapa: {bulkStage}</p>}
                  {bulkOwner && <p>Responsable: {selectedOwnerName}</p>}
                  {bulkTag && <p>Tag: {bulkTag}</p>}
                  {!bulkStage && !bulkOwner && !bulkTag && <p className="text-muted-foreground">Seleccioná al menos un cambio.</p>}
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold">Oportunidades</p>
                  <div className="max-h-28 overflow-y-auto border rounded p-2">
                    {selectedOpportunities.map((o) => <p key={o.id} className="truncate">{o.name}</p>)}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setBulkModalOpen(false)}>Cancelar</Button>
                  <Button onClick={() => bulkEditMutation.mutate()} disabled={!bulkStage && !bulkOwner && !bulkTag}>
                    Aplicar cambios
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="destructive" size="sm"
            onClick={() => { if (confirm("¿Eliminar seleccionadas?")) bulkDeleteMutation.mutate(); }}>
            Eliminar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Limpiar selección</Button>
        </div>
      )}

      {/* Column picker toolbar */}
      <div className="flex justify-end px-3 py-1.5 border-b">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7 text-muted-foreground hover:text-foreground">
              <Settings2 className="w-3.5 h-3.5" />
              Columnas
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Columnas visibles
            </p>
            <div className="space-y-2">
              {ALL_COLUMNS.filter((c) => !c.alwaysVisible).map((col) => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={visibleColumnKeys.includes(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  <span className="text-sm">{col.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 border-b">
            <tr>
              <th className="px-4 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => setSelectedIds(e.target.checked ? new Set(allIds) : new Set())}
                  aria-label="Seleccionar todo"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground select-none whitespace-nowrap ${col.sortKey ? "cursor-pointer hover:text-foreground" : ""}`}
                  onClick={() => handleSort(col)}
                >
                  {col.label}
                  {col.sortKey && sort.field === col.sortKey && (
                    <span className="ml-1">{sort.direction === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading || isFetching ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                  <td className="px-3 py-3" />
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="text-center py-10">
                  <p className="text-destructive mb-2">Error al cargar oportunidades.</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="text-center py-12">
                  <p className="text-muted-foreground mb-3">Aún no hay oportunidades.</p>
                  <Button onClick={onCreate}>Crear oportunidad</Button>
                </td>
              </tr>
            ) : (
              rows.map((opp) => (
                <tr key={opp.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(opp.id)}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        e.target.checked ? next.add(opp.id) : next.delete(opp.id);
                        setSelectedIds(next);
                      }}
                      aria-label={`Seleccionar ${opp.name}`}
                    />
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-4 py-2.5">
                      {renderCell(opp, col.key)}
                    </td>
                  ))}
                  <td className="px-2 py-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Acciones">
                          <LucideMoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingOpportunity(toOpportunityRow(opp))}>
                          <Pencil className="w-4 h-4 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (confirm(`¿Eliminar "${opp.name}"?`)) deleteOpportunityMutation.mutate(opp.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data?.total ? (
        <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/30 text-sm">
          <span className="text-muted-foreground">
            Página <strong>{page}</strong> de <strong>{Math.ceil(data.total / pageSize)}</strong>
            <span className="ml-2 text-xs">({data.total} total)</span>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * pageSize >= data.total}>
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}

      <OpportunityDrawer
        open={!!editingOpportunity}
        onClose={() => setEditingOpportunity(null)}
        companyId={companyId}
        opportunity={editingOpportunity}
      />
    </div>
  );
}
function setDeleteConfirmOpen(arg0: boolean) {
  throw new Error("Function not implemented.");
}

