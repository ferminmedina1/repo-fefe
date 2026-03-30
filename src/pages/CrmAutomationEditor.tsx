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

type TriggerType =
  | "opportunity_created"
  | "opportunity_updated"
  | "opportunity_deleted"
  | "opportunity_stage_changed"
  | "opportunity_owner_changed"
  | "opportunity_value_changed"
  | "opportunity_probability_changed"
  | "opportunity_custom_field_changed"
  | "pipeline_stage_changed"
  | "activity_created"
  | "activity_completed"
  | "message_status_changed"
  | "schedule_cron"
  | "schedule_interval"
  | "schedule_daily"
  | "schedule_weekly"
  | "schedule_monthly"
  | "opportunity_stagnant"
  | "sla_breached"
  | "activity_overdue"
  | "manual_trigger"
  | "webhook_received"
  | "api_invoked";
type StepType = "condition" | "action" | "response" | "wait";
type BranchKey = "trueBranch" | "falseBranch";
type EditorTab = "builder" | "settings" | "history" | "logs";
type TriggerEvaluationMode = "any" | "all";
type TriggerGroupLogic = "all" | "any";
type TriggerConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null"
  | "is_empty"
  | "is_not_empty"
  | "before"
  | "after"
  | "between"
  | "within_next"
  | "within_last"
  | "changed"
  | "changed_from"
  | "changed_to"
  | "changed_by";
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

type TriggerSchedule = {
  timezone: string;
  cron?: string;
  intervalMinutes?: number;
  runAt?: string;
  daysOfWeek?: string;
  dayOfMonth?: number;
};

type TriggerCondition = {
  id: string;
  field: string;
  op: TriggerConditionOperator;
  value?: string;
};

type TriggerFilterGroup = {
  id: string;
  logic: TriggerGroupLogic;
  conditions: TriggerCondition[];
};

type WorkflowTrigger = {
  id: string;
  type: TriggerType;
  enabled: boolean;
  filter: TriggerFilter;
  filterGroupId?: string;
  schedule?: TriggerSchedule;
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

type OpportunityCustomFieldDefinitionOptionRow = {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  options: string[] | null;
  is_active: boolean;
  sort_order: number;
};

type ConditionInputKind = "text" | "number" | "date" | "boolean" | "pipeline" | "stage" | "select";

type TriggerConditionFieldOption = {
  value: string;
  label: string;
  allowedOperators: TriggerConditionOperator[];
  inputKind: ConditionInputKind;
  selectOptions?: { value: string; label: string }[];
};

const triggerOptions: { value: TriggerType; label: string }[] = [
  { value: "opportunity_created", label: "Opportunity created" },
  { value: "opportunity_updated", label: "Opportunity updated" },
  { value: "opportunity_deleted", label: "Opportunity deleted" },
  { value: "opportunity_stage_changed", label: "Opportunity stage changed" },
  { value: "opportunity_owner_changed", label: "Opportunity owner changed" },
  { value: "opportunity_value_changed", label: "Opportunity value changed" },
  { value: "opportunity_probability_changed", label: "Opportunity probability changed" },
  { value: "opportunity_custom_field_changed", label: "Opportunity custom field changed" },
  { value: "pipeline_stage_changed", label: "Pipeline stage changed" },
  { value: "activity_created", label: "Activity created" },
  { value: "activity_completed", label: "Activity completed" },
  { value: "message_status_changed", label: "Message status changed" },
  { value: "schedule_cron", label: "Schedule (cron)" },
  { value: "schedule_interval", label: "Schedule (interval)" },
  { value: "schedule_daily", label: "Schedule (daily)" },
  { value: "schedule_weekly", label: "Schedule (weekly)" },
  { value: "schedule_monthly", label: "Schedule (monthly)" },
  { value: "opportunity_stagnant", label: "Opportunity stagnant" },
  { value: "sla_breached", label: "SLA breached" },
  { value: "activity_overdue", label: "Activity overdue" },
  { value: "manual_trigger", label: "Manual trigger" },
  { value: "webhook_received", label: "Webhook received" },
  { value: "api_invoked", label: "API invoked" },
];

const triggerTypesWithStageFilter = new Set<TriggerType>([
  "opportunity_updated",
  "pipeline_stage_changed",
  "opportunity_stage_changed",
]);

const scheduleTriggerTypes = new Set<TriggerType>([
  "schedule_cron",
  "schedule_interval",
  "schedule_daily",
  "schedule_weekly",
  "schedule_monthly",
]);

const textConditionOperators: TriggerConditionOperator[] = [
  "eq",
  "neq",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "in",
  "not_in",
  "is_empty",
  "is_not_empty",
  "is_null",
  "is_not_null",
  "changed",
  "changed_from",
  "changed_to",
  "changed_by",
];

const numberConditionOperators: TriggerConditionOperator[] = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "in",
  "not_in",
  "is_null",
  "is_not_null",
  "changed",
  "changed_from",
  "changed_to",
  "changed_by",
];

