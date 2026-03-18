import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Archive,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Plus,
  Save,
  Workflow,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Layout } from "@/components/layout/Layout";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type WorkflowRow = Database["public"]["Tables"] extends Record<
  "crm_automation_workflows",
  { Row: infer RowType }
>
  ? RowType
  : {
      id: string;
      company_id: string | null;
      name: string;
      description: string | null;
      status: string | null;
      trigger_type: string;
      trigger_config: any;
      updated_at: string | null;
      is_active: boolean;
    };

type TriggerType = "opportunity_updated" | "pipeline_stage_changed";
type StepType = "condition" | "action" | "response" | "wait";
type BranchKey = "trueBranch" | "falseBranch";
type EditorTab = "builder" | "settings" | "history" | "logs";
type ExecutionStatusFilter =
  | "all"
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "canceled"
  | "dead_letter";

type WorkflowSettings = {
  maxRetries: number;
  retryBackoffSeconds: number;
};

type TriggerFilter = {
  pipelineId?: string;
  stageName?: string;
};

type WorkflowTrigger = {
  id: string;
  type: TriggerType;
  filter: TriggerFilter;
};

type WorkflowStep = {
  id: string;
  type: StepType;
  title: string;
  details?: string;
  variableKey?: string;
  operator?: string;
  comparisonValue?: string;
  trueBranch?: WorkflowStep[];
  falseBranch?: WorkflowStep[];
};

type ExecutionRow = {
  id: string;
  status: string;
  source_event_type: string;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

type PipelineRow = {
  id: string;
  name: string;
  stages: unknown;
};

const triggerOptions: { value: TriggerType; label: string }[] = [
  { value: "opportunity_updated", label: "Opportunity updated" },
  { value: "pipeline_stage_changed", label: "Pipeline stage changed" },
];

const stepTypeOptions: { value: StepType; label: string }[] = [
  { value: "condition", label: "Condición" },
  { value: "action", label: "Acción" },
  { value: "response", label: "Respuesta" },
  { value: "wait", label: "Wait" },
];

const stepDefaults: Record<StepType, { title: string; details: string }> = {
  condition: {
    title: "Nueva condición",
    details: "Ej: etapa = propuesta y monto > 100000",
  },
  action: {
    title: "Nueva acción",
    details: "Ej: crear tarea para vendedor",
  },
  response: {
    title: "Nueva respuesta",
    details: "Ej: enviar mensaje automático",
  },
  wait: {
    title: "Esperar",
    details: "Pausa antes de continuar",
  },
};

const variableOptionsByType: Record<StepType, { value: string; label: string }[]> = {
  condition: [
    { value: "opportunity.stage", label: "Opportunity > Stage" },
    { value: "opportunity.value", label: "Opportunity > Value" },
    { value: "opportunity.owner", label: "Opportunity > Owner" },
    { value: "pipeline.name", label: "Pipeline > Name" },
  ],
  action: [
    { value: "opportunity.owner", label: "Opportunity > Owner" },
    { value: "opportunity.stage", label: "Opportunity > Stage" },
    { value: "opportunity.tags", label: "Opportunity > Tags" },
  ],
  response: [
    { value: "contact.email", label: "Contact > Email" },
    { value: "contact.phone", label: "Contact > Phone" },
    { value: "opportunity.name", label: "Opportunity > Name" },
  ],
  wait: [
    { value: "wait.duration_minutes", label: "Wait > Duration (minutes)" },
    { value: "wait.until_date", label: "Wait > Until date" },
  ],
};

const operatorOptions = [
  { value: "equals", label: "Igual" },
  { value: "not_equals", label: "Distinto" },
  { value: "contains", label: "Contiene" },
  { value: "greater_than", label: "Mayor que" },
  { value: "less_than", label: "Menor que" },
  { value: "is_empty", label: "Está vacío" },
  { value: "is_not_empty", label: "No está vacío" },
];

const typeLabelMap: Record<StepType, string> = {
  condition: "Condition",
  action: "Action",
  response: "Response",
  wait: "Wait",
};

const statusVariantMap: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
  draft: "secondary",
  published: "default",
  paused: "outline",
  archived: "destructive",
};

const defaultWorkflowSettings: WorkflowSettings = {
  maxRetries: 3,
  retryBackoffSeconds: 30,
};

