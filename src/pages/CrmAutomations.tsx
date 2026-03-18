import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Workflow } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type WorkflowRow = Database["public"]["Tables"] extends Record<
  "crm_automation_workflows",
  { Row: infer RowType }
>
  ? RowType
  : {
      id: string;
      company_id: string | null;
      name: string | null;
      description: string | null;
      status: string | null;
      created_at: string | null;
      updated_at: string | null;
    };

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  paused: { label: "Paused", variant: "outline" },
  archived: { label: "Archived", variant: "destructive" },
};

const formatDate = (value?: string | null) => {
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

export default function CrmAutomations() {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createWorkflowMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error("Empresa no seleccionada");

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? null;

      const payload = {
        company_id: currentCompany.id,
        name: "Workflow sin título",
        description: null,
        status: "draft",
        trigger_type: "opportunity_updated",
        trigger_config: { steps: [] },
        is_active: true,
        created_by: userId,
        updated_by: userId,
      };

      const { data, error } = await (supabase as any)
        .from("crm_automation_workflows")
        .insert([payload])
        .select("id")
        .single();

      if (error) throw error;
      return data?.id as string;
    },
    onSuccess: (workflowId) => {
      toast.success("Workflow creado");
      queryClient.invalidateQueries({ queryKey: ["crm-automation-workflows", currentCompany?.id] });
      if (workflowId) {
        navigate(`/crm-automations/${workflowId}`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo crear el workflow");
    },
  });

  const {
    data: workflows = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["crm-automation-workflows", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [] as WorkflowRow[];

      const { data, error } = await (supabase as any)
        .from("crm_automation_workflows")
        .select("id, company_id, name, description, status, created_at, updated_at")
        .eq("company_id", currentCompany.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as WorkflowRow[];
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!currentCompany) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Automatizaciones CRM</h1>
            <p className="text-sm text-muted-foreground">Workflows para opportunities y pipelines</p>
          </div>

          <Button
            onClick={() => createWorkflowMutation.mutate()}
            disabled={createWorkflowMutation.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            {createWorkflowMutation.isPending ? "Creando..." : "Nuevo workflow"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
            <CardDescription>Gestioná reglas automáticas para oportunidades y pipelines.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Cargando workflows...</div>
            ) : isError ? (
              <div className="text-sm text-destructive">
                Error al cargar workflows: {(error as Error)?.message || "Error desconocido"}
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay workflows creados para esta empresa.</div>
            ) : (
              <div className="space-y-3">
                {workflows.map((workflow) => {
                  const statusValue = (workflow.status ?? "").toLowerCase();
                  const config = statusConfig[statusValue] ?? {
                    label: workflow.status || "unknown",
                    variant: "outline" as const,
                  };

                  return (
                    <div
                      key={workflow.id}
                      className="flex cursor-pointer flex-col gap-3 rounded-md border p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                      onClick={() => navigate(`/crm-automations/${workflow.id}`)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Workflow className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{workflow.name || "Sin nombre"}</p>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {workflow.description || "Sin descripción"}
                        </p>
                      </div>

                      <div className="text-xs text-muted-foreground">Actualizado: {formatDate(workflow.updated_at)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
