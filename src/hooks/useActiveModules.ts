import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useEffect, useRef } from "react";

// Modulos base que siempre estan activos para todas las empresas
// Sincronizado con platform_modules.is_base_module = true + reports (tratado como base en UI)
export const BASE_MODULES = ["dashboard", "pos", "sales", "products", "customers", "settings", "reports"];

export const useActiveModules = () => {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  // Ref para evitar multiples canales realtime por la misma instancia del hook
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ["activeModules", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) {
        return [...BASE_MODULES];
      }

      const { data, error } = await supabase
        .from("company_modules")
        .select(`
          module_id,
          active,
          platform_modules(code)
        `)
        .eq("company_id", currentCompany.id)
        .eq("active", true);

      if (error) {
        console.error("[useActiveModules] Error:", error);
        throw error;
      }

      const companyModules = data?.map((cm: any) => cm.platform_modules?.code).filter(Boolean) || [];
      return [...new Set([...BASE_MODULES, ...companyModules])];
    },
    enabled: !!currentCompany?.id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!currentCompany?.id) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `active_modules_${currentCompany.id}_${Math.random().toString(36).slice(2, 7)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "company_modules",
          filter: `company_id=eq.${currentCompany.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activeModules", currentCompany.id] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentCompany?.id, queryClient]);

  return query;
};