const safeStepType = (value: unknown): StepType => {
  if (value === "condition" || value === "action" || value === "response" || value === "wait") {
    return value;
  }
  return "condition";
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const parseWorkflowSettings = (config: unknown): WorkflowSettings => {
  if (!config || typeof config !== "object") return defaultWorkflowSettings;
  const settings = (config as { settings?: unknown }).settings;
  if (!settings || typeof settings !== "object") return defaultWorkflowSettings;

  const parsed = settings as { maxRetries?: unknown; retryBackoffSeconds?: unknown };
  const maxRetries = Number(parsed.maxRetries);
  const retryBackoffSeconds = Number(parsed.retryBackoffSeconds);

  return {
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : defaultWorkflowSettings.maxRetries,
    retryBackoffSeconds:
      Number.isFinite(retryBackoffSeconds) && retryBackoffSeconds >= 0
        ? retryBackoffSeconds
        : defaultWorkflowSettings.retryBackoffSeconds,
  };
};

const parseTriggerFilter = (config: unknown): TriggerFilter => {
  if (!config || typeof config !== "object") return {};
  const triggerFilter = (config as { triggerFilter?: unknown }).triggerFilter;
  if (!triggerFilter || typeof triggerFilter !== "object") return {};

  const parsed = triggerFilter as { pipelineId?: unknown; stageName?: unknown };

  return {
    pipelineId: typeof parsed.pipelineId === "string" && parsed.pipelineId.length > 0 ? parsed.pipelineId : undefined,
    stageName: typeof parsed.stageName === "string" && parsed.stageName.length > 0 ? parsed.stageName : undefined,
  };
};

const parseWorkflowTriggers = (
  config: unknown,
  fallbackTriggerType: TriggerType
): WorkflowTrigger[] => {
  if (config && typeof config === "object") {
    const triggerList = (config as { triggers?: unknown }).triggers;
    if (Array.isArray(triggerList)) {
      const parsed = triggerList
        .map((raw, index) => {
          if (!raw || typeof raw !== "object") return null;

          const item = raw as {
            id?: unknown;
            type?: unknown;
            filter?: unknown;
            pipelineId?: unknown;
            stageName?: unknown;
          };

          const type: TriggerType =
            item.type === "pipeline_stage_changed" ? "pipeline_stage_changed" : "opportunity_updated";

          const legacyFilter: TriggerFilter = {
            pipelineId: typeof item.pipelineId === "string" && item.pipelineId.length > 0 ? item.pipelineId : undefined,
            stageName: typeof item.stageName === "string" && item.stageName.length > 0 ? item.stageName : undefined,
          };

          const nestedFilter =
            item.filter && typeof item.filter === "object"
              ? {
                  pipelineId:
                    typeof (item.filter as { pipelineId?: unknown }).pipelineId === "string" &&
                    ((item.filter as { pipelineId?: string }).pipelineId || "").length > 0
                      ? (item.filter as { pipelineId: string }).pipelineId
                      : undefined,
                  stageName:
                    typeof (item.filter as { stageName?: unknown }).stageName === "string" &&
                    ((item.filter as { stageName?: string }).stageName || "").length > 0
                      ? (item.filter as { stageName: string }).stageName
                      : undefined,
                }
              : {};

          return {
            id:
              typeof item.id === "string" && item.id.length > 0
                ? item.id
                : `trigger-${index + 1}`,
            type,
            filter: {
              pipelineId: nestedFilter.pipelineId || legacyFilter.pipelineId,
              stageName: nestedFilter.stageName || legacyFilter.stageName,
            },
          } as WorkflowTrigger;
        })
        .filter(Boolean) as WorkflowTrigger[];

      if (parsed.length) return parsed;
    }
  }

  return [
    {
      id: globalThis.crypto?.randomUUID?.() ?? "trigger-1",
      type: fallbackTriggerType,
      filter: parseTriggerFilter(config),
    },
  ];
};

const getStageNames = (stages: unknown): string[] => {
  if (!Array.isArray(stages)) return [];

  return stages
    .map((stage) => {
      if (typeof stage === "string") return stage;
      if (stage && typeof stage === "object") {
        const stageObj = stage as { name?: unknown; label?: unknown; title?: unknown };
        if (typeof stageObj.name === "string") return stageObj.name;
        if (typeof stageObj.label === "string") return stageObj.label;
        if (typeof stageObj.title === "string") return stageObj.title;
      }
      return "";
    })
    .filter((name) => name.length > 0);
};

const parseStep = (raw: unknown, index: number): WorkflowStep | null => {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as {
    id?: unknown;
    type?: unknown;
    title?: unknown;
    details?: unknown;
    variableKey?: unknown;
    operator?: unknown;
    comparisonValue?: unknown;
    trueBranch?: unknown;
    falseBranch?: unknown;
  };

  const stepType = safeStepType(item.type);
  const parsedTrue = Array.isArray(item.trueBranch)
    ? item.trueBranch.map((branchItem, branchIndex) => parseStep(branchItem, branchIndex)).filter(Boolean) as WorkflowStep[]
    : [];
  const parsedFalse = Array.isArray(item.falseBranch)
    ? item.falseBranch.map((branchItem, branchIndex) => parseStep(branchItem, branchIndex)).filter(Boolean) as WorkflowStep[]
    : [];

  return {
    id: typeof item.id === "string" && item.id.length > 0 ? item.id : `step-${index + 1}`,
    type: stepType,
    title: typeof item.title === "string" && item.title.length > 0 ? item.title : "Paso sin título",
    details: typeof item.details === "string" ? item.details : "",
    variableKey: typeof item.variableKey === "string" ? item.variableKey : variableOptionsByType[stepType][0]?.value,
    operator: typeof item.operator === "string" ? item.operator : "equals",
    comparisonValue: typeof item.comparisonValue === "string" ? item.comparisonValue : "",
    trueBranch: stepType === "condition" ? parsedTrue : undefined,
    falseBranch: stepType === "condition" ? parsedFalse : undefined,
  };
};

const parseStepsFromConfig = (config: unknown): WorkflowStep[] => {
  if (!config || typeof config !== "object") return [];
  const maybeSteps = (config as { steps?: unknown }).steps;
  if (!Array.isArray(maybeSteps)) return [];
  return maybeSteps.map((raw, index) => parseStep(raw, index)).filter(Boolean) as WorkflowStep[];
};

const createStep = (type: StepType): WorkflowStep => ({
  id: globalThis.crypto?.randomUUID?.() ?? `step-${Date.now()}`,
  type,
  title: stepDefaults[type].title,
  details: stepDefaults[type].details,
  variableKey: variableOptionsByType[type][0]?.value,
  operator: "equals",
  comparisonValue: type === "wait" ? "15" : "",
  trueBranch: type === "condition" ? [] : undefined,
  falseBranch: type === "condition" ? [] : undefined,
});

const serializeStep = (step: WorkflowStep) => ({
  id: step.id,
  type: step.type,
  title: step.title,
  details: step.details || "",
  variableKey: step.variableKey || "",
  operator: step.operator || "equals",
  comparisonValue: step.comparisonValue || "",
  ...(step.type === "condition"
    ? {
        trueBranch: (step.trueBranch || []).map(serializeStep),
        falseBranch: (step.falseBranch || []).map(serializeStep),
      }
    : {}),
});

const findStepById = (steps: WorkflowStep[], stepId: string | null): WorkflowStep | null => {
  if (!stepId) return null;
  for (const step of steps) {
    if (step.id === stepId) return step;
    if (step.type === "condition") {
      const foundInTrue = findStepById(step.trueBranch || [], stepId);
      if (foundInTrue) return foundInTrue;
      const foundInFalse = findStepById(step.falseBranch || [], stepId);
      if (foundInFalse) return foundInFalse;
    }
  }
  return null;
};

const updateStepInTree = (
  steps: WorkflowStep[],
  stepId: string,
  updater: (step: WorkflowStep) => WorkflowStep
): WorkflowStep[] => {
  return steps.map((step) => {
    if (step.id === stepId) return updater(step);
    if (step.type !== "condition") return step;
    return {
      ...step,
      trueBranch: updateStepInTree(step.trueBranch || [], stepId, updater),
      falseBranch: updateStepInTree(step.falseBranch || [], stepId, updater),
    };
  });
};

const removeStepInTree = (steps: WorkflowStep[], stepId: string): WorkflowStep[] => {
  return steps
    .filter((step) => step.id !== stepId)
    .map((step) => {
      if (step.type !== "condition") return step;
      return {
        ...step,
        trueBranch: removeStepInTree(step.trueBranch || [], stepId),
        falseBranch: removeStepInTree(step.falseBranch || [], stepId),
      };
    });
};

const addStepToBranch = (
  steps: WorkflowStep[],
  conditionId: string,
  branchKey: BranchKey,
  stepToAdd: WorkflowStep
): WorkflowStep[] => {
  return steps.map((step) => {
    if (step.id === conditionId && step.type === "condition") {
      return {
        ...step,
        [branchKey]: [...(step[branchKey] || []), stepToAdd],
      };
    }
    if (step.type !== "condition") return step;
    return {
      ...step,
      trueBranch: addStepToBranch(step.trueBranch || [], conditionId, branchKey, stepToAdd),
      falseBranch: addStepToBranch(step.falseBranch || [], conditionId, branchKey, stepToAdd),
    };
  });
};

const moveInArray = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const moveStepInConditionBranch = (
  steps: WorkflowStep[],
  conditionId: string,
  branchKey: BranchKey,
  fromIndex: number,
  direction: "up" | "down"
): WorkflowStep[] => {
  return steps.map((step) => {
    if (step.id === conditionId && step.type === "condition") {
      const branch = step[branchKey] || [];
      const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= branch.length) return step;
      return { ...step, [branchKey]: moveInArray(branch, fromIndex, toIndex) };
    }

    if (step.type !== "condition") return step;

    return {
      ...step,
      trueBranch: moveStepInConditionBranch(step.trueBranch || [], conditionId, branchKey, fromIndex, direction),
      falseBranch: moveStepInConditionBranch(step.falseBranch || [], conditionId, branchKey, fromIndex, direction),
    };
  });
};

