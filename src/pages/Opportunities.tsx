
import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useCompany } from "@/contexts/CompanyContext";
import { OpportunitiesList } from "@/components/crm/OpportunitiesList";
import { OpportunityDrawer } from "@/components/crm/OpportunityDrawer";
import { OpportunitiesCalendarView } from "@/components/crm/OpportunitiesCalendarView";
import { OpportunitiesKanbanView } from "@/components/crm/OpportunitiesKanbanView";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { LucidePlus, LucideDownload, LucideUpload, List, CalendarDays, Kanban, SlidersHorizontal, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { opportunityService } from "@/domain/crm/services/opportunityService";
import type { OpportunityDTO } from "@/domain/crm/dtos/opportunity";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// --- Data hooks reutilizables ---
type OpportunityRow = Database["public"]["Tables"]["crm_opportunities"]["Row"];
type OpportunityInsert = Database["public"]["Tables"]["crm_opportunities"]["Insert"];
type OpportunityInsertExtended = OpportunityInsert & {
  status?: string | null;
  close_date?: string | null;
  closed_at?: string | null;
  lost_reason?: string | null;
  won_reason?: string | null;
  source?: string | null;
  currency?: string | null;
  expected_revenue?: number | null;
  next_step?: string | null;
  last_activity_at?: string | null;
  tags?: string[] | null;
};
type OpportunityUpdate = Database["public"]["Tables"]["crm_opportunities"]["Update"];
type PipelineRow = Database["public"]["Tables"]["crm_pipelines"]["Row"];

type ImportMode = "existing" | "create" | "none";

type ImportValidationIssue = {
  rowNumber: number;
  field: string;
  message: string;
};

type ImportPreparedRow = {
  payload: OpportunityInsertExtended;
  extraColumns: Record<string, string>;
};

type PlannedCustomField = {
  label: string;
  fieldKey: string;
  fieldType: CustomFieldType;
};

type CustomFieldType = "text" | "number" | "textarea" | "select" | "checkbox" | "date";

type ImportPreview = {
  totalRows: number;
  validRows: ImportPreparedRow[];
  invalidRows: ImportValidationIssue[];
  extraHeaders: string[];
  headerValueSamples: Record<string, string[]>;
  plannedCustomFields: PlannedCustomField[];
};

export function useOpportunitiesQuery(params: {
  companyId: string;
  search?: string;
  filters?: any;
  page?: number;
  pageSize?: number;
  sort?: { field: string; direction: "asc" | "desc" };
}) {
  return useQuery({
    queryKey: ["opportunities", params],
    queryFn: async () => {
      let q = supabase
        .from("crm_opportunities")
        .select("*, customers(name), owner:employees(first_name,last_name), stage", { count: "exact" })
        .eq("company_id", params.companyId);
      if (params.search) q = q.ilike("name", `%${params.search}%`);
      if (params.filters?.pipelineId) q = q.eq("pipeline_id", params.filters.pipelineId);
      if (params.filters?.ownerId) q = q.eq("owner_id", params.filters.ownerId);
      if (params.filters?.stage) q = q.eq("stage", params.filters.stage);
      if (params.filters?.dateRange) q = q.gte("estimated_close_date", params.filters.dateRange.from).lte("estimated_close_date", params.filters.dateRange.to);
      if (params.filters?.valueRange) q = q.gte("value", params.filters.valueRange.min).lte("value", params.filters.valueRange.max);
      if (params.sort?.field) q = q.order(params.sort.field, { ascending: params.sort.direction === "asc" });
      const page = params.page || 1;
      const pageSize = params.pageSize || 10;
      q = q.range((page - 1) * pageSize, page * pageSize - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: (data ?? []) as OpportunityRow[], total: count ?? 0 };
    },
    // keepPreviousData: true, // Si usas TanStack Query v5, esta prop ya no existe
    placeholderData: (prev) => prev,
  });
}

export function useCreateOpportunityMutation(companyId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: OpportunityInsertExtended) => {
      const { error } = await supabase.from("crm_opportunities").insert([
        { ...values, company_id: companyId },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      onSuccess?.();
    },
  });
}

