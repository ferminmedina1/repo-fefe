import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, X, GripVertical, Pencil, Trash2, MoreVertical } from "lucide-react";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { ScoringRules } from "./ScoringRules";
import type { Database } from "@/integrations/supabase/types";
import { opportunityService } from "@/domain/crm/services/opportunityService";
import { stageRuleService } from "@/domain/crm/services/stageRuleService";

type OpportunityRow = Database["public"]["Tables"]["crm_opportunities"]["Row"];

interface Pipeline {
  id: string;
  name: string;
  stages: string[];
  company_id: string;
  created_at: string;
}

interface Opportunity {
  id: string;
  name: string;
  value: number | null;
  stage: string;
  status: string | null;
  customer_id: string | null;
  probability: number | null;
  updated_at: string;
  customers?: { name: string } | null;
}

const formatCurrency = (value: number | null) => {
  if (value == null) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
};

function getPillClass(status?: string | null, stage?: string | null) {
  const s = ((status ?? stage) ?? "").toLowerCase();
  if (s.includes("ganad") || s === "won") return "bg-green-100 text-green-800";
  if (s.includes("perdid") || s === "lost") return "bg-red-100 text-red-800";
  return "bg-primary/10 text-primary";
}

export function Pipelines({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newStages, setNewStages] = useState([
    "Nuevo",
    "Contactado",
    "Propuesta",
    "Negociación",
    "Ganado",
    "Perdido",
  ]);
  const [draggedOpportunity, setDraggedOpportunity] = useState<Opportunity | null>(null);
  const [createOpportunityForStage, setCreateOpportunityForStage] = useState<{ stage: string; pipeline_id: string } | null>(null);
  const [addExistingOpen, setAddExistingOpen] = useState<string | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<OpportunityRow | null>(null);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const [ruleDialogStage, setRuleDialogStage] = useState<string | null>(null);
  const [ruleSlaDays, setRuleSlaDays] = useState<string>("");
  const [ruleAutoAssignOwnerId, setRuleAutoAssignOwnerId] = useState<string>("");
  const [ruleReminderDaysBefore, setRuleReminderDaysBefore] = useState<string>("");
  const VISIBLE_PER_STAGE = 10;

  // Fetch pipelines
  const { data: pipelines, isLoading: pipelinesLoading } = useQuery<Pipeline[]>({
    queryKey: ["crm-pipelines", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Pipeline[];
    },
    enabled: !!companyId,
  });

  // Auto-select first pipeline
  const selectedPipeline = useMemo(() => {
    if (!pipelines?.length) return null;
    if (selectedPipelineId) {
      return pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0];
    }
    return pipelines[0];
  }, [pipelines, selectedPipelineId]);

  // Fetch opportunities for selected pipeline
  const { data: opportunities = [] } = useQuery<Opportunity[]>({
    queryKey: ["crm-opportunities-pipeline", companyId, selectedPipeline?.id],
    queryFn: async () => {
      if (!selectedPipeline) return [];
      const { data, error } = await supabase
        .from("crm_opportunities")
        .select("id, name, value, stage, status, customer_id, probability, updated_at, customers(name)")
        .eq("company_id", companyId)
        .eq("pipeline_id", selectedPipeline.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!companyId && !!selectedPipeline,
  });

  const { data: owners = [] } = useQuery({
    queryKey: ["crm-owners", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("company_id", companyId)
        .order("first_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: stageRules = [] } = useQuery({
    queryKey: ["crm-stage-rules", companyId, selectedPipeline?.id],
    queryFn: () =>
      stageRuleService.listByPipeline({
        companyId,
        pipelineId: selectedPipeline!.id,
      }),
    enabled: !!companyId && !!selectedPipeline?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Create pipeline mutation
  const createPipelineMutation = useMutation({
    mutationFn: async () => {
      if (!newPipelineName.trim()) throw new Error("El nombre es requerido");
      const { error } = await supabase.from("crm_pipelines").insert([
        {
          company_id: companyId,
          name: newPipelineName.trim(),
          stages: newStages.filter((s) => s.trim()),
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-pipelines", companyId] });
      toast.success("Pipeline creado exitosamente");
      setIsCreateDialogOpen(false);
      setNewPipelineName("");
      setNewStages(["Nuevo", "Contactado", "Propuesta", "Negociación", "Ganado", "Perdido"]);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear pipeline");
    },
  });

  // Update opportunity stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ opportunityId, newStage }: { opportunityId: string; newStage: string }) => {
      await opportunityService.update(opportunityId, {
        stage: newStage,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-opportunities-pipeline"] });
      toast.success("Etapa actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar etapa");
    },
  });

  // Delete pipeline mutation
  const deletePipelineMutation = useMutation({
    mutationFn: async (pipelineId: string) => {
      const { error } = await supabase.from("crm_pipelines").delete().eq("id", pipelineId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-pipelines", companyId] });
      toast.success("Pipeline eliminado");
      setSelectedPipelineId(null);
    },
    onError: () => {
      toast.error("Error al eliminar pipeline");
    },
  });



  // Assign existing opportunity to pipeline
  const assignOpportunityMutation = useMutation({
    mutationFn: async ({ opportunityId, stage }: { opportunityId: string; stage: string }) => {
      if (!selectedPipeline) throw new Error("Pipeline no seleccionado");
      await opportunityService.update(opportunityId, {
        pipeline_id: selectedPipeline.id,
        stage,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-opportunities-pipeline"] });
      toast.success("Oportunidad asignada");
      setAddExistingOpen(null);
    },
    onError: () => {
      toast.error("Error al asignar oportunidad");
    },
  });

  // Fetch unassigned opportunities
  const { data: unassignedOpportunities = [] } = useQuery<Opportunity[]>({
    queryKey: ["crm-opportunities-unassigned", companyId, selectedPipeline?.id],
    queryFn: async () => {
      if (!selectedPipeline) return [];
      const { data, error } = await supabase
        .from("crm_opportunities")
        .select("id, name, value, stage, customer_id, probability, updated_at, customers(name)")
        .eq("company_id", companyId)
        .neq("pipeline_id", selectedPipeline.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!companyId && !!selectedPipeline,
  });

  // Delete opportunity mutation
  const deleteOpportunityMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      const { error } = await supabase
        .from("crm_opportunities")
        .delete()
        .eq("id", opportunityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-opportunities-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", companyId] });
      toast.success("Oportunidad eliminada");
    },
    onError: () => {
      toast.error("Error al eliminar oportunidad");
    },
  });

  const handleDeleteOpportunity = (opportunityId: string, opportunityName: string) => {
    if (confirm(`¿Eliminar la oportunidad "${opportunityName}"?`)) {
      deleteOpportunityMutation.mutate(opportunityId);
    }
  };

  const handleEditOpportunity = async (oppId: string) => {
    // Fetch full opportunity data
    const { data, error } = await supabase
      .from("crm_opportunities")
      .select("*")
      .eq("id", oppId)
      .single();
    
    if (error) {
      toast.error("Error al cargar oportunidad");
      return;
    }
    
    setEditingOpportunity(data as OpportunityRow);
  };

  const handleDragStart = (opportunity: Opportunity) => {
    setDraggedOpportunity(opportunity);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stage: string) => {
    if (!draggedOpportunity) return;
    if (draggedOpportunity.stage === stage) {
      setDraggedOpportunity(null);
      return;
    }
    updateStageMutation.mutate({
      opportunityId: draggedOpportunity.id,
      newStage: stage,
    });
    setDraggedOpportunity(null);
  };

  const rulesByStage = useMemo(() => {
    const map = new Map<string, (typeof stageRules)[number]>();
    stageRules.forEach((rule) => {
      map.set(rule.stage, rule);
    });
    return map;
  }, [stageRules]);

  const upsertStageRuleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPipeline || !ruleDialogStage) {
        throw new Error("Pipeline o etapa no definida");
      }

      const slaDays = ruleSlaDays.trim() ? Number(ruleSlaDays) : null;
      const reminderDaysBefore = ruleReminderDaysBefore.trim()
        ? Number(ruleReminderDaysBefore)
        : null;

      return stageRuleService.upsert({
        company_id: companyId,
        pipeline_id: selectedPipeline.id,
        stage: ruleDialogStage,
        sla_days: Number.isFinite(slaDays as number) ? slaDays : null,
        reminder_days_before: Number.isFinite(reminderDaysBefore as number)
          ? reminderDaysBefore
          : null,
        auto_assign_owner_id: ruleAutoAssignOwnerId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-stage-rules", companyId] });
      toast.success("Reglas guardadas");
      setRuleDialogStage(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al guardar reglas");
    },
  });

  const deleteStageRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      await stageRuleService.remove(ruleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-stage-rules", companyId] });
      toast.success("Regla eliminada");
      setRuleDialogStage(null);
    },
    onError: () => {
      toast.error("Error al eliminar regla");
    },
  });

  const addStage = () => {
    setNewStages([...newStages, ""]);
  };

  const removeStage = (index: number) => {
    setNewStages(newStages.filter((_, i) => i !== index));
  };

  const updateStage = (index: number, value: string) => {
    const updated = [...newStages];
    updated[index] = value;
    setNewStages(updated);
  };

  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<string, Opportunity[]> = {};
    selectedPipeline?.stages.forEach((stage) => {
      grouped[stage] = [];
    });
    opportunities.forEach((opp) => {
      if (grouped[opp.stage]) {
        grouped[opp.stage].push(opp);
      }
    });
    selectedPipeline?.stages.forEach((stage) => {
      grouped[stage]?.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
    return grouped;
  }, [opportunities, selectedPipeline]);

  useEffect(() => {
    if (!selectedPipeline?.stages?.length) return;
    const initialCounts: Record<string, number> = {};
    selectedPipeline.stages.forEach((stage) => {
      initialCounts[stage] = VISIBLE_PER_STAGE;
    });
    setVisibleCounts(initialCounts);
  }, [selectedPipeline?.id, selectedPipeline?.stages]);

  const handleColumnScroll = (stage: string, e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 40;
    if (!nearBottom) return;

    setVisibleCounts((prev) => ({
      ...prev,
      [stage]: (prev[stage] ?? VISIBLE_PER_STAGE) + VISIBLE_PER_STAGE,
    }));
  };

  if (pipelinesLoading) {
    return <div className="p-6">Cargando pipelines...</div>;
  }

  if (!pipelines?.length) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Pipelines</h1>
            <p className="text-sm text-muted-foreground">Gestioná tus embudos de venta.</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No hay pipelines creados.</p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primer pipeline
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Pipeline</DialogTitle>
                </DialogHeader>
                <CreatePipelineForm
                  newPipelineName={newPipelineName}
                  setNewPipelineName={setNewPipelineName}
                  newStages={newStages}
                  updateStage={updateStage}
                  removeStage={removeStage}
                  addStage={addStage}
                  onSubmit={() => createPipelineMutation.mutate()}
                  isPending={createPipelineMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipelines</h1>
          <p className="text-sm text-muted-foreground">Gestioná tus embudos de venta.</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Pipeline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Pipeline</DialogTitle>
            </DialogHeader>
            <CreatePipelineForm
              newPipelineName={newPipelineName}
              setNewPipelineName={setNewPipelineName}
              newStages={newStages}
              updateStage={updateStage}
              removeStage={removeStage}
              addStage={addStage}
              onSubmit={() => createPipelineMutation.mutate()}
              isPending={createPipelineMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedPipeline?.id || ""}
          onValueChange={(value) => setSelectedPipelineId(value)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPipeline && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("¿Eliminar este pipeline? Esta acción no se puede deshacer.")) {
                deletePipelineMutation.mutate(selectedPipeline.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </Button>
        )}
      </div>

      {selectedPipeline && (
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {selectedPipeline.stages.map((stage) => {
              const stageValue = opportunitiesByStage[stage]?.reduce((s, o) => s + (o.value ?? 0), 0) ?? 0;
              return (
              <div
                key={stage}
                className="flex-shrink-0 w-72 flex flex-col rounded-lg border bg-muted/30 transition-all"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage)}
              >
                <div className="p-3 flex items-center justify-between border-b bg-muted/50 rounded-t-lg">
                  <span className="font-medium text-sm truncate mr-2">{stage}</span>
                  <div className="flex items-center gap-1.5">
                        <Dialog
                          open={ruleDialogStage === stage}
                          onOpenChange={(open) => {
                            if (!open) {
                              setRuleDialogStage(null);
                              return;
                            }
                            const rule = rulesByStage.get(stage);
                            setRuleSlaDays(rule?.slaDays != null ? String(rule.slaDays) : "");
                            setRuleAutoAssignOwnerId(rule?.autoAssignOwnerId || "");
                            setRuleReminderDaysBefore(
                              rule?.reminderDaysBefore != null ? String(rule.reminderDaysBefore) : ""
                            );
                            setRuleDialogStage(stage);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reglas de etapa — {stage}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium">SLA (días)</label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={ruleSlaDays}
                                  onChange={(e) => setRuleSlaDays(e.target.value)}
                                  placeholder="Ej: 7"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium">Auto-asignar responsable</label>
                                <Select
                                  value={ruleAutoAssignOwnerId || "__none__"}
                                  onValueChange={(value) =>
                                    setRuleAutoAssignOwnerId(value === "__none__" ? "" : value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sin responsable" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Sin responsable</SelectItem>
                                    {owners.map((owner: any) => (
                                      <SelectItem key={owner.id} value={owner.id}>
                                        {[owner.first_name, owner.last_name].filter(Boolean).join(" ")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium">Recordatorio (días antes)</label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={ruleReminderDaysBefore}
                                  onChange={(e) => setRuleReminderDaysBefore(e.target.value)}
                                  placeholder="Ej: 2"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Se crea una tarea automática según el SLA.
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-between gap-2 pt-2">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  const rule = rulesByStage.get(stage);
                                  if (rule) deleteStageRuleMutation.mutate(rule.id);
                                  else setRuleDialogStage(null);
                                }}
                                disabled={!rulesByStage.get(stage)}
                              >
                                Eliminar regla
                              </Button>
                              <Button onClick={() => upsertStageRuleMutation.mutate()}>
                                Guardar
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Badge variant="secondary" className="text-xs shrink-0">{opportunitiesByStage[stage]?.length || 0}</Badge>
                      </div>
                    </div>
                    {stageValue > 0 && (
                      <p className="px-3 pt-1.5 pb-1 text-xs text-muted-foreground font-medium">
                        {formatCurrency(stageValue)}
                      </p>
                    )}
                  <div className="flex flex-col gap-2 p-2 flex-1">
                    <div
                      className="flex flex-col gap-2 max-h-[520px] overflow-y-auto"
                      onScroll={(e) => handleColumnScroll(stage, e)}
                    >
                      {opportunitiesByStage[stage]
                        ?.slice(0, visibleCounts[stage] ?? VISIBLE_PER_STAGE)
                        .map((opp) => (
                          <div
                            key={opp.id}
                            draggable
                            onDragStart={() => handleDragStart(opp)}
                            onClick={() => handleEditOpportunity(opp.id)}
                            className="p-3 bg-card border rounded-lg cursor-pointer hover:shadow-md transition-shadow select-none"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm leading-tight truncate">{opp.name}</p>
                                {opp.customers?.name && (
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">{opp.customers.name}</p>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditOpportunity(opp.id);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteOpportunity(opp.id, opp.name);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {opp.value != null && (
                              <p className="text-sm text-primary font-semibold mt-1.5">
                                {formatCurrency(opp.value)}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2 gap-1">
                              {opp.probability != null ? (
                                <Badge variant="outline" className="text-xs">
                                  {opp.probability}%
                                </Badge>
                              ) : <span />}
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getPillClass(opp.status, opp.stage)}`}>
                                {opp.status ?? opp.stage}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          if (selectedPipeline) {
                            setCreateOpportunityForStage({ stage, pipeline_id: selectedPipeline.id });
                          }
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Crear
                      </Button>
                      <Dialog open={addExistingOpen === stage} onOpenChange={(open) => {
                        if (!open) setAddExistingOpen(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => setAddExistingOpen(stage)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Agregar
                          </Button>
                        </DialogTrigger>
                        {addExistingOpen === stage && (
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Agregar Oportunidad - {stage}</DialogTitle>
                            </DialogHeader>
                            <AddExistingOpportunityForm
                              stage={stage}
                              unassignedOpportunities={unassignedOpportunities}
                              onSubmit={(opportunityId) => {
                                assignOpportunityMutation.mutate({
                                  opportunityId,
                                  stage,
                                });
                              }}
                              isPending={assignOpportunityMutation.isPending}
                            />
                          </DialogContent>
                        )}
                      </Dialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ScoringRules companyId={companyId} />

      <OpportunityDrawer
        open={!!editingOpportunity || !!createOpportunityForStage}
        onClose={() => {
          setEditingOpportunity(null);
          setCreateOpportunityForStage(null);
        }}
        companyId={companyId}
        opportunity={editingOpportunity}
        initialValues={createOpportunityForStage ? {
          stage: createOpportunityForStage.stage,
          pipeline_id: createOpportunityForStage.pipeline_id,
          probability: 50,
          status: "abierta",
        } : undefined}
      />
    </div>
  );
}

function CreatePipelineForm({
  newPipelineName,
  setNewPipelineName,
  newStages,
  updateStage,
  removeStage,
  addStage,
  onSubmit,
  isPending,
}: {
  newPipelineName: string;
  setNewPipelineName: (name: string) => void;
  newStages: string[];
  updateStage: (index: number, value: string) => void;
  removeStage: (index: number) => void;
  addStage: () => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">Nombre del Pipeline *</label>
        <Input
          value={newPipelineName}
          onChange={(e) => setNewPipelineName(e.target.value)}
          placeholder="Ej: Ventas B2B"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Etapas</label>
        <p className="text-xs text-muted-foreground">
          Define las etapas del pipeline. Podés editar, eliminar o agregar más.
        </p>
        <div className="space-y-2">
          {newStages.map((stage, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={stage}
                onChange={(e) => updateStage(index, e.target.value)}
                placeholder={`Etapa ${index + 1}`}
              />
              {newStages.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStage(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={addStage} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Agregar etapa
        </Button>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          Crear Pipeline
        </Button>
      </div>
    </form>
  );
}

function AddExistingOpportunityForm({
  stage,
  unassignedOpportunities,
  onSubmit,
  isPending,
}: {
  stage: string;
  unassignedOpportunities: Opportunity[];
  onSubmit: (opportunityId: string) => void;
  isPending: boolean;
}) {
  const [selectedId, setSelectedId] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (selectedId) {
          onSubmit(selectedId);
          setSelectedId("");
        }
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">Seleccionar Oportunidad *</label>
        {unassignedOpportunities.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay oportunidades disponibles.</p>
        ) : (
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="Elegir oportunidad..." />
            </SelectTrigger>
            <SelectContent>
              {unassignedOpportunities.map((opp) => (
                <SelectItem key={opp.id} value={opp.id}>
                  {opp.name} {opp.customers?.name && `(${opp.customers.name})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending || !selectedId}>
          Agregar Oportunidad
        </Button>
      </div>
    </form>
  );
}