const collectValidationErrors = (steps: WorkflowStep[], path = ""): string[] => {
  const errors: string[] = [];

  steps.forEach((step, index) => {
    const stepPath = `${path}${path ? " > " : ""}${typeLabelMap[step.type]} #${index + 1}`;

    if (!step.title.trim()) {
      errors.push(`${stepPath}: título obligatorio`);
    }

    if (step.type === "wait") {
      const minutes = Number(step.comparisonValue || "0");
      if (!Number.isFinite(minutes) || minutes <= 0) {
        errors.push(`${stepPath}: wait requiere minutos > 0`);
      }
    }

    if (step.type === "condition") {
      const trueBranch = step.trueBranch || [];
      const falseBranch = step.falseBranch || [];

      if (!trueBranch.length) {
        errors.push(`${stepPath}: falta al menos 1 bloque en rama TRUE`);
      }
      if (!falseBranch.length) {
        errors.push(`${stepPath}: falta al menos 1 bloque en rama FALSE`);
      }

      errors.push(...collectValidationErrors(trueBranch, `${stepPath} [TRUE]`));
      errors.push(...collectValidationErrors(falseBranch, `${stepPath} [FALSE]`));
    }
  });

  return errors;
};

export default function CrmAutomationEditor() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<EditorTab>("builder");
  const [executionStatusFilter, setExecutionStatusFilter] = useState<ExecutionStatusFilter>("all");

  const {
    data: workflow,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["crm-automation-workflow", currentCompany?.id, workflowId],
    queryFn: async () => {
      if (!currentCompany?.id || !workflowId) return null;

      const { data, error } = await (supabase as any)
        .from("crm_automation_workflows")
        .select("id, company_id, name, description, status, trigger_type, trigger_config, updated_at, is_active")
        .eq("company_id", currentCompany.id)
        .eq("id", workflowId)
        .maybeSingle();

      if (error) throw error;
      return (data as WorkflowRow | null) ?? null;
    },
    enabled: !!currentCompany?.id && !!workflowId,
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ["crm-automation-trigger-pipelines", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [] as PipelineRow[];

      const { data, error } = await supabase
        .from("crm_pipelines")
        .select("id, name, stages")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as PipelineRow[];
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: executions = [], isFetching: executionsLoading } = useQuery({
    queryKey: ["crm-automation-executions", currentCompany?.id, workflowId, executionStatusFilter, activeTab],
    queryFn: async () => {
      if (!currentCompany?.id || !workflowId) return [] as ExecutionRow[];

      let query = (supabase as any)
        .from("crm_automation_executions")
        .select("id, status, source_event_type, retry_count, last_error, created_at, started_at, finished_at")
        .eq("company_id", currentCompany.id)
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (executionStatusFilter !== "all") {
        query = query.eq("status", executionStatusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ExecutionRow[];
    },
    enabled: !!currentCompany?.id && !!workflowId && (activeTab === "history" || activeTab === "logs"),
  });

  const [hasLoadedInitialState, setHasLoadedInitialState] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggers, setTriggers] = useState<WorkflowTrigger[]>([
    {
      id: globalThis.crypto?.randomUUID?.() ?? "trigger-1",
      type: "opportunity_updated",
      filter: {},
    },
  ]);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings>(defaultWorkflowSettings);
  const [isPublished, setIsPublished] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isTriggerDialogOpen, setIsTriggerDialogOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  useEffect(() => {
    if (!workflow || hasLoadedInitialState) return;

    setName(workflow.name || "Workflow sin título");
    setDescription(workflow.description || "");
    const fallbackType: TriggerType =
      workflow.trigger_type === "pipeline_stage_changed" ? "pipeline_stage_changed" : "opportunity_updated";
    setTriggers(parseWorkflowTriggers(workflow.trigger_config, fallbackType));

    setWorkflowSettings(parseWorkflowSettings(workflow.trigger_config));

    const parsedSteps = parseStepsFromConfig(workflow.trigger_config);
    setSteps(parsedSteps);
    setSelectedStepId(parsedSteps[0]?.id ?? null);
    setIsPublished(workflow.status === "published");
    setHasLoadedInitialState(true);
  }, [workflow, hasLoadedInitialState]);

  const selectedStep = useMemo(() => findStepById(steps, selectedStepId), [steps, selectedStepId]);
  const primaryTrigger = triggers[0];
  const primaryTriggerPipeline = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === primaryTrigger?.filter.pipelineId) ?? null,
    [pipelines, primaryTrigger?.filter.pipelineId]
  );
  const triggerSummary = useMemo(() => {
    if (!primaryTrigger) return "Sin trigger configurado";

    const pipelineLabel = primaryTriggerPipeline?.name;
    const stageLabel = primaryTrigger.filter.stageName;
    const base = triggerOptions.find((option) => option.value === primaryTrigger.type)?.label || primaryTrigger.type;

    const filtered = pipelineLabel && stageLabel
      ? `${base} · Pipeline: ${pipelineLabel} · Etapa: ${stageLabel}`
      : pipelineLabel
        ? `${base} · Pipeline: ${pipelineLabel}`
        : stageLabel
          ? `${base} · Etapa: ${stageLabel}`
          : `${base} · Sin filtros`;

    return triggers.length > 1 ? `${filtered} (+${triggers.length - 1} trigger/s)` : filtered;
  }, [primaryTrigger, primaryTriggerPipeline?.name, triggers.length]);

  useEffect(() => {
    setTriggers((prev) =>
      prev.map((trigger) => {
        const pipeline = pipelines.find((item) => item.id === trigger.filter.pipelineId);
        const validStages = getStageNames(pipeline?.stages);

        if (!trigger.filter.stageName) return trigger;
        if (!trigger.filter.pipelineId) {
          return { ...trigger, filter: { ...trigger.filter, stageName: undefined } };
        }

        if (!validStages.includes(trigger.filter.stageName)) {
          return { ...trigger, filter: { ...trigger.filter, stageName: undefined } };
        }

        return trigger;
      })
    );
  }, [pipelines]);

  const saveMutation = useMutation({
    mutationFn: async (statusOverride?: "draft" | "published" | "archived") => {
      if (!currentCompany?.id || !workflowId) throw new Error("Workflow inválido");
      if (!name.trim()) throw new Error("El workflow necesita un nombre");

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? null;
      const nextStatus = statusOverride ?? (isPublished ? "published" : "draft");

      if (nextStatus === "published") {
        const validationErrors = [
          ...(triggers.length === 0 ? ["Debe existir al menos un trigger"] : []),
          ...(steps.length === 0 ? ["Debe existir al menos un bloque en el workflow"] : []),
          ...triggers
            .map((trigger, index) =>
              trigger.filter.stageName && !trigger.filter.pipelineId
                ? `Trigger #${index + 1}: si filtrás por etapa, también debés seleccionar pipeline`
                : ""
            )
            .filter(Boolean),
          ...collectValidationErrors(steps),
        ];

        if (validationErrors.length) {
          throw new Error(`No se puede publicar:\n- ${validationErrors.slice(0, 6).join("\n- ")}`);
        }
      }

      const primaryTriggerType = triggers[0]?.type || "opportunity_updated";

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        status: nextStatus,
        is_active: nextStatus !== "archived",
        trigger_type: primaryTriggerType,
        trigger_config: {
          triggerFilter: {
            pipelineId: triggers[0]?.filter.pipelineId || null,
            stageName: triggers[0]?.filter.stageName || null,
          },
          triggers: triggers.map((trigger) => ({
            id: trigger.id,
            type: trigger.type,
            filter: {
              pipelineId: trigger.filter.pipelineId || null,
              stageName: trigger.filter.stageName || null,
            },
          })),
          settings: {
            maxRetries: workflowSettings.maxRetries,
            retryBackoffSeconds: workflowSettings.retryBackoffSeconds,
          },
          steps: steps.map(serializeStep),
        },
        updated_by: userId,
      };

      const { error } = await (supabase as any)
        .from("crm_automation_workflows")
        .update(payload)
        .eq("company_id", currentCompany.id)
        .eq("id", workflowId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Workflow guardado");
      queryClient.invalidateQueries({ queryKey: ["crm-automation-workflow", currentCompany?.id, workflowId] });
      queryClient.invalidateQueries({ queryKey: ["crm-automation-workflows", currentCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ["crm-automation-executions", currentCompany?.id, workflowId] });
    },
    onError: (mutationError: any) => {
      toast.error(mutationError?.message || "No se pudo guardar el workflow");
    },
  });

  const addTopLevelStepAt = (index: number, type: StepType) => {
    const step = createStep(type);
    const next = [...steps];
    next.splice(index, 0, step);
    setSteps(next);
    setSelectedStepId(step.id);
    setEditingStepId(step.id);
  };

  const addStepInConditionBranch = (conditionId: string, branchKey: BranchKey, type: StepType) => {
    const step = createStep(type);
    setSteps((prev) => addStepToBranch(prev, conditionId, branchKey, step));
    setSelectedStepId(step.id);
    setEditingStepId(step.id);
  };

  const moveTopLevelStep = (index: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? index - 1 : index + 1;
    if (toIndex < 0 || toIndex >= steps.length) return;
    setSteps((prev) => moveInArray(prev, index, toIndex));
  };

  const moveBranchStep = (
    conditionId: string,
    branchKey: BranchKey,
    index: number,
    direction: "up" | "down"
  ) => {
    setSteps((prev) => moveStepInConditionBranch(prev, conditionId, branchKey, index, direction));
  };

  const updateStep = (stepId: string, patch: Partial<WorkflowStep>) => {
    setSteps((prev) => updateStepInTree(prev, stepId, (step) => ({ ...step, ...patch })));
  };

  const removeStep = (stepId: string) => {
    setSteps((prev) => {
      const next = removeStepInTree(prev, stepId);
      if (selectedStepId && !findStepById(next, selectedStepId)) {
        setSelectedStepId(null);
        setEditingStepId(null);
      }
      return next;
    });
  };

  if (!currentCompany) return null;

  return (
    <Layout>
      <div className="space-y-4">
        <div className="rounded-lg border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <Button variant="ghost" asChild className="h-auto px-0 text-muted-foreground">
              <Link to="/crm-automations">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Atrás a Flujos de trabajo
              </Link>
            </Button>

            <div className="min-w-[260px] flex-1 px-2">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mx-auto max-w-md border-none text-center text-base font-semibold shadow-none focus-visible:ring-0"
                placeholder="Automatización sin título"
              />
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveMutation.mutate("archived")}
                disabled={saveMutation.isPending || isLoading || !workflow}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archivar
              </Button>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Borrador</span>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                <span className="font-medium">Publicar</span>
              </div>

              <Button onClick={() => saveMutation.mutate(undefined)} disabled={saveMutation.isPending || isLoading || !workflow}>
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>

          <div className="px-4 py-2">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EditorTab)}>
              <TabsList className="h-9">
                <TabsTrigger value="builder">Creador</TabsTrigger>
                <TabsTrigger value="settings">Configuración</TabsTrigger>
                <TabsTrigger value="history">Historial de inscripciones</TabsTrigger>
                <TabsTrigger value="logs">Registros de ejecución</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">Cargando workflow...</CardContent>
          </Card>
        ) : isError ? (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">
              Error al cargar workflow: {(error as Error)?.message || "Error desconocido"}
            </CardContent>
          </Card>
        ) : !workflow ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">No se encontró el workflow.</CardContent>
          </Card>
        ) : activeTab === "builder" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="rounded-lg border bg-background lg:col-span-2">
              <div className="min-h-[700px] overflow-x-auto p-6 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:18px_18px]">
                <div className="mx-auto flex w-full min-w-[680px] max-w-4xl flex-col items-center">
                  <WorkflowNodeCard
                    title="Trigger"
                    subtitle={triggers.length > 1 ? `${triggers.length} triggers` : "1 trigger"}
                    details={triggerSummary}
                    status={workflow.status || "draft"}
                    icon={<Workflow className="h-4 w-4" />}
                    selected={!selectedStepId}
                    onClick={() => {
                      setSelectedStepId(null);
                      setIsTriggerDialogOpen(true);
                    }}
                  />

                  <ConnectorAddButton onAdd={(type) => addTopLevelStepAt(0, type)} />

                  {steps.map((step, index) => (
                    <div key={step.id} className="flex w-full flex-col items-center">
                      <WorkflowNodeCard
                        title={typeLabelMap[step.type]}
                        subtitle={step.title}
                        details={step.details}
                        icon={<GitBranch className="h-4 w-4" />}
                        selected={selectedStepId === step.id}
                        onClick={() => {
                          setSelectedStepId(step.id);
                          setEditingStepId(step.id);
                        }}
                        onDelete={() => removeStep(step.id)}
                        onMoveUp={index > 0 ? () => moveTopLevelStep(index, "up") : undefined}
                        onMoveDown={index < steps.length - 1 ? () => moveTopLevelStep(index, "down") : undefined}
                      />

                      {step.type === "condition" ? (
                        <>
                          <div className="mt-3 grid w-full max-w-3xl grid-cols-2 gap-4">
                            <BranchColumn
                              title="Branch True"
                              subtitle="Cuando la condición se cumple"
                              steps={step.trueBranch || []}
                              selectedStepId={selectedStepId}
                              onStepClick={(stepId) => {
                                setSelectedStepId(stepId);
                                setEditingStepId(stepId);
                              }}
                              onAdd={(type) => addStepInConditionBranch(step.id, "trueBranch", type)}
                              onDelete={removeStep}
                              onMove={(branchIndex, direction) =>
                                moveBranchStep(step.id, "trueBranch", branchIndex, direction)
                              }
                            />
                            <BranchColumn
                              title="Branch False"
                              subtitle="Cuando la condición no se cumple"
                              steps={step.falseBranch || []}
                              selectedStepId={selectedStepId}
                              onStepClick={(stepId) => {
                                setSelectedStepId(stepId);
                                setEditingStepId(stepId);
                              }}
                              onAdd={(type) => addStepInConditionBranch(step.id, "falseBranch", type)}
                              onDelete={removeStep}
                              onMove={(branchIndex, direction) =>
                                moveBranchStep(step.id, "falseBranch", branchIndex, direction)
                              }
                            />
                          </div>

                          <div className="mt-3 flex w-full max-w-3xl items-center justify-center">
                            <div className="rounded-md border border-primary/40 bg-muted/40 px-4 py-2 text-sm font-medium">
                              Join branches
                            </div>
                          </div>
                        </>
                      ) : null}

                      <ConnectorAddButton onAdd={(type) => addTopLevelStepAt(index + 1, type)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "settings" ? (
          <Card>
            <CardHeader>
              <CardTitle>Configuración de ejecución</CardTitle>
              <CardDescription>
                Política global de retries y backoff para este workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Reintentos máximos</Label>
                <Input
                  type="number"
                  min={0}
                  value={workflowSettings.maxRetries}
                  onChange={(event) =>
                    setWorkflowSettings((prev) => ({
                      ...prev,
                      maxRetries: Math.max(0, Number(event.target.value || 0)),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Backoff entre reintentos (segundos)</Label>
                <Input
                  type="number"
                  min={0}
                  value={workflowSettings.retryBackoffSeconds}
                  onChange={(event) =>
                    setWorkflowSettings((prev) => ({
                      ...prev,
                      retryBackoffSeconds: Math.max(0, Number(event.target.value || 0)),
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <ExecutionsPanel
            title={activeTab === "history" ? "Historial de inscripciones" : "Registros de ejecución"}
            executions={executions}
            loading={executionsLoading}
            statusFilter={executionStatusFilter}
            setStatusFilter={setExecutionStatusFilter}
          />
        )}

        <Dialog open={isTriggerDialogOpen} onOpenChange={setIsTriggerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configuración de trigger</DialogTitle>
              <DialogDescription>Editá descripción y agregá uno o más triggers.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="Objetivo del workflow"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Triggers</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTriggers((prev) => [
                        ...prev,
                        {
                          id: globalThis.crypto?.randomUUID?.() ?? `trigger-${Date.now()}`,
                          type: "opportunity_updated",
                          filter: {},
                        },
                      ])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar trigger
                  </Button>
                </div>

                {triggers.map((trigger, index) => {
                  const triggerPipeline = pipelines.find((pipeline) => pipeline.id === trigger.filter.pipelineId);
                  const triggerStages = getStageNames(triggerPipeline?.stages);

                  return (
                    <div key={trigger.id} className="space-y-3 rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Trigger #{index + 1}</p>
                        {triggers.length > 1 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTriggers((prev) => prev.filter((item) => item.id !== trigger.id))}
                          >
                            Eliminar
                          </Button>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={trigger.type}
                          onValueChange={(value) =>
                            setTriggers((prev) =>
                              prev.map((item) =>
                                item.id === trigger.id
                                  ? { ...item, type: value as TriggerType }
                                  : item
                              )
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar trigger" />
                          </SelectTrigger>
                          <SelectContent>
                            {triggerOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Filtrar por pipeline (opcional)</Label>
                        <Select
                          value={trigger.filter.pipelineId || "__all__"}
                          onValueChange={(value) =>
                            setTriggers((prev) =>
                              prev.map((item) =>
                                item.id === trigger.id
                                  ? {
                                      ...item,
                                      filter: {
                                        ...item.filter,
                                        pipelineId: value === "__all__" ? undefined : value,
                                        stageName: value === "__all__" ? undefined : item.filter.stageName,
                                      },
                                    }
                                  : item
                              )
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todas las pipelines" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todas las pipelines</SelectItem>
                            {pipelines.map((pipeline) => (
                              <SelectItem key={pipeline.id} value={pipeline.id}>
                                {pipeline.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Filtrar por etapa (opcional)</Label>
                        <Select
                          value={trigger.filter.stageName || "__all__"}
                          onValueChange={(value) =>
                            setTriggers((prev) =>
                              prev.map((item) =>
                                item.id === trigger.id
                                  ? {
                                      ...item,
                                      filter: {
                                        ...item.filter,
                                        stageName: value === "__all__" ? undefined : value,
                                      },
                                    }
                                  : item
                              )
                            )
                          }
                          disabled={!trigger.filter.pipelineId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todas las etapas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todas las etapas</SelectItem>
                            {triggerStages.map((stageName) => (
                              <SelectItem key={stageName} value={stageName}>
                                {stageName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTriggerDialogOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingStepId} onOpenChange={(open) => !open && setEditingStepId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar bloque</DialogTitle>
              <DialogDescription>
                Seleccioná variables y reglas para operar dentro del bloque.
              </DialogDescription>
            </DialogHeader>
            {selectedStep ? (
              <div className="space-y-4 py-1">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={selectedStep.type}
                    onValueChange={(value) => {
                      const nextType = value as StepType;
                      updateStep(selectedStep.id, {
                        type: nextType,
                        variableKey: variableOptionsByType[nextType][0]?.value,
                        comparisonValue: nextType === "wait" ? selectedStep.comparisonValue || "15" : selectedStep.comparisonValue,
                        trueBranch: nextType === "condition" ? selectedStep.trueBranch || [] : undefined,
                        falseBranch: nextType === "condition" ? selectedStep.falseBranch || [] : undefined,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de bloque" />
                    </SelectTrigger>
                    <SelectContent>
                      {stepTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Variable</Label>
                  <Select
                    value={selectedStep.variableKey || variableOptionsByType[selectedStep.type][0]?.value}
                    onValueChange={(value) => updateStep(selectedStep.id, { variableKey: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar variable" />
                    </SelectTrigger>
                    <SelectContent>
                      {variableOptionsByType[selectedStep.type].map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Operador</Label>
                    <Select
                      value={selectedStep.operator || "equals"}
                      onValueChange={(value) => updateStep(selectedStep.id, { operator: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Operador" />
                      </SelectTrigger>
                      <SelectContent>
                        {operatorOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{selectedStep.type === "wait" ? "Minutos" : "Valor"}</Label>
                    <Input
                      type={selectedStep.type === "wait" ? "number" : "text"}
                      min={selectedStep.type === "wait" ? 1 : undefined}
                      value={selectedStep.comparisonValue || ""}
                      onChange={(event) => updateStep(selectedStep.id, { comparisonValue: event.target.value })}
                      placeholder={selectedStep.type === "wait" ? "Ej: 15" : "Ej: propuesta"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Título del bloque</Label>
                  <Input
                    value={selectedStep.title}
                    onChange={(event) => updateStep(selectedStep.id, { title: event.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Detalle</Label>
                  <Textarea
                    value={selectedStep.details || ""}
                    onChange={(event) => updateStep(selectedStep.id, { details: event.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStepId(null)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function WorkflowNodeCard({
  title,
  subtitle,
  details,
  icon,
  selected,
  onClick,
  status,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  title: string;
  subtitle: string;
  details?: string;
  icon: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  status?: string;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <Card
      className={`w-full max-w-md cursor-pointer transition-colors ${selected ? "border-primary" : "hover:bg-muted/30"}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">{icon}</div>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
              {details ? <p className="mt-1 text-xs text-muted-foreground">{details}</p> : null}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {status ? <Badge variant={statusVariantMap[status] || "secondary"}>{status}</Badge> : null}

            {onMoveUp ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveUp();
                }}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            ) : null}

            {onMoveDown ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveDown();
                }}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            ) : null}

            {onDelete ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
              >
                ×
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectorAddButton({ onAdd }: { onAdd: (type: StepType) => void }) {
  return (
    <div className="flex flex-col items-center">
      <div className="h-5 w-px bg-border" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => onAdd("condition")}>Agregar condición</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAdd("action")}>Agregar acción</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAdd("response")}>Agregar respuesta</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAdd("wait")}>Agregar wait</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="h-5 w-px bg-border" />
    </div>
  );
}

function BranchColumn({
  title,
  subtitle,
  steps,
  selectedStepId,
  onStepClick,
  onAdd,
  onDelete,
  onMove,
}: {
  title: string;
  subtitle: string;
  steps: WorkflowStep[];
  selectedStepId: string | null;
  onStepClick: (stepId: string) => void;
  onAdd: (type: StepType) => void;
  onDelete: (stepId: string) => void;
  onMove: (index: number, direction: "up" | "down") => void;
}) {
  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <WorkflowNodeCard
            key={step.id}
            title={typeLabelMap[step.type]}
            subtitle={step.title}
            details={step.details}
            icon={<GitBranch className="h-4 w-4" />}
            selected={selectedStepId === step.id}
            onClick={() => onStepClick(step.id)}
            onDelete={() => onDelete(step.id)}
            onMoveUp={index > 0 ? () => onMove(index, "up") : undefined}
            onMoveDown={index < steps.length - 1 ? () => onMove(index, "down") : undefined}
          />
        ))}

        <div className="flex justify-center">
          <ConnectorAddButton onAdd={onAdd} />
        </div>
      </CardContent>
    </Card>
  );
}

function ExecutionsPanel({
  title,
  executions,
  loading,
  statusFilter,
  setStatusFilter,
}: {
  title: string;
  executions: ExecutionRow[];
  loading: boolean;
  statusFilter: ExecutionStatusFilter;
  setStatusFilter: (value: ExecutionStatusFilter) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Monitoreo de corridas del workflow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-56">
          <Label>Estado</Label>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ExecutionStatusFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="dead_letter">Dead letter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando ejecuciones...</div>
        ) : executions.length === 0 ? (
          <div className="text-sm text-muted-foreground">No hay ejecuciones para el filtro seleccionado.</div>
        ) : (
          <div className="space-y-3">
            {executions.map((execution) => (
              <div key={execution.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{execution.source_event_type || "event"}</p>
                    <p className="text-xs text-muted-foreground">{execution.id}</p>
                  </div>
                  <Badge variant={statusVariantMap[execution.status] || "secondary"}>{execution.status}</Badge>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>Creada: {formatDateTime(execution.created_at)}</span>
                  <span>Inicio: {formatDateTime(execution.started_at)}</span>
                  <span>Fin: {formatDateTime(execution.finished_at)}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Retries: {execution.retry_count ?? 0}</div>
                {execution.last_error ? (
                  <div className="mt-2 rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                    {execution.last_error}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