// --- Autocomplete helpers ---
function useAccountsAutocomplete(companyId: string, query: string) {
  return useQuery({
    queryKey: ["accounts-autocomplete", companyId, query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("company_id", companyId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!query,
  });
}

function useCustomersAutocomplete(companyId: string, query: string) {
  return useQuery({
    queryKey: ["customers-autocomplete", companyId, query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .eq("company_id", companyId)
        .ilike("name", `%${query}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!query,
  });
}

// --- Toolbar, Filters, Drawer, and List are composed here ---

export default function OpportunitiesPage() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDrawer, setShowDrawer] = useState(false);
  const [filters, setFilters] = useState({
    pipelineId: undefined as string | undefined,
    stageId: undefined as string | undefined,
    ownerId: undefined as string | undefined,
    status: undefined as string | undefined,
    dateRange: undefined as { from: string; to: string } | undefined,
    value: undefined as { min: number; max: number } | undefined,
  })

  const [savedViewId, setSavedViewId] = useState<string>("default");
  const [newViewName, setNewViewName] = useState("");
  const [view, setView] = useState<"list" | "calendar" | "kanban">("list");
  const [showViewPanel, setShowViewPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("existing");
  const [importPipelineId, setImportPipelineId] = useState<string>("");
  const [importPipelineName, setImportPipelineName] = useState("");
  const [importPipelineStages, setImportPipelineStages] = useState("nuevo,en_proceso,ganado,perdido");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importErrorsVisibleCount, setImportErrorsVisibleCount] = useState(50);
  const [isCheckingImport, setIsCheckingImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.pipelineId) count++;
    if (filters.stageId) count++;
    if (filters.ownerId) count++;
    if (filters.status) count++;
    if (filters.dateRange) count++;
    if (filters.value) count++;
    return count;
  }, [filters]);

  const { data: savedViews = [] } = useQuery({
    queryKey: ["crm-saved-views", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_saved_views")
        .select("id, name, filters")
        .eq("company_id", currentCompany?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ["crm-pipelines", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .select("id, name, stages")
        .eq("company_id", currentCompany?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: owners = [] } = useQuery({
    queryKey: ["crm-owners", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("company_id", currentCompany?.id)
        .order("first_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const stageOptions = useMemo(() => {
    if (filters.pipelineId) {
      const pipeline = pipelines.find((p: any) => p.id === filters.pipelineId);
      return pipeline?.stages ?? [];
    }
    const allStages = pipelines.flatMap((p: any) => p.stages || []);
    return Array.from(new Set(allStages));
  }, [filters.pipelineId, pipelines]);

  const selectedImportPipeline = useMemo(
    () => pipelines.find((pipeline: any) => pipeline.id === importPipelineId) as PipelineRow | undefined,
    [pipelines, importPipelineId]
  );

  const createSavedViewMutation = useMutation({
    mutationFn: async () => {
      if (!newViewName.trim() || !currentCompany?.id) {
        throw new Error("Nombre de vista requerido");
      }
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) {
        throw new Error("Usuario no autenticado");
      }
      const { error } = await supabase.from("crm_saved_views").insert([
        {
          company_id: currentCompany.id,
          user_id: userId,
          name: newViewName.trim(),
          filters: { ...filters, search },
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-saved-views", currentCompany?.id] });
      setNewViewName("");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextFilters: any = {
      pipelineId: params.get("pipelineId") || undefined,
      stageId: params.get("stageId") || undefined,
      ownerId: params.get("ownerId") || undefined,
      status: params.get("status") || undefined,
    };
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    if (dateFrom && dateTo) {
      nextFilters.dateRange = { from: dateFrom, to: dateTo };
    }
    const valueMin = params.get("valueMin");
    const valueMax = params.get("valueMax");
    if (valueMin && valueMax) {
      nextFilters.value = { min: Number(valueMin), max: Number(valueMax) };
    }
    setFilters((prev) => ({ ...prev, ...nextFilters }));
    const searchParam = params.get("search");
    if (searchParam !== null) setSearch(searchParam);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filters.pipelineId) params.set("pipelineId", filters.pipelineId);
    if (filters.stageId) params.set("stageId", filters.stageId);
    if (filters.ownerId) params.set("ownerId", filters.ownerId);
    if (filters.status) params.set("status", filters.status);
    if (filters.dateRange?.from) params.set("dateFrom", filters.dateRange.from);
    if (filters.dateRange?.to) params.set("dateTo", filters.dateRange.to);
    if (filters.value?.min !== undefined) params.set("valueMin", String(filters.value.min));
    if (filters.value?.max !== undefined) params.set("valueMax", String(filters.value.max));

    const queryString = params.toString();
    const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [search, filters]);

  useEffect(() => {
    if (!currentCompany?.id) return;
    queryClient.prefetchQuery({
      queryKey: ["crm-pipelines", currentCompany.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("crm_pipelines")
          .select("id, name, stages")
          .eq("company_id", currentCompany.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      },
    });
    queryClient.prefetchQuery({
      queryKey: ["crm-owners", currentCompany.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("company_id", currentCompany.id)
          .order("first_name", { ascending: true });
        if (error) throw error;
        return data || [];
      },
    });
    queryClient.prefetchQuery({
      queryKey: ["crm-tags", currentCompany.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("crm_tags")
          .select("id, name, color")
          .eq("company_id", currentCompany.id)
          .order("name", { ascending: true });
        if (error) throw error;
        return data || [];
      },
    });
  }, [currentCompany?.id, queryClient]);

  if (!currentCompany) return null;

  const formatDate = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 10);
  };

  const buildExportRows = (rows: OpportunityDTO[]) =>
    rows.map((row) => ({
      Oportunidad: row.name,
      Etapa: row.stage,
      Monto: row.value ?? "",
      Cierre: formatDate(row.estimatedCloseDate),
      Probabilidad: row.probability ?? "",
      "Próximo paso": row.nextStep ?? "",
      "Última actividad": formatDate(row.lastActivityAt),
    }));

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const result = await opportunityService.list({
        companyId: currentCompany.id,
        search,
        filters,
        page: 1,
        pageSize: 10000,
      });

      const rows = buildExportRows(result.data);
      if (rows.length === 0) {
        toast.error("No hay oportunidades para exportar");
        return;
      }

      if (format === "csv") {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "oportunidades.csv");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Oportunidades");
      const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      downloadBlob(
        new Blob([arrayBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "oportunidades.xlsx"
      );
    } catch (error: any) {
      toast.error(error.message || "Error al exportar oportunidades");
    }
  };

  const normalizeCell = (value: unknown) => String(value ?? "").trim();

  const DEFAULT_IMPORT_HEADERS = new Set(
    [
      "name", "nombre", "oportunidad",
      "email", "mail", "correo",
      "phone", "telefono", "teléfono", "celular",
      "probability", "probabilidad",
      "value", "monto", "importe",
      "expected_revenue", "ingreso_esperado",
      "estimated_close_date", "fecha_cierre_estimado",
      "close_date", "fecha_cierre",
      "stage", "etapa",
      "status", "estado",
      "tags", "etiquetas",
      "description", "descripcion",
      "source", "fuente",
      "next_step", "proximo_paso",
      "currency", "moneda",
      "pipeline", "pipeline_id", "pipeline_name",
      "owner_id", "owner", "responsable",
      "customer_id", "customer", "cliente",
    ].map((header) => header.toLowerCase().trim())
  );

  const slugifyFieldKey = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const inferCustomFieldType = (samples: string[]): CustomFieldType => {
    const nonEmpty = samples.map((sample) => sample.trim()).filter(Boolean);
    if (!nonEmpty.length) return "text";

    const isBoolean = nonEmpty.every((sample) => /^(true|false|1|0|si|sí|no|yes)$/i.test(sample));
    if (isBoolean) return "checkbox";

    const isNumber = nonEmpty.every((sample) => {
      const normalized = sample.replace(/\./g, "").replace(",", ".");
      return Number.isFinite(Number(normalized));
    });
    if (isNumber) return "number";

    const isDate = nonEmpty.every((sample) => {
      const date = new Date(sample);
      return !Number.isNaN(date.getTime());
    });
    if (isDate) return "date";

    return "text";
  };

  const getCell = (row: Record<string, unknown>, aliases: string[]) => {
    for (const alias of aliases) {
      const direct = row[alias];
      if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
        return String(direct).trim();
      }

      const aliasLower = alias.toLowerCase();
      const key = Object.keys(row).find((k) => k.toLowerCase().trim() === aliasLower);
      if (!key) continue;
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return "";
  };

  const parseOptionalNumber = (value: string) => {
    if (!value) return null;
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : Number.NaN;
  };

  const parseOptionalDate = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "INVALID_DATE";
    return date.toISOString().slice(0, 10);
  };

  const normalizeStage = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const parseStageList = (value: string) => {
    const parsed = value
      .split(",")
      .map((stage) => normalizeStage(stage))
      .filter(Boolean);

    if (!parsed.length) {
      return ["nuevo", "en_proceso", "ganado", "perdido"];
    }

    return Array.from(new Set(parsed));
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const resetImportState = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportMode("existing");
    setImportPipelineId("");
    setImportPipelineName("");
    setImportPipelineStages("nuevo,en_proceso,ganado,perdido");
    setImportErrorsVisibleCount(50);
    setIsCheckingImport(false);
    setIsImporting(false);
  };

  const runImportPrecheck = async () => {
    if (!importFile) {
      toast.error("Seleccioná un archivo CSV");
      return;
    }

    if (importMode === "existing" && !importPipelineId) {
      toast.error("Seleccioná un pipeline para importar");
      return;
    }

    if (importMode === "create" && !importPipelineName.trim()) {
      toast.error("Indicá un nombre para el nuevo pipeline");
      return;
    }

    setIsCheckingImport(true);
    setImportPreview(null);
    setImportErrorsVisibleCount(50);

    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = (results.data as Record<string, unknown>[]) || [];
        const invalidRows: ImportValidationIssue[] = [];
        const validRows: ImportPreparedRow[] = [];
        const extraHeadersSet = new Set<string>();
        const headerValueSamples = new Map<string, string[]>();

        if (!rows.length) {
          setIsCheckingImport(false);
          toast.error("El CSV está vacío");
          return;
        }

        let selectedPipelineStages: string[] = [];
        if (importMode === "existing") {
          selectedPipelineStages = (selectedImportPipeline?.stages ?? []).map((stage) => normalizeStage(stage));
        }
        if (importMode === "create") {
          selectedPipelineStages = parseStageList(importPipelineStages);
        }

        const selectedStageSet = new Set(selectedPipelineStages);

        for (let index = 0; index < rows.length; index += 1) {
          const row = rows[index];
          const rowNumber = index + 2;

          Object.entries(row).forEach(([rawHeader, rawValue]) => {
            const header = String(rawHeader || "").trim();
            if (!header) return;

            const normalizedHeader = header.toLowerCase().trim();
            if (DEFAULT_IMPORT_HEADERS.has(normalizedHeader)) return;

            extraHeadersSet.add(header);

            const cellValue = normalizeCell(rawValue);
            if (!cellValue) return;

            const existing = headerValueSamples.get(header) || [];
            if (existing.length < 50) {
              existing.push(cellValue);
              headerValueSamples.set(header, existing);
            }
          });

          const name = getCell(row, ["name", "nombre", "oportunidad"]);
          const email = getCell(row, ["email", "mail", "correo"]);
          const phone = getCell(row, ["phone", "telefono", "teléfono", "celular"]);

          if (!name) {
            invalidRows.push({ rowNumber, field: "name", message: "Nombre requerido" });
            continue;
          }
          if (!email) {
            invalidRows.push({ rowNumber, field: "email", message: "Email requerido" });
            continue;
          }
          if (!emailRegex.test(email)) {
            invalidRows.push({ rowNumber, field: "email", message: "Email inválido" });
            continue;
          }
          if (!phone) {
            invalidRows.push({ rowNumber, field: "phone", message: "Teléfono requerido" });
            continue;
          }

          const rawProbability = getCell(row, ["probability", "probabilidad"]);
          const probability = parseOptionalNumber(rawProbability);
          if (Number.isNaN(probability)) {
            invalidRows.push({ rowNumber, field: "probability", message: "Probabilidad inválida" });
            continue;
          }
          if (probability !== null && (probability < 0 || probability > 100)) {
            invalidRows.push({ rowNumber, field: "probability", message: "Probabilidad debe estar entre 0 y 100" });
            continue;
          }

          const rawValue = getCell(row, ["value", "monto", "importe"]);
          const value = parseOptionalNumber(rawValue);
          if (Number.isNaN(value)) {
            invalidRows.push({ rowNumber, field: "value", message: "Monto inválido" });
            continue;
          }

          const rawExpectedRevenue = getCell(row, ["expected_revenue", "ingreso_esperado"]);
          const expectedRevenue = parseOptionalNumber(rawExpectedRevenue);
          if (Number.isNaN(expectedRevenue)) {
            invalidRows.push({ rowNumber, field: "expected_revenue", message: "Ingreso esperado inválido" });
            continue;
          }

          const estimatedCloseDate = parseOptionalDate(getCell(row, ["estimated_close_date", "fecha_cierre_estimado"]));
          if (estimatedCloseDate === "INVALID_DATE") {
            invalidRows.push({ rowNumber, field: "estimated_close_date", message: "Fecha estimada inválida" });
            continue;
          }

          const closeDate = parseOptionalDate(getCell(row, ["close_date", "fecha_cierre"]));
          if (closeDate === "INVALID_DATE") {
            invalidRows.push({ rowNumber, field: "close_date", message: "Fecha de cierre inválida" });
            continue;
          }

          const rawStage = normalizeStage(getCell(row, ["stage", "etapa"]));
          const fallbackStage = selectedPipelineStages[0] || "nuevo";
          const stage = rawStage || fallbackStage;

          if ((importMode === "existing" || importMode === "create") && selectedStageSet.size > 0 && !selectedStageSet.has(stage)) {
            invalidRows.push({
              rowNumber,
              field: "stage",
              message: `La etapa '${stage}' no existe en el pipeline seleccionado`,
            });
            continue;
          }

          const status = normalizeCell(getCell(row, ["status", "estado"])).toLowerCase() || "abierta";
          if (!["abierta", "ganado", "perdido"].includes(status)) {
            invalidRows.push({ rowNumber, field: "status", message: "Estado inválido (abierta/ganado/perdido)" });
            continue;
          }

          const tagsRaw = getCell(row, ["tags", "etiquetas"]);
          const tags = tagsRaw
            ? tagsRaw.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean)
            : null;

          const extraColumns: Record<string, string> = {};
          Object.entries(row).forEach(([rawHeader, rawValue]) => {
            const header = String(rawHeader || "").trim();
            if (!header) return;
            if (DEFAULT_IMPORT_HEADERS.has(header.toLowerCase().trim())) return;

            const cellValue = normalizeCell(rawValue);
            if (!cellValue) return;
            extraColumns[header] = cellValue;
          });

          validRows.push({
            payload: {
              company_id: currentCompany.id,
              name,
              email,
              phone,
              pipeline_id: importMode === "existing" ? importPipelineId : null,
              stage,
              status,
              probability: probability === null ? 0 : Math.round(probability),
              value: value === null ? null : value,
              expected_revenue: expectedRevenue === null ? null : expectedRevenue,
              estimated_close_date: estimatedCloseDate as string | null,
              close_date: closeDate as string | null,
              description: getCell(row, ["description", "descripcion"]) || null,
              source: getCell(row, ["source", "fuente"]) || null,
              next_step: getCell(row, ["next_step", "proximo_paso"]) || null,
              currency: getCell(row, ["currency", "moneda"]) || "ARS",
              tags,
            },
            extraColumns,
          });
        }

        const plannedCustomFields: PlannedCustomField[] = [];
        if (extraHeadersSet.size > 0) {
          const { data: existingFieldDefs, error: existingFieldDefsError } = await supabase
            .from("crm_opportunity_custom_field_definitions")
            .select("field_key, label")
            .eq("company_id", currentCompany.id)
            .eq("is_active", true);

          if (existingFieldDefsError) {
            setIsCheckingImport(false);
            toast.error(existingFieldDefsError.message || "No se pudieron validar custom fields");
            return;
          }

          const existingByFieldKey = new Set(
            (existingFieldDefs || []).map((field: any) => String(field.field_key).toLowerCase())
          );
          const existingByLabelSlug = new Set(
            (existingFieldDefs || []).map((field: any) => slugifyFieldKey(String(field.label || "")))
          );

          const usedKeys = new Set<string>((existingFieldDefs || []).map((field: any) => String(field.field_key)));

          Array.from(extraHeadersSet).forEach((header, index) => {
            const headerSlug = slugifyFieldKey(header);
            if (!headerSlug) return;

            if (existingByFieldKey.has(headerSlug) || existingByLabelSlug.has(headerSlug)) {
              return;
            }

            const baseKey = headerSlug || `campo_${index + 1}`;
            let nextKey = baseKey;
            let suffix = 2;
            while (usedKeys.has(nextKey)) {
              nextKey = `${baseKey}_${suffix}`;
              suffix += 1;
            }
            usedKeys.add(nextKey);

            const inferredType = inferCustomFieldType(headerValueSamples.get(header) || []);
            plannedCustomFields.push({
              label: header,
              fieldKey: nextKey,
              fieldType: inferredType,
            });
          });
        }

        setImportPreview({
          totalRows: rows.length,
          validRows,
          invalidRows,
          extraHeaders: Array.from(extraHeadersSet),
          headerValueSamples: Object.fromEntries(headerValueSamples.entries()),
          plannedCustomFields,
        });

        setIsCheckingImport(false);

        if (!validRows.length) {
          toast.error("No hay filas válidas para importar");
          return;
        }

        if (!invalidRows.length) {
          toast.success(
            `Pre-check OK: ${validRows.length} filas válidas${
              plannedCustomFields.length ? `, ${plannedCustomFields.length} custom fields nuevos` : ""
            }`
          );
          return;
        }

        toast.warning(
          `Pre-check completado: ${validRows.length} válidas, ${invalidRows.length} inválidas${
            plannedCustomFields.length ? `, ${plannedCustomFields.length} custom fields nuevos` : ""
          }`
        );
      },
      error: (error) => {
        setIsCheckingImport(false);
        toast.error(error.message || "No se pudo leer el CSV");
      },
    });
  };

  const importValidRows = async () => {
    if (!importPreview || !importPreview.validRows.length) {
      toast.error("Ejecutá el pre-check antes de importar");
      return;
    }

    setIsImporting(true);

    try {
      let pipelineIdToUse: string | null = importMode === "existing" ? importPipelineId : null;

      if (importMode === "create") {
        const stages = parseStageList(importPipelineStages);
        const { data: createdPipeline, error: pipelineError } = await supabase
          .from("crm_pipelines")
          .insert([
            {
              company_id: currentCompany.id,
              name: importPipelineName.trim(),
              stages,
            },
          ])
          .select("id")
          .single();

        if (pipelineError) throw pipelineError;
        pipelineIdToUse = createdPipeline.id;
      }

      const { data: existingFieldDefs, error: existingFieldDefsError } = await supabase
        .from("crm_opportunity_custom_field_definitions")
        .select("field_key, label, field_type")
        .eq("company_id", currentCompany.id)
        .eq("is_active", true);
      if (existingFieldDefsError) throw existingFieldDefsError;

      const fieldKeyByHeader = new Map<string, string>();
      const fieldTypeByKey = new Map<string, CustomFieldType>();

      const existingByFieldKey = new Map<string, string>();
      const existingByLabelSlug = new Map<string, string>();
      const usedKeys = new Set<string>();

      (existingFieldDefs || []).forEach((field: any) => {
        const key = String(field.field_key);
        usedKeys.add(key);
        existingByFieldKey.set(key.toLowerCase(), key);
        existingByLabelSlug.set(slugifyFieldKey(String(field.label || "")), key);
        fieldTypeByKey.set(key, (field.field_type as CustomFieldType) || "text");
      });

      const newFieldDefs: Database["public"]["Tables"]["crm_opportunity_custom_field_definitions"]["Insert"][] = [];

      importPreview.extraHeaders.forEach((header, index) => {
        const headerSlug = slugifyFieldKey(header);
        const existingByKey = existingByFieldKey.get(headerSlug);
        const existingByLabel = existingByLabelSlug.get(headerSlug);
        if (existingByKey) {
          fieldKeyByHeader.set(header, existingByKey);
          return;
        }
        if (existingByLabel) {
          fieldKeyByHeader.set(header, existingByLabel);
          return;
        }

        const baseKey = headerSlug || `campo_${index + 1}`;
        let nextKey = baseKey;
        let suffix = 2;
        while (usedKeys.has(nextKey)) {
          nextKey = `${baseKey}_${suffix}`;
          suffix += 1;
        }

        usedKeys.add(nextKey);
        fieldKeyByHeader.set(header, nextKey);

        const inferredType = inferCustomFieldType(importPreview.headerValueSamples[header] || []);
        fieldTypeByKey.set(nextKey, inferredType);

        newFieldDefs.push({
          company_id: currentCompany.id,
          field_key: nextKey,
          label: header,
          field_type: inferredType,
          options: null,
          is_required: false,
          is_active: true,
          sort_order: existingByFieldKey.size + newFieldDefs.length,
        });
      });

      if (newFieldDefs.length > 0) {
        const { error: insertCustomFieldDefsError } = await supabase
          .from("crm_opportunity_custom_field_definitions")
          .insert(newFieldDefs);
        if (insertCustomFieldDefsError) throw insertCustomFieldDefsError;
      }

      const finalRows = importPreview.validRows.map(({ payload, extraColumns }) => {
        const customFields: Record<string, unknown> = {};

        Object.entries(extraColumns).forEach(([header, rawValue]) => {
          const fieldKey = fieldKeyByHeader.get(header);
          if (!fieldKey) return;

          const fieldType = fieldTypeByKey.get(fieldKey) || "text";
          if (fieldType === "number") {
            const parsed = parseOptionalNumber(rawValue);
            customFields[fieldKey] = Number.isNaN(parsed) ? rawValue : parsed;
            return;
          }
          if (fieldType === "checkbox") {
            if (/^(true|1|si|sí|yes)$/i.test(rawValue)) {
              customFields[fieldKey] = true;
              return;
            }
            if (/^(false|0|no)$/i.test(rawValue)) {
              customFields[fieldKey] = false;
              return;
            }
          }
          customFields[fieldKey] = rawValue;
        });

        return {
          ...payload,
          pipeline_id: pipelineIdToUse,
          custom_fields: customFields,
        };
      });

      const CHUNK_SIZE = 500;
      for (let index = 0; index < finalRows.length; index += CHUNK_SIZE) {
        const chunk = finalRows.slice(index, index + CHUNK_SIZE);
        const { error } = await supabase.from("crm_opportunities").insert(chunk);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["crm-pipelines", currentCompany.id] });
      queryClient.invalidateQueries({ queryKey: ["crm-opportunity-custom-fields", currentCompany.id] });

      toast.success(
        `Importación completada: ${finalRows.length} oportunidades creadas${
          importPreview.invalidRows.length ? `, ${importPreview.invalidRows.length} filas omitidas` : ""
        }`
      );

      setIsImportDialogOpen(false);
      resetImportState();
    } catch (error: any) {
      toast.error(error.message || "Error al importar oportunidades");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">Oportunidades</h1>
              <Select
              value={savedViewId}
              onValueChange={(nextId) => {
                setSavedViewId(nextId);
                if (nextId === "default") return;
                const view = savedViews.find((v) => v.id === nextId);
                if (view?.filters) {
                  const nextFilters = view.filters as any;
                  const nextValue = nextFilters.value ?? nextFilters.amountRange;
                  setFilters({
                    pipelineId: nextFilters.pipelineId,
                    stageId: nextFilters.stageId,
                    ownerId: nextFilters.ownerId,
                    status: nextFilters.status,
                    dateRange: nextFilters.dateRange,
                    value: nextValue,
                  });
                  if (typeof nextFilters.search === "string") {
                    setSearch(nextFilters.search);
                  }
                }
              }}
            >
              <SelectTrigger className="w-44" aria-label="Vista guardada">
                <SelectValue placeholder="Vista por defecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Vista por defecto</SelectItem>
                {savedViews.map((view) => (
                  <SelectItem key={view.id} value={view.id}>
                    {view.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
            <p className="text-sm text-muted-foreground">Gestioná y filtrá tus oportunidades de venta.</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap w-full lg:w-auto lg:justify-end">
            <Input
              placeholder="Buscar oportunidad o cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-72 lg:w-64"
              aria-label="Buscar"
            />
            <Button
              variant="outline"
              onClick={() => setShowViewPanel(true)}
              aria-label="Vistas"
            >
              <Eye className="w-4 h-4 mr-2" />
              Vistas
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilterPanel(true)}
              className="relative"
              aria-label="Filtros"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Exportar oportunidades">
                  <LucideDownload className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                  Exportar XLSX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog
              open={isImportDialogOpen}
              onOpenChange={(open) => {
                setIsImportDialogOpen(open);
                if (!open) resetImportState();
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Importar oportunidades">
                  <LucideUpload className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Importar oportunidades desde CSV</DialogTitle>
                  <DialogDescription>
                    Requerido por fila: nombre, email y teléfono. Podés importar solo filas válidas y omitir las incompletas.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="opportunities-csv-file">Archivo CSV</Label>
                    <Input
                      id="opportunities-csv-file"
                      type="file"
                      accept=".csv"
                      onChange={(event) => {
                        setImportFile(event.target.files?.[0] || null);
                        setImportPreview(null);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pipeline de destino</Label>
                    <Select value={importMode} onValueChange={(value) => setImportMode(value as ImportMode)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí cómo asignar pipeline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="existing">Usar pipeline existente</SelectItem>
                        <SelectItem value="create">Crear pipeline nuevo</SelectItem>
                        <SelectItem value="none">Importar sin pipeline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {importMode === "existing" && (
                    <div className="space-y-2">
                      <Label>Pipeline</Label>
                      <Select value={importPipelineId} onValueChange={setImportPipelineId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná un pipeline" />
                        </SelectTrigger>
                        <SelectContent>
                          {pipelines.map((pipeline: any) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {importMode === "create" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Nombre del pipeline</Label>
                        <Input
                          value={importPipelineName}
                          onChange={(event) => setImportPipelineName(event.target.value)}
                          placeholder="Ej: Pipeline migrado"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Etapas (separadas por coma)</Label>
                        <Input
                          value={importPipelineStages}
                          onChange={(event) => setImportPipelineStages(event.target.value)}
                          placeholder="nuevo,en_proceso,ganado,perdido"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={runImportPrecheck} disabled={!importFile || isCheckingImport}>
                      {isCheckingImport ? "Chequeando..." : "Chequear CSV"}
                    </Button>
                  </div>

                  {importPreview && (
                    <div className="space-y-3 rounded-md border p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Total: {importPreview.totalRows}</Badge>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Válidas: {importPreview.validRows.length}
                        </Badge>
                        <Badge variant="destructive">Inválidas: {importPreview.invalidRows.length}</Badge>
                      </div>

                      {!!importPreview.invalidRows.length && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Filas con error</p>
                          <div className="max-h-44 overflow-y-auto rounded border p-2 text-xs space-y-1">
                            {importPreview.invalidRows.slice(0, importErrorsVisibleCount).map((issue, index) => (
                              <div key={`${issue.rowNumber}-${issue.field}-${index}`}>
                                Fila {issue.rowNumber} · {issue.field}: {issue.message}
                              </div>
                            ))}
                          </div>
                          {importPreview.invalidRows.length > importErrorsVisibleCount && (
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setImportErrorsVisibleCount((prev) =>
                                    Math.min(prev + 100, importPreview.invalidRows.length)
                                  )
                                }
                              >
                                Ver más errores ({importErrorsVisibleCount}/{importPreview.invalidRows.length})
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            El reporte de errores se visualiza en esta pantalla. Podés corregir el CSV y volver a chequear,
                            o continuar importando solo filas válidas.
                          </p>
                        </div>
                      )}

                      {importPreview.plannedCustomFields.length > 0 && (
                        <div className="space-y-2 rounded border p-2">
                          <p className="text-sm font-medium">
                            Se crearán {importPreview.plannedCustomFields.length} custom fields nuevos
                          </p>
                          <div className="max-h-44 overflow-y-auto rounded border p-2 text-xs space-y-1">
                            {importPreview.plannedCustomFields.map((field) => (
                              <div key={field.fieldKey}>
                                {field.label} → {field.fieldKey} ({field.fieldType})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                          Cerrar para corregir CSV
                        </Button>
                        <Button
                          onClick={importValidRows}
                          disabled={!importPreview.validRows.length || isImporting}
                        >
                          {isImporting ? "Importando..." : "Importar solo válidas"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={() => setShowDrawer(true)} variant="default" className="w-full sm:w-auto">
              <LucidePlus className="w-4 h-4 mr-1" /> Nueva oportunidad
            </Button>
          </div>
        </div>
        {/* Views side panel */}
        <Sheet open={showViewPanel} onOpenChange={setShowViewPanel}>
          <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Vistas</SheetTitle>
            </SheetHeader>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vista</Label>
              <div className="flex rounded-md border overflow-hidden">
                <Button
                  variant={view === "list" ? "default" : "ghost"}
                  className="flex-1 rounded-none gap-2"
                  onClick={() => setView("list")}
                >
                  <List className="w-4 h-4" /> Lista
                </Button>
                <Button
                  variant={view === "calendar" ? "default" : "ghost"}
                  className="flex-1 rounded-none border-l gap-2"
                  onClick={() => setView("calendar")}
                >
                  <CalendarDays className="w-4 h-4" /> Calendario
                </Button>
                <Button
                  variant={view === "kanban" ? "default" : "ghost"}
                  className="flex-1 rounded-none border-l gap-2"
                  onClick={() => setView("kanban")}
                >
                  <Kanban className="w-4 h-4" /> Kanban
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Filter side panel */}
        <Sheet open={showFilterPanel} onOpenChange={setShowFilterPanel}>
          <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>

            {/* Filtros */}
            <div className="space-y-4">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtros</Label>

              <div className="space-y-1.5">
                <Label className="text-sm">Pipeline</Label>
                <Select
                  value={filters.pipelineId || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      pipelineId: value === "all" ? undefined : value,
                      stageId: undefined,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los pipelines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los pipelines</SelectItem>
                    {pipelines.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Etapa</Label>
                <Select
                  value={filters.stageId || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      stageId: value === "all" ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las etapas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las etapas</SelectItem>
                    {stageOptions.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Responsable</Label>
                <Select
                  value={filters.ownerId || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      ownerId: value === "all" ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {owners.map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>
                        {`${o.first_name} ${o.last_name}`.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Estado</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: value === "all" ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="abierta">Abierta</SelectItem>
                    <SelectItem value="ganado">Ganado</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Cierre estimado</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={filters.dateRange?.from || ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: {
                          from: e.target.value,
                          to: prev.dateRange?.to || e.target.value,
                        },
                      }))
                    }
                    placeholder="Desde"
                  />
                  <Input
                    type="date"
                    value={filters.dateRange?.to || ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: {
                          from: prev.dateRange?.from || e.target.value,
                          to: e.target.value,
                        },
                      }))
                    }
                    placeholder="Hasta"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Monto</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={filters.value?.min ?? ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        value: {
                          min: e.target.value ? Number(e.target.value) : 0,
                          max: prev.value?.max ?? 0,
                        },
                      }))
                    }
                    placeholder="Mínimo"
                  />
                  <Input
                    type="number"
                    value={filters.value?.max ?? ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        value: {
                          min: prev.value?.min ?? 0,
                          max: e.target.value ? Number(e.target.value) : 0,
                        },
                      }))
                    }
                    placeholder="Máximo"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  setFilters({
                    pipelineId: undefined,
                    stageId: undefined,
                    ownerId: undefined,
                    status: undefined,
                    dateRange: undefined,
                    value: undefined,
                  })
                }
              >
                Limpiar filtros
              </Button>
            </div>

            <Separator className="my-5" />

            {/* Guardar vista */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guardar vista</Label>
              <Input
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Nombre de la vista"
                className="text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => createSavedViewMutation.mutate()}
                disabled={!newViewName.trim() || createSavedViewMutation.isPending}
              >
                Guardar vista
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        {view === "list" ? (
          <OpportunitiesList
            companyId={currentCompany.id}
            search={search}
            filters={filters}
            onCreate={() => setShowDrawer(true)}
          />
        ) : view === "kanban" ? (
          <OpportunitiesKanbanView
            companyId={currentCompany.id}
            search={search}
            filters={{
              pipelineId: filters.pipelineId,
              ownerId: filters.ownerId,
              status: filters.status,
              stageId: filters.stageId,
            }}
          />
        ) : (
          <OpportunitiesCalendarView
            companyId={currentCompany.id}
            search={search}
            filters={{
              pipelineId: filters.pipelineId,
              ownerId: filters.ownerId,
              status: filters.status,
              stageId: filters.stageId,
            }}
          />
        )}
        {/* Drawer/modal for create opportunity */}
        <OpportunityDrawer
          open={showDrawer}
          onClose={() => setShowDrawer(false)}
          companyId={currentCompany.id}
          opportunity={null}
        />

      </div>
    </Layout>
  )};


// --- CreateOpportunityDrawer ---
const opportunitySchema = z.object({
  name: z.string().min(2, "Requerido"),
  email: z.string().min(1, "Requerido").email("Email inválido"),
  phone: z.string().min(1, "Requerido"),
  pipeline_id: z.string().optional(),
  stage: z.string().optional(),
  customer_id: z.string().optional(),
  value: z.number().min(0.01, "Monto requerido").optional(),
  currency: z.string().default("ARS"),
  estimated_close_date: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  owner_id: z.string().optional(),
  status: z.string().default("abierta"),
  close_date: z.string().optional(),
  lost_reason: z.string().optional(),
  won_reason: z.string().optional(),
  source: z.string().optional(),
  expected_revenue: z.number().optional(),
  next_step: z.string().optional(),
  tags: z.string().optional(),
});

type OpportunityForm = z.infer<typeof opportunitySchema>;

function CreateOpportunityDrawer({ open, onClose, companyId }: { open: boolean; onClose: () => void; companyId: string }) {
  const form = useForm<OpportunityForm>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      email: "",
      phone: "",
      probability: 50,
      status: "abierta",
      currency: "ARS",
      owner_id: undefined,
    },
    mode: "onChange",
  });
  const mutation = useCreateOpportunityMutation(companyId, () => {
    toast.success("Oportunidad creada");
    onClose();
  });

  // --- Autocomplete cuentas/contactos ---
  const [customerQuery, setCustomerQuery] = useState("");
  const { data: customers = [] } = useCustomersAutocomplete(companyId, customerQuery);

  const { data: pipelines = [] } = useQuery({
    queryKey: ["crm-pipelines", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .select("id, name, stages")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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

  const selectedPipelineId = form.watch("pipeline_id");
  const selectedPipeline = useMemo(
    () => pipelines.find((p: any) => p.id === selectedPipelineId),
    [pipelines, selectedPipelineId]
  );
  const pipelineStages: string[] = selectedPipeline?.stages ?? [];

  // --- AI Assist stub ---
  function handleAIAssist() {
    form.setValue("description", "Sugerencia generada por IA: revisar documentación enviada y agendar demo.");
  }

  useEffect(() => {
    if (open) form.reset();
  }, [open]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white h-full shadow-xl animate-in slide-in-from-right duration-300 outline-none flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Nueva oportunidad</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            ×
          </Button>
        </div>
        <form
          className="flex-1 overflow-y-auto p-4 grid gap-4"
          onSubmit={form.handleSubmit(values => {
            // Forzar que los campos requeridos estén presentes y no opcionales
            const {
              name,
              email,
              phone,
              pipeline_id,
              stage,
              customer_id,
              value,
              estimated_close_date,
              probability,
              description,
              owner_id,
              status,
              close_date,
              lost_reason,
              won_reason,
              source,
              currency,
              expected_revenue,
              next_step,
              tags,
            } = values;
            const payload: OpportunityInsertExtended = {
              company_id: companyId,
              name: name!,
              email: email!,
              phone: phone!,
              customer_id: customer_id ?? null,
              // pipeline_id y stage pueden ser opcionales según el tipo, pero si son requeridos, forzar
              pipeline_id: pipeline_id ?? null,
              stage: stage || null,
              value: value ?? null,
              estimated_close_date: estimated_close_date ?? null,
              probability: probability ?? null,
              description: description ?? null,
              owner_id: owner_id ?? null,
              status: status ?? null,
              close_date: close_date ?? null,
              lost_reason: lost_reason ?? null,
              won_reason: won_reason ?? null,
              source: source ?? null,
              currency: currency ?? null,
              expected_revenue: expected_revenue ?? null,
              next_step: next_step ?? null,
              tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : null,
            };
            mutation.mutate(payload);
          })}
        >
          <div className="text-xs text-muted-foreground">
            Los campos con * son obligatorios.
          </div>

          <div className="text-sm font-semibold text-muted-foreground">Datos básicos</div>
          <div className="grid gap-2">
            <label className="font-medium">Nombre *</label>
            <Input
              {...form.register("name")}
              autoFocus
              placeholder="Ej: Renovación contrato ACME"
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && <span className="text-xs text-red-500">{form.formState.errors.name.message}</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="font-medium">Email *</label>
              <Input
                {...form.register("email")}
                placeholder="cliente@email.com"
                aria-invalid={!!form.formState.errors.email}
              />
              {form.formState.errors.email && (
                <span className="text-xs text-red-500">{form.formState.errors.email.message}</span>
              )}
            </div>
            <div>
              <label className="font-medium">Teléfono *</label>
              <Input
                {...form.register("phone")}
                placeholder="Ej: +54 9 11 1234-5678"
                aria-invalid={!!form.formState.errors.phone}
              />
              {form.formState.errors.phone && (
                <span className="text-xs text-red-500">{form.formState.errors.phone.message}</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium">Pipeline</label>
              <Select
                value={form.watch("pipeline_id") || "__none__"}
                onValueChange={(value) => {
                  if (value === "__none__") {
                    form.setValue("pipeline_id", undefined, { shouldValidate: true });
                    form.setValue("stage", "", { shouldValidate: true });
                    return;
                  }
                  form.setValue("pipeline_id", value, { shouldValidate: true });
                  const pipeline = pipelines.find((p: any) => p.id === value);
                  const nextStage = pipeline?.stages?.[0];
                  if (nextStage) {
                    form.setValue("stage", nextStage, { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger aria-invalid={!!form.formState.errors.pipeline_id}>
                  <SelectValue placeholder="Elegí un pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin pipeline</SelectItem>
                  {pipelines.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Define las etapas disponibles.</p>
            </div>
            <div>
              <label className="font-medium">Etapa</label>
              <Select
                value={form.watch("stage") || ""}
                onValueChange={(value) => form.setValue("stage", value, { shouldValidate: true })}
                disabled={!pipelineStages.length}
              >
                <SelectTrigger aria-invalid={!!form.formState.errors.stage}>
                  <SelectValue placeholder={pipelineStages.length ? "Seleccionar etapa" : "Elegí un pipeline"} />
                </SelectTrigger>
                <SelectContent>
                  {pipelineStages.map((stage: string) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.stage && <span className="text-xs text-red-500">{form.formState.errors.stage.message}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium">Cliente</label>
              <Select
                value={form.watch("customer_id") || "__none__"}
                onValueChange={(value) => {
                  form.setValue("customer_id", value === "__none__" ? undefined : value, { shouldValidate: true });
                  setCustomerQuery("");
                }}
              >
                <SelectTrigger aria-invalid={!!form.formState.errors.customer_id}>
                  <SelectValue placeholder="Elegí un cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin cliente</SelectItem>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.customer_id && <span className="text-xs text-red-500">{form.formState.errors.customer_id.message}</span>}
              <p className="text-xs text-muted-foreground">Si no hay cliente, dejalo en “Sin cliente”.</p>
            </div>
            <div>
              <label className="font-medium">Responsable</label>
              <Select
                value={form.watch("owner_id") || "__none__"}
                onValueChange={(value) =>
                  form.setValue("owner_id", value === "__none__" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Asignar responsable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin responsable</SelectItem>
                  {owners.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {[o.first_name, o.last_name].filter(Boolean).join(" ") || "Sin nombre"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm font-semibold text-muted-foreground">Monto y fechas</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium">Monto</label>
              <Input type="number" step="0.01" {...form.register("value", { valueAsNumber: true })} aria-invalid={!!form.formState.errors.value} />
              {form.formState.errors.value && <span className="text-xs text-red-500">{form.formState.errors.value.message}</span>}
            </div>
            <div>
              <label className="font-medium">Moneda</label>
              <Select
                value={form.watch("currency") || "ARS"}
                onValueChange={(value) => form.setValue("currency", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="BRL">BRL - Real Brasileño</SelectItem>
                  <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                  <SelectItem value="CLP">CLP - Peso Chileno</SelectItem>
                  <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                  <SelectItem value="PEN">PEN - Sol Peruano</SelectItem>
                  <SelectItem value="UYU">UYU - Peso Uruguayo</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium">Cierre estimado *</label>
              <Input type="date" {...form.register("estimated_close_date")} aria-invalid={!!form.formState.errors.estimated_close_date} />
              {form.formState.errors.estimated_close_date && <span className="text-xs text-red-500">{form.formState.errors.estimated_close_date.message}</span>}
            </div>
            <div>
              <label className="font-medium">Probabilidad (%)</label>
              <Input type="number" {...form.register("probability", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="text-sm font-semibold text-muted-foreground">Estado y seguimiento</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium">Estado</label>
              <Select
                value={form.watch("status") || "abierta"}
                onValueChange={(value) => form.setValue("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abierta">Abierta</SelectItem>
                  <SelectItem value="ganado">Ganado</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-medium">Fecha de cierre real</label>
              <Input type="date" {...form.register("close_date")} />
              <p className="text-xs text-muted-foreground">Solo si se ganó o perdió.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium">Fuente</label>
              <Input {...form.register("source")} placeholder="Ej: Referido, Web, Ads" />
            </div>
            <div>
              <label className="font-medium">Ingreso esperado</label>
              <Input type="number" step="0.01" {...form.register("expected_revenue", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="font-medium">Próximo paso</label>
            <Input {...form.register("next_step")} placeholder="Ej: Llamar el martes" />
          </div>
          <div className="grid gap-2">
            <label className="font-medium">Motivo ganado</label>
            <Input {...form.register("won_reason")} placeholder="Opcional" />
            <p className="text-xs text-muted-foreground">Completar solo si se ganó.</p>
          </div>
          <div className="grid gap-2">
            <label className="font-medium">Motivo perdido</label>
            <Input {...form.register("lost_reason")} placeholder="Opcional" />
            <p className="text-xs text-muted-foreground">Completar solo si se perdió.</p>
          </div>
          <div className="grid gap-2">
            <label className="font-medium">Tags (separadas por coma)</label>
            <Input {...form.register("tags")} placeholder="Ej: upsell, prioridad-alta" />
          </div>

          <div className="text-sm font-semibold text-muted-foreground">Notas</div>
          <div className="grid gap-2">
            <label className="font-medium">Notas</label>
            <textarea
              {...form.register("description")}
              className="border rounded px-2 py-1 min-h-[60px]"
              placeholder="Escribí un resumen corto de la oportunidad"
            />
          </div>
          <div className="flex gap-2 items-center mt-2">
            <Button type="button" variant="outline" onClick={handleAIAssist}>AI Assist</Button>
            <Button type="submit" disabled={!form.formState.isValid || mutation.isPending}>
              Crear oportunidad
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
