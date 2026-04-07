import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { opportunityService } from "@/domain/crm/services/opportunityService";
import { OpportunityDrawer } from "./OpportunityDrawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface KanbanOpp {
  id: string;
  name: string;
  value: number | null;
  stage: string;
  status: string | null;
  estimated_close_date: string | null;
  probability: number | null;
  pipeline_id: string | null;
  customers?: { name: string } | null;
  [key: string]: unknown;
}

interface Props {
  companyId: string;
  search?: string;
  filters?: {
    pipelineId?: string;
    ownerId?: string;
    status?: string;
    stageId?: string;
  };
}

function getPillClass(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("ganad") || s === "won")
    return "bg-green-100 text-green-800";
  if (s.includes("perdid") || s === "lost")
    return "bg-red-100 text-red-800";
  return "bg-primary/10 text-primary";
}

const formatCurrency = (value: number | null) => {
  if (value == null) return "";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
};

export function OpportunitiesKanbanView({ companyId, search, filters }: Props) {
  const queryClient = useQueryClient();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(
    filters?.pipelineId ?? null
  );
  const [draggedOpp, setDraggedOpp] = useState<KanbanOpp | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<KanbanOpp | null>(null);

  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ["crm-pipelines", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .select("id, name, stages")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-select first pipeline if none selected
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId && !filters?.pipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId, filters?.pipelineId]);

  // Sync with external pipelineId filter
  useEffect(() => {
    if (filters?.pipelineId) {
      setSelectedPipelineId(filters.pipelineId);
    }
  }, [filters?.pipelineId]);

  const { data: opportunities = [], isLoading: oppsLoading } = useQuery({
    queryKey: ["crm-kanban-opps", companyId, selectedPipelineId, search, filters],
    queryFn: async () => {
      let q = supabase
        .from("crm_opportunities")
        .select(
          "id, name, value, stage, status, estimated_close_date, probability, pipeline_id, customers(name)"
        )
        .eq("company_id", companyId);

      if (selectedPipelineId) q = q.eq("pipeline_id", selectedPipelineId);
      if (filters?.ownerId) q = q.eq("owner_id", filters.ownerId);
      if (filters?.status) q = q.eq("status", filters.status);
      if (search) q = q.ilike("name", `%${search}%`);

      const { data, error } = await q.order("name");
      if (error) throw error;
      return (data ?? []) as KanbanOpp[];
    },
    enabled: !!companyId,
  });

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);

  const oppsByStage = useMemo(() => {
    const map: Record<string, KanbanOpp[]> = {};
    (selectedPipeline?.stages ?? []).forEach((s) => (map[s] = []));
    opportunities.forEach((opp) => {
      if (map[opp.stage] !== undefined) {
        map[opp.stage].push(opp);
      }
    });
    return map;
  }, [opportunities, selectedPipeline]);

  const handleDragStart = (opp: KanbanOpp) => setDraggedOpp(opp);

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDropTarget(stage);
  };

  const handleDragLeave = () => setDropTarget(null);

  const handleDrop = async (targetStage: string) => {
    setDropTarget(null);
    if (!draggedOpp || draggedOpp.stage === targetStage) {
      setDraggedOpp(null);
      return;
    }
    const opp = draggedOpp;
    setDraggedOpp(null);
    try {
      await opportunityService.update(opp.id, { stage: targetStage });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban-opps"] });
    } catch {
      // silently fail — user can retry by dragging again
    }
  };

  const isLoading = pipelinesLoading || oppsLoading;

  if (pipelinesLoading) {
    return (
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-72 flex-shrink-0" />
        ))}
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No hay pipelines configurados. Crea uno en{" "}
        <a href="/pipelines" className="underline ml-1 text-primary">
          Pipelines
        </a>
        .
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pipeline selector */}
      {!filters?.pipelineId && (
        <Select
          value={selectedPipelineId ?? ""}
          onValueChange={(v) => setSelectedPipelineId(v)}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Seleccionar pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Kanban board */}
      {oppsLoading ? (
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72 flex-shrink-0" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-3 min-w-max pb-4">
            {(selectedPipeline?.stages ?? []).map((stage) => {
              const opps = oppsByStage[stage] ?? [];
              const stageValue = opps.reduce((s, o) => s + (o.value ?? 0), 0);
              const isDropZone = dropTarget === stage;

              return (
                <div
                  key={stage}
                  className={[
                    "w-72 flex-shrink-0 flex flex-col rounded-lg border bg-muted/30 transition-all",
                    isDropZone ? "ring-2 ring-primary/50 bg-primary/5" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(stage)}
                >
                  {/* Column header */}
                  <div className="p-3 flex items-center justify-between border-b bg-muted/50 rounded-t-lg">
                    <span className="font-medium text-sm truncate mr-2">
                      {stage}
                    </span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {opps.length}
                    </Badge>
                  </div>
                  {stageValue > 0 && (
                    <p className="px-3 pt-1.5 pb-1 text-xs text-muted-foreground font-medium">
                      {formatCurrency(stageValue)}
                    </p>
                  )}

                  {/* Cards */}
                  <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[120px]">
                    {opps.map((opp) => (
                      <div
                        key={opp.id}
                        draggable
                        onDragStart={() => handleDragStart(opp)}
                        onClick={() => setEditingOpportunity(opp)}
                        className="p-3 bg-card border rounded-lg cursor-pointer hover:shadow-md transition-shadow select-none"
                      >
                        <p className="font-medium text-sm leading-tight truncate">
                          {opp.name}
                        </p>
                        {opp.customers?.name && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {opp.customers.name}
                          </p>
                        )}
                        {opp.value != null && (
                          <p className="text-sm text-primary font-semibold mt-1.5">
                            {formatCurrency(opp.value)}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2 gap-1">
                          {opp.estimated_close_date ? (
                            <span className="text-xs text-muted-foreground">
                              {format(
                                new Date(opp.estimated_close_date + "T00:00:00"),
                                "d MMM",
                                { locale: es }
                              )}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${getPillClass(opp.status)}`}
                          >
                            {opp.status ?? opp.stage}
                          </span>
                        </div>
                      </div>
                    ))}

                    {opps.length === 0 && (
                      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                        Sin oportunidades
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {!selectedPipeline && (
              <div className="flex items-center justify-center w-72 h-48 text-sm text-muted-foreground">
                Seleccioná un pipeline para ver el kanban.
              </div>
            )}
          </div>
        </div>
      )}

      <OpportunityDrawer
        open={!!editingOpportunity}
        onClose={() => setEditingOpportunity(null)}
        companyId={companyId}
        opportunity={editingOpportunity as any}
      />
    </div>
  );
}