const dateConditionOperators: TriggerConditionOperator[] = [
  "eq",
  "neq",
  "before",
  "after",
  "between",
  "within_next",
  "within_last",
  "is_null",
  "is_not_null",
  "is_empty",
  "is_not_empty",
  "changed",
  "changed_from",
  "changed_to",
  "changed_by",
];

const booleanConditionOperators: TriggerConditionOperator[] = [
  "eq",
  "neq",
  "is_null",
  "is_not_null",
  "changed",
  "changed_from",
  "changed_to",
  "changed_by",
];

const noValueTriggerConditionOperators = new Set<TriggerConditionOperator>([
  "is_null",
  "is_not_null",
  "is_empty",
  "is_not_empty",
  "changed",
]);

const baseTriggerConditionFieldOptions: TriggerConditionFieldOption[] = [
  {
    value: "pipeline_id",
    label: "Pipeline",
    allowedOperators: ["eq", "neq"],
    inputKind: "pipeline",
  },
  {
    value: "stage",
    label: "Stage",
    allowedOperators: ["eq", "neq", "changed"],
    inputKind: "stage",
  },
  {
    value: "owner_id",
    label: "Owner",
    allowedOperators: ["eq", "neq", "in", "not_in", "is_null", "is_not_null"],
    inputKind: "text",
  },
  {
    value: "value",
    label: "Value",
    allowedOperators: numberConditionOperators,
    inputKind: "number",
  },
  {
    value: "probability",
    label: "Probability",
    allowedOperators: numberConditionOperators,
    inputKind: "number",
  },
  {
    value: "estimated_close_date",
    label: "Estimated close date",
    allowedOperators: dateConditionOperators,
    inputKind: "date",
  },
  {
    value: "custom_fields.priority",
    label: "Custom field: priority",
    allowedOperators: textConditionOperators,
    inputKind: "text",
  },
  {
    value: "activity.type",
    label: "Activity type",
    allowedOperators: textConditionOperators,
    inputKind: "text",
  },
  {
    value: "message.status",
    label: "Message status",
    allowedOperators: textConditionOperators,
    inputKind: "text",
  },
];

const triggerConditionOperatorOptions: { value: TriggerConditionOperator; label: string }[] = [
  { value: "eq", label: "IS" },
  { value: "neq", label: "IS NOT" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Not contains" },
  { value: "starts_with", label: "Starts with" },
  { value: "ends_with", label: "Ends with" },
  { value: "in", label: "In" },
  { value: "not_in", label: "Not in" },
  { value: "is_null", label: "Is null" },
  { value: "is_not_null", label: "Is not null" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "between", label: "Between" },
  { value: "within_next", label: "Within next" },
  { value: "within_last", label: "Within last" },
  { value: "changed", label: "Changed" },
  { value: "changed_from", label: "Changed from" },
  { value: "changed_to", label: "Changed to" },
  { value: "changed_by", label: "Changed by" },
];

const triggerConditionOperatorLabelMap = new Map<TriggerConditionOperator, string>(
  triggerConditionOperatorOptions.map((operator) => [operator.value, operator.label])
);

const defaultTriggerConditionFieldOption: TriggerConditionFieldOption = {
  value: "pipeline_id",
  label: "Pipeline",
  allowedOperators: ["eq", "neq"],
  inputKind: "pipeline",
};

const operatorRequiresValue = (operator: TriggerConditionOperator) =>
  !noValueTriggerConditionOperators.has(operator);

const getOperatorLabelForField = (field: string, operator: TriggerConditionOperator) => {
  if (field === "stage" && operator === "changed") return "Stage changed";
  return triggerConditionOperatorLabelMap.get(operator) || operator;
};

const buildCustomFieldConditionOption = (
  field: OpportunityCustomFieldDefinitionOptionRow
): TriggerConditionFieldOption => {
  const normalizedType = (field.field_type || "text").toLowerCase();
  const parsedOptions = Array.isArray(field.options)
    ? field.options
        .filter((option): option is string => typeof option === "string" && option.trim().length > 0)
        .map((option) => ({ value: option, label: option }))
    : [];

  if (["number", "currency", "amount", "decimal", "integer"].includes(normalizedType)) {
    return {
      value: `custom_fields.${field.field_key}`,
      label: `Custom field: ${field.label || field.field_key}`,
      allowedOperators: numberConditionOperators,
      inputKind: "number",
    };
  }

  if (["date", "datetime", "timestamp"].includes(normalizedType)) {
    return {
      value: `custom_fields.${field.field_key}`,
      label: `Custom field: ${field.label || field.field_key}`,
      allowedOperators: dateConditionOperators,
      inputKind: "date",
    };
  }

  if (["boolean", "checkbox", "toggle"].includes(normalizedType)) {
    return {
      value: `custom_fields.${field.field_key}`,
      label: `Custom field: ${field.label || field.field_key}`,
      allowedOperators: booleanConditionOperators,
      inputKind: "boolean",
      selectOptions: [
        { value: "true", label: "True" },
        { value: "false", label: "False" },
      ],
    };
  }

  if (["select", "enum", "dropdown", "radio"].includes(normalizedType) && parsedOptions.length > 0) {
    return {
      value: `custom_fields.${field.field_key}`,
      label: `Custom field: ${field.label || field.field_key}`,
      allowedOperators: ["eq", "neq", "is_empty", "is_not_empty"],
      inputKind: "select",
      selectOptions: parsedOptions,
    };
  }

  return {
    value: `custom_fields.${field.field_key}`,
    label: `Custom field: ${field.label || field.field_key}`,
    allowedOperators: textConditionOperators,
    inputKind: "text",
  };
};

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

const makeTriggerId = () => globalThis.crypto?.randomUUID?.() ?? `trigger-${Date.now()}`;
const makeConditionId = () => globalThis.crypto?.randomUUID?.() ?? `condition-${Date.now()}`;
const makeFilterGroupId = () => globalThis.crypto?.randomUUID?.() ?? `filter-group-${Date.now()}`;

const isScheduleTriggerType = (type: TriggerType) => scheduleTriggerTypes.has(type);

const getDefaultSchedule = (type: TriggerType): TriggerSchedule | undefined => {
  if (!isScheduleTriggerType(type)) return undefined;
  const base: TriggerSchedule = {
    timezone: "America/Argentina/Buenos_Aires",
    runAt: "09:00",
  };

  if (type === "schedule_cron") return { ...base, cron: "0 0 9 * * 1-5" };
  if (type === "schedule_interval") return { ...base, intervalMinutes: 60 };
  if (type === "schedule_weekly") return { ...base, daysOfWeek: "1,2,3,4,5" };
  if (type === "schedule_monthly") return { ...base, dayOfMonth: 1 };
  return base;
};

const makeDefaultTriggerCondition = (): TriggerCondition => ({
  id: makeConditionId(),
  field: "pipeline_id",
  op: "eq",
  value: "",
});

const makeDefaultFilterGroup = (): TriggerFilterGroup => ({
  id: makeFilterGroupId(),
  logic: "all",
  conditions: [makeDefaultTriggerCondition()],
});

const makeDefaultTrigger = (filterGroupId?: string): WorkflowTrigger => ({
  id: makeTriggerId(),
  type: "opportunity_updated",
  enabled: true,
  filter: {},
  filterGroupId,
});

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

const parseTriggerCondition = (raw: unknown, index: number): TriggerCondition => {
  const parsed = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawOp = typeof parsed.op === "string" ? parsed.op : "eq";

  const supportedOps = new Set(triggerConditionOperatorOptions.map((item) => item.value));
  const op = supportedOps.has(rawOp as TriggerConditionOperator)
    ? (rawOp as TriggerConditionOperator)
    : "eq";

  return {
    id:
      typeof parsed.id === "string" && parsed.id.length > 0
        ? parsed.id
        : `condition-${index + 1}`,
    field:
      typeof parsed.field === "string" && parsed.field.length > 0
        ? parsed.field
        : "pipeline_id",
    op,
    value: typeof parsed.value === "string" ? parsed.value : "",
  };
};

const parseFilterGroups = (config: unknown): TriggerFilterGroup[] => {
  if (!config || typeof config !== "object") return [makeDefaultFilterGroup()];
  const maybeGroups = (config as { filterGroups?: unknown }).filterGroups;
  if (!Array.isArray(maybeGroups) || maybeGroups.length === 0) {
    return [makeDefaultFilterGroup()];
  }

  const parsed = maybeGroups.map((rawGroup, groupIndex) => {
    const group = rawGroup && typeof rawGroup === "object" ? (rawGroup as Record<string, unknown>) : {};
    const logic = group.logic === "any" ? "any" : "all";
    const rawConditions = Array.isArray(group.conditions) ? group.conditions : [];

    return {
      id:
        typeof group.id === "string" && group.id.length > 0
          ? group.id
          : `filter-group-${groupIndex + 1}`,
      logic,
      conditions: rawConditions.length
        ? rawConditions.map((condition, conditionIndex) => parseTriggerCondition(condition, conditionIndex))
        : [makeDefaultTriggerCondition()],
    } as TriggerFilterGroup;
  });

  return parsed.length ? parsed : [makeDefaultFilterGroup()];
};

const parseTriggerEvaluationMode = (config: unknown): TriggerEvaluationMode => {
  if (!config || typeof config !== "object") return "any";
  const evaluation = (config as { evaluation?: unknown }).evaluation;
  if (!evaluation || typeof evaluation !== "object") return "any";
  const mode = (evaluation as { mode?: unknown }).mode;
  return mode === "all" ? "all" : "any";
};

const parseTriggerSchedule = (raw: unknown, type: TriggerType): TriggerSchedule | undefined => {
  if (!isScheduleTriggerType(type)) return undefined;

  const defaults = getDefaultSchedule(type);
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    timezone:
      typeof source.timezone === "string" && source.timezone.length > 0
        ? source.timezone
        : defaults?.timezone || "America/Argentina/Buenos_Aires",
    cron: typeof source.cron === "string" ? source.cron : defaults?.cron,
    intervalMinutes:
      Number.isFinite(Number(source.intervalMinutes)) && Number(source.intervalMinutes) > 0
        ? Number(source.intervalMinutes)
        : defaults?.intervalMinutes,
    runAt: typeof source.runAt === "string" ? source.runAt : defaults?.runAt,
    daysOfWeek: typeof source.daysOfWeek === "string" ? source.daysOfWeek : defaults?.daysOfWeek,
    dayOfMonth:
      Number.isFinite(Number(source.dayOfMonth)) && Number(source.dayOfMonth) > 0
        ? Number(source.dayOfMonth)
        : defaults?.dayOfMonth,
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
            enabled?: unknown;
            filterGroupId?: unknown;
            schedule?: unknown;
            filter?: unknown;
            pipelineId?: unknown;
            stageName?: unknown;
          };

          const supportedTypes = new Set(triggerOptions.map((option) => option.value));
          const type = supportedTypes.has(item.type as TriggerType)
            ? (item.type as TriggerType)
            : fallbackTriggerType;

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
            enabled: item.enabled !== false,
            filter: {
              pipelineId: nestedFilter.pipelineId || legacyFilter.pipelineId,
              stageName: nestedFilter.stageName || legacyFilter.stageName,
            },
            filterGroupId:
              typeof item.filterGroupId === "string" && item.filterGroupId.length > 0
                ? item.filterGroupId
                : undefined,
            schedule: parseTriggerSchedule(item.schedule, type),
          } as WorkflowTrigger;
        })
        .filter(Boolean) as WorkflowTrigger[];

      if (parsed.length) return parsed;
    }
  }

  return [
    {
      id: makeTriggerId(),
      type: fallbackTriggerType,
      enabled: true,
      filter: parseTriggerFilter(config),
      schedule: parseTriggerSchedule(undefined, fallbackTriggerType),
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

      const { data, error } = await supabase
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

      let query = supabase
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

  const { data: opportunityCustomFieldDefinitions = [] } = useQuery({
    queryKey: ["crm-automation-opportunity-custom-fields", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [] as OpportunityCustomFieldDefinitionOptionRow[];

      const { data, error } = await supabase
        .from("crm_opportunity_custom_field_definitions")
        .select("id, field_key, label, field_type, options, is_active, sort_order")
        .eq("company_id", currentCompany.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as OpportunityCustomFieldDefinitionOptionRow[];
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const triggerConditionFieldOptions = useMemo(() => {
    const dynamicCustomFieldOptions = opportunityCustomFieldDefinitions
      .filter((field) => field.field_key)
      .map((field) => buildCustomFieldConditionOption(field));

    const deduped = new Map<string, TriggerConditionFieldOption>();
    [...baseTriggerConditionFieldOptions, ...dynamicCustomFieldOptions].forEach((option) => {
      if (!deduped.has(option.value)) {
        deduped.set(option.value, option);
      }
    });

    return Array.from(deduped.values());
  }, [opportunityCustomFieldDefinitions]);

  const triggerConditionFieldOptionMap = useMemo(
    () => new Map(triggerConditionFieldOptions.map((option) => [option.value, option])),
    [triggerConditionFieldOptions]
  );

  const availableStageOptions = useMemo(() => {
    const deduped = new Set<string>();

    pipelines.forEach((pipeline) => {
      getStageNames(pipeline.stages).forEach((stageName) => {
        if (stageName) deduped.add(stageName);
      });
    });

    return Array.from(deduped).sort((a, b) => a.localeCompare(b));
  }, [pipelines]);

  const [hasLoadedInitialState, setHasLoadedInitialState] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvaluationMode, setTriggerEvaluationMode] = useState<TriggerEvaluationMode>("any");
  const [filterGroups, setFilterGroups] = useState<TriggerFilterGroup[]>([makeDefaultFilterGroup()]);
  const [triggers, setTriggers] = useState<WorkflowTrigger[]>([makeDefaultTrigger()]);
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
      triggerOptions.some((option) => option.value === workflow.trigger_type)
        ? (workflow.trigger_type as TriggerType)
        : "opportunity_updated";
    const parsedFilterGroups = parseFilterGroups(workflow.trigger_config);
    setFilterGroups(parsedFilterGroups);
    setTriggerEvaluationMode(parseTriggerEvaluationMode(workflow.trigger_config));

    const parsedTriggers = parseWorkflowTriggers(workflow.trigger_config, fallbackType).map((trigger) => ({
      ...trigger,
      filterGroupId:
        trigger.filterGroupId && parsedFilterGroups.some((group) => group.id === trigger.filterGroupId)
          ? trigger.filterGroupId
          : parsedFilterGroups[0]?.id,
    }));
    setTriggers(parsedTriggers);

    setWorkflowSettings(parseWorkflowSettings(workflow.trigger_config));

    const parsedSteps = parseStepsFromConfig(workflow.trigger_config);
    setSteps(parsedSteps);
    setSelectedStepId(parsedSteps[0]?.id ?? null);
    setIsPublished(workflow.status === "published");
    setHasLoadedInitialState(true);
  }, [workflow, hasLoadedInitialState]);

  useEffect(() => {
    setFilterGroups((prev) => {
      let hasChanges = false;

      const next = prev.map((group) => ({
        ...group,
        conditions: group.conditions.map((condition) => {
          const fieldOption =
            triggerConditionFieldOptionMap.get(condition.field) || defaultTriggerConditionFieldOption;
          const fallbackOperator = fieldOption.allowedOperators[0] || "eq";
          const nextOperator = fieldOption.allowedOperators.includes(condition.op)
            ? condition.op
            : fallbackOperator;
          const nextValue = operatorRequiresValue(nextOperator) ? condition.value : "";

          if (nextOperator !== condition.op || nextValue !== condition.value) {
            hasChanges = true;
            return {
              ...condition,
              op: nextOperator,
              value: nextValue,
            };
          }

          return condition;
        }),
      }));

      return hasChanges ? next : prev;
    });
  }, [triggerConditionFieldOptionMap]);

  const selectedStep = useMemo(() => findStepById(steps, selectedStepId), [steps, selectedStepId]);
  const primaryTrigger = triggers[0];
  const primaryTriggerPipeline = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === primaryTrigger?.filter.pipelineId) ?? null,
    [pipelines, primaryTrigger?.filter.pipelineId]
  );
  const triggerSummary = useMemo(() => {
    if (!primaryTrigger) return "Sin trigger configurado";

    const enabledCount = triggers.filter((trigger) => trigger.enabled).length;
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

    const triggerCountLabel =
      triggers.length > 1 ? `${filtered} (+${triggers.length - 1} trigger/s)` : filtered;
    return `${triggerCountLabel} · ${enabledCount} activo/s · modo ${triggerEvaluationMode.toUpperCase()}`;
  }, [primaryTrigger, primaryTriggerPipeline?.name, triggerEvaluationMode, triggers]);

  useEffect(() => {
    setTriggers((prev) =>
      prev.map((trigger) => {
        if (!triggerTypesWithStageFilter.has(trigger.type)) {
          return {
            ...trigger,
            filter: {
              pipelineId: undefined,
              stageName: undefined,
            },
          };
        }

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
        const enabledTriggers = triggers.filter((trigger) => trigger.enabled);
        const validationErrors = [
          ...(enabledTriggers.length === 0 ? ["Debe existir al menos un trigger habilitado"] : []),
          ...(steps.length === 0 ? ["Debe existir al menos un bloque en el workflow"] : []),
          ...enabledTriggers
            .map((trigger, index) =>
              triggerTypesWithStageFilter.has(trigger.type) && trigger.filter.stageName && !trigger.filter.pipelineId
                ? `Trigger #${index + 1}: si filtrás por etapa, también debés seleccionar pipeline`
                : ""
            )
            .filter(Boolean),
          ...enabledTriggers
            .map((trigger, index) => {
              if (!isScheduleTriggerType(trigger.type)) return "";
              if (!trigger.schedule?.timezone?.trim()) {
                return `Trigger #${index + 1}: timezone obligatorio`;
              }
              if (trigger.type === "schedule_cron" && !trigger.schedule?.cron?.trim()) {
                return `Trigger #${index + 1}: cron obligatorio`;
              }
              if (trigger.type === "schedule_interval" && (!trigger.schedule?.intervalMinutes || trigger.schedule.intervalMinutes <= 0)) {
                return `Trigger #${index + 1}: intervalMinutes debe ser mayor a 0`;
              }
              return "";
            })
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
          evaluation: {
            mode: triggerEvaluationMode,
          },
          triggerFilter: {
            pipelineId: triggers[0]?.filter.pipelineId || null,
            stageName: triggers[0]?.filter.stageName || null,
          },
          triggers: triggers.map((trigger) => ({
            id: trigger.id,
            type: trigger.type,
            enabled: trigger.enabled,
            filterGroupId: trigger.filterGroupId || null,
            filter: {
              pipelineId: trigger.filter.pipelineId || null,
              stageName: trigger.filter.stageName || null,
            },
            schedule: isScheduleTriggerType(trigger.type)
              ? {
                  timezone: trigger.schedule?.timezone || "America/Argentina/Buenos_Aires",
                  cron: trigger.schedule?.cron || null,
                  intervalMinutes: trigger.schedule?.intervalMinutes || null,
                  runAt: trigger.schedule?.runAt || null,
                  daysOfWeek: trigger.schedule?.daysOfWeek || null,
                  dayOfMonth: trigger.schedule?.dayOfMonth || null,
                }
              : null,
          })),
          filterGroups: filterGroups.map((group) => ({
            id: group.id,
            logic: group.logic,
            conditions: group.conditions.map((condition) => ({
              id: condition.id,
              field: condition.field,
              op: condition.op,
              value: condition.value || "",
            })),
          })),
          settings: {
            maxRetries: workflowSettings.maxRetries,
            retryBackoffSeconds: workflowSettings.retryBackoffSeconds,
          },
          steps: steps.map(serializeStep),
        },
        updated_by: userId,
      };

      const { error } = await supabase
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

  const addFilterGroup = () => {
    const group = makeDefaultFilterGroup();
    setFilterGroups((prev) => [...prev, group]);
    setTriggers((prev) =>
      prev.map((trigger) =>
        trigger.filterGroupId
          ? trigger
          : { ...trigger, filterGroupId: group.id }
      )
    );
  };

  const removeFilterGroup = (groupId: string) => {
    setFilterGroups((prev) => {
      const next = prev.filter((group) => group.id !== groupId);
      return next.length ? next : [makeDefaultFilterGroup()];
    });

    setTriggers((prev) => {
      const fallbackGroupId = filterGroups.find((group) => group.id !== groupId)?.id;
      return prev.map((trigger) =>
        trigger.filterGroupId === groupId
          ? { ...trigger, filterGroupId: fallbackGroupId }
          : trigger
      );
    });
  };

  const addConditionToGroup = (groupId: string) => {
    setFilterGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, conditions: [...group.conditions, makeDefaultTriggerCondition()] }
          : group
      )
    );
  };

  const updateConditionInGroup = (
    groupId: string,
    conditionId: string,
    patch: Partial<TriggerCondition>
  ) => {
    setFilterGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.map((condition) =>
                condition.id === conditionId ? { ...condition, ...patch } : condition
              ),
            }
          : group
      )
    );
  };

  const removeConditionFromGroup = (groupId: string, conditionId: string) => {
    setFilterGroups((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group;
        const nextConditions = group.conditions.filter((condition) => condition.id !== conditionId);
        return {
          ...group,
          conditions: nextConditions.length ? nextConditions : [makeDefaultTriggerCondition()],
        };
      })
    );
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
          <DialogContent className="flex max-h-[90vh] w-[96vw] flex-col overflow-hidden p-0 sm:max-w-4xl">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>Configuración de trigger</DialogTitle>
              <DialogDescription>Editá descripción y agregá uno o más triggers.</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-1">
              <div className="space-y-4 pb-4">
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
                        makeDefaultTrigger(filterGroups[0]?.id),
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
                  const isScheduleTrigger = isScheduleTriggerType(trigger.type);
                  const selectedFilterGroup = filterGroups.find((group) => group.id === trigger.filterGroupId);

                  return (
                    <div key={trigger.id} className="space-y-3 rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Trigger #{index + 1}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Habilitado</span>
                            <Switch
                              checked={trigger.enabled}
                              onCheckedChange={(checked) =>
                                setTriggers((prev) =>
                                  prev.map((item) =>
                                    item.id === trigger.id ? { ...item, enabled: checked } : item
                                  )
                                )
                              }
                            />
                          </div>
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
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={trigger.type}
                          onValueChange={(value) => {
                            const nextType = value as TriggerType;
                            setTriggers((prev) =>
                              prev.map((item) =>
                                item.id === trigger.id
                                  ? {
                                      ...item,
                                      type: nextType,
                                      schedule: parseTriggerSchedule(item.schedule, nextType),
                                      filter: triggerTypesWithStageFilter.has(nextType)
                                        ? item.filter
                                        : { pipelineId: undefined, stageName: undefined },
                                    }
                                  : item
                              )
                            )
                          }}
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
                        <Label>Grupo de filtros lógicos</Label>
                        <Select
                          value={selectedFilterGroup?.id || "__none__"}
                          onValueChange={(value) =>
                            setTriggers((prev) =>
                              prev.map((item) =>
                                item.id === trigger.id
                                  ? {
                                      ...item,
                                      filterGroupId: value === "__none__" ? undefined : value,
                                    }
                                  : item
                              )
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sin grupo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin grupo</SelectItem>
                            {filterGroups.map((group, groupIndex) => (
                              <SelectItem key={group.id} value={group.id}>
                                Grupo #{groupIndex + 1} ({group.logic.toUpperCase()})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {isScheduleTrigger ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Timezone</Label>
                            <Input
                              value={trigger.schedule?.timezone || ""}
                              onChange={(event) =>
                                setTriggers((prev) =>
                                  prev.map((item) =>
                                    item.id === trigger.id
                                      ? {
                                          ...item,
                                          schedule: {
                                            ...(parseTriggerSchedule(item.schedule, item.type) || {
                                              timezone: "America/Argentina/Buenos_Aires",
                                            }),
                                            timezone: event.target.value,
                                          },
                                        }
                                      : item
                                  )
                                )
                              }
                              placeholder="America/Argentina/Buenos_Aires"
                            />
                          </div>

                          {trigger.type === "schedule_cron" ? (
                            <div className="space-y-2 sm:col-span-2">
                              <Label>CRON (con segundos)</Label>
                              <Input
                                value={trigger.schedule?.cron || ""}
                                onChange={(event) =>
                                  setTriggers((prev) =>
                                    prev.map((item) =>
                                      item.id === trigger.id
                                        ? {
                                            ...item,
                                            schedule: {
                                              ...(parseTriggerSchedule(item.schedule, item.type) || {
                                                timezone: "America/Argentina/Buenos_Aires",
                                              }),
                                              cron: event.target.value,
                                            },
                                          }
                                        : item
                                    )
                                  )
                                }
                                placeholder="0 0 9 * * 1-5"
                              />
                            </div>
                          ) : null}

                          {trigger.type === "schedule_interval" ? (
                            <div className="space-y-2 sm:col-span-2">
                              <Label>Intervalo (minutos)</Label>
                              <Input
                                type="number"
                                min={1}
                                value={trigger.schedule?.intervalMinutes || ""}
                                onChange={(event) =>
                                  setTriggers((prev) =>
                                    prev.map((item) =>
                                      item.id === trigger.id
                                        ? {
                                            ...item,
                                            schedule: {
                                              ...(parseTriggerSchedule(item.schedule, item.type) || {
                                                timezone: "America/Argentina/Buenos_Aires",
                                              }),
                                              intervalMinutes: Math.max(1, Number(event.target.value || 1)),
                                            },
                                          }
                                        : item
                                    )
                                  )
                                }
                              />
                            </div>
                          ) : null}

                          {(trigger.type === "schedule_daily" ||
                            trigger.type === "schedule_weekly" ||
                            trigger.type === "schedule_monthly") ? (
                            <div className="space-y-2">
                              <Label>Hora</Label>
                              <Input
                                type="time"
                                value={trigger.schedule?.runAt || "09:00"}
                                onChange={(event) =>
                                  setTriggers((prev) =>
                                    prev.map((item) =>
                                      item.id === trigger.id
                                        ? {
                                            ...item,
                                            schedule: {
                                              ...(parseTriggerSchedule(item.schedule, item.type) || {
                                                timezone: "America/Argentina/Buenos_Aires",
                                              }),
                                              runAt: event.target.value,
                                            },
                                          }
                                        : item
                                    )
                                  )
                                }
                              />
                            </div>
                          ) : null}

                          {trigger.type === "schedule_weekly" ? (
                            <div className="space-y-2">
                              <Label>Días semana (0-6 CSV)</Label>
                              <Input
                                value={trigger.schedule?.daysOfWeek || "1,2,3,4,5"}
                                onChange={(event) =>
                                  setTriggers((prev) =>
                                    prev.map((item) =>
                                      item.id === trigger.id
                                        ? {
                                            ...item,
                                            schedule: {
                                              ...(parseTriggerSchedule(item.schedule, item.type) || {
                                                timezone: "America/Argentina/Buenos_Aires",
                                              }),
                                              daysOfWeek: event.target.value,
                                            },
                                          }
                                        : item
                                    )
                                  )
                                }
                                placeholder="1,2,3,4,5"
                              />
                            </div>
                          ) : null}

                          {trigger.type === "schedule_monthly" ? (
                            <div className="space-y-2">
                              <Label>Día del mes</Label>
                              <Input
                                type="number"
                                min={1}
                                max={31}
                                value={trigger.schedule?.dayOfMonth || 1}
                                onChange={(event) =>
                                  setTriggers((prev) =>
                                    prev.map((item) =>
                                      item.id === trigger.id
                                        ? {
                                            ...item,
                                            schedule: {
                                              ...(parseTriggerSchedule(item.schedule, item.type) || {
                                                timezone: "America/Argentina/Buenos_Aires",
                                              }),
                                              dayOfMonth: Math.min(31, Math.max(1, Number(event.target.value || 1))),
                                            },
                                          }
                                        : item
                                    )
                                  )
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}

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
                          disabled={!trigger.filter.pipelineId || !triggerTypesWithStageFilter.has(trigger.type)}
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

                      {!triggerTypesWithStageFilter.has(trigger.type) ? (
                        <p className="text-xs text-muted-foreground">
                          Este tipo de trigger no usa filtro de etapa/pipeline como criterio principal.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Evaluación de triggers</Label>
                  <Select
                    value={triggerEvaluationMode}
                    onValueChange={(value) => setTriggerEvaluationMode(value as TriggerEvaluationMode)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Modo de evaluación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">ANY: si cumple cualquier trigger</SelectItem>
                      <SelectItem value="all">ALL: deben cumplirse todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Grupos de filtros lógicos</Label>
                  <Button variant="outline" size="sm" onClick={addFilterGroup}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar grupo
                  </Button>
                </div>

                {filterGroups.map((group, groupIndex) => (
                  <div key={group.id} className="space-y-3 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Grupo #{groupIndex + 1}</p>
                      <div className="flex items-center gap-2">
                        <Select
                          value={group.logic}
                          onValueChange={(value) =>
                            setFilterGroups((prev) =>
                              prev.map((item) =>
                                item.id === group.id ? { ...item, logic: value as TriggerGroupLogic } : item
                              )
                            )
                          }
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Lógica" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">ALL (AND)</SelectItem>
                            <SelectItem value="any">ANY (OR)</SelectItem>
                          </SelectContent>
                        </Select>
                        {filterGroups.length > 1 ? (
                          <Button variant="ghost" size="sm" onClick={() => removeFilterGroup(group.id)}>
                            Eliminar
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {group.conditions.map((condition) => {
                        const fieldOption =
                          triggerConditionFieldOptionMap.get(condition.field) || defaultTriggerConditionFieldOption;
                        const allowedOperators = fieldOption.allowedOperators;
                        const requiresValue = operatorRequiresValue(condition.op);
                        const safeSelectValue = condition.value && condition.value.length > 0 ? condition.value : "__none__";

                        return (
                          <div key={condition.id} className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
                            <Select
                              value={condition.field}
                              onValueChange={(value) => {
                                const nextField =
                                  triggerConditionFieldOptionMap.get(value) || defaultTriggerConditionFieldOption;
                                const fallbackOperator = nextField.allowedOperators[0] || "eq";
                                const nextOperator = nextField.allowedOperators.includes(condition.op)
                                  ? condition.op
                                  : fallbackOperator;

                                updateConditionInGroup(group.id, condition.id, {
                                  field: value,
                                  op: nextOperator,
                                  value: operatorRequiresValue(nextOperator) ? condition.value : "",
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Campo" />
                              </SelectTrigger>
                              <SelectContent>
                                {triggerConditionFieldOptions.map((field) => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={condition.op}
                              onValueChange={(value) =>
                                updateConditionInGroup(group.id, condition.id, {
                                  op: value as TriggerConditionOperator,
                                  value: operatorRequiresValue(value as TriggerConditionOperator)
                                    ? condition.value
                                    : "",
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Operador" />
                              </SelectTrigger>
                              <SelectContent>
                                {allowedOperators.map((operator) => (
                                  <SelectItem key={operator} value={operator}>
                                    {getOperatorLabelForField(condition.field, operator)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {requiresValue ? (
                              fieldOption.inputKind === "pipeline" ? (
                                <Select
                                  value={safeSelectValue}
                                  onValueChange={(value) =>
                                    updateConditionInGroup(group.id, condition.id, {
                                      value: value === "__none__" ? "" : value,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar pipeline" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Seleccionar pipeline</SelectItem>
                                    {pipelines.map((pipeline) => (
                                      <SelectItem key={pipeline.id} value={pipeline.id}>
                                        {pipeline.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : fieldOption.inputKind === "stage" ? (
                                <Select
                                  value={safeSelectValue}
                                  onValueChange={(value) =>
                                    updateConditionInGroup(group.id, condition.id, {
                                      value: value === "__none__" ? "" : value,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar etapa" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Seleccionar etapa</SelectItem>
                                    {availableStageOptions.map((stageName) => (
                                      <SelectItem key={stageName} value={stageName}>
                                        {stageName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : fieldOption.inputKind === "boolean" ? (
                                <Select
                                  value={safeSelectValue}
                                  onValueChange={(value) =>
                                    updateConditionInGroup(group.id, condition.id, {
                                      value: value === "__none__" ? "" : value,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar valor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Seleccionar valor</SelectItem>
                                    <SelectItem value="true">True</SelectItem>
                                    <SelectItem value="false">False</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : fieldOption.inputKind === "select" && fieldOption.selectOptions?.length ? (
                                <Select
                                  value={safeSelectValue}
                                  onValueChange={(value) =>
                                    updateConditionInGroup(group.id, condition.id, {
                                      value: value === "__none__" ? "" : value,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar valor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Seleccionar valor</SelectItem>
                                    {fieldOption.selectOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type={fieldOption.inputKind === "number" ? "number" : fieldOption.inputKind === "date" ? "date" : "text"}
                                  value={condition.value || ""}
                                  onChange={(event) =>
                                    updateConditionInGroup(group.id, condition.id, { value: event.target.value })
                                  }
                                  placeholder={fieldOption.inputKind === "date" ? "Seleccionar fecha" : "Valor"}
                                />
                              )
                            ) : (
                              <Input value="N/A" disabled />
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeConditionFromGroup(group.id, condition.id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    <Button variant="outline" size="sm" onClick={() => addConditionToGroup(group.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar condición
                    </Button>
                  </div>
                ))}
              </div>
              </div>
            </div>
            <DialogFooter className="border-t bg-background px-6 py-4">
              <Button variant="outline" onClick={() => setIsTriggerDialogOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingStepId} onOpenChange={(open) => !open && setEditingStepId(null)}>
          <DialogContent className="flex max-h-[90vh] w-[96vw] flex-col overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>Configurar bloque</DialogTitle>
              <DialogDescription>
                Seleccioná variables y reglas para operar dentro del bloque.
              </DialogDescription>
            </DialogHeader>
            {selectedStep ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-1">
                <div className="space-y-4 pb-4">
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
              </div>
            ) : null}
            <DialogFooter className="border-t bg-background px-6 py-4">
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
