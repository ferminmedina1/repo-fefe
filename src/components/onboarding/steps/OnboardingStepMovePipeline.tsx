// ============================================================
// Step 4: MOVE_PIPELINE — Move a CRM opportunity stage
// Real interaction: creates an opportunity (if none) tied to the
// customer from the previous step and lets user change its stage.
// Uses crm_opportunities table (has 'stage' column).
// ============================================================

import { useState, useEffect } from 'react';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OpportunityRow {
  id: string;
  name: string;
  stage: string;
  customer_id: string | null;
}

const PIPELINE_STAGES = [
  { value: 'lead', label: 'Lead / Prospecto' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'negotiation', label: 'En negociación' },
  { value: 'qualified', label: 'Calificado' },
  { value: 'won', label: 'Ganado' },
];

export function OnboardingStepMovePipeline() {
  const { emitEvent } = useOnboarding();
  const { currentCompany } = useCompany();

  const [opportunity, setOpportunity] = useState<OpportunityRow | null>(null);
  const [newStage, setNewStage] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Load or create an opportunity for the most recent customer
  useEffect(() => {
    if (!currentCompany) return;
    let cancelled = false;

    (async () => {
      setLoadingData(true);
      try {
        // First check if there's already an opportunity
        const { data: existing } = await supabase
          .from('crm_opportunities')
          .select('id, name, stage, customer_id')
          .eq('company_id', currentCompany.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existing && existing.length > 0) {
          if (!cancelled) setOpportunity(existing[0] as OpportunityRow);
          if (!cancelled) setLoadingData(false);
          return;
        }

        // No opportunity yet — grab the latest customer and create one
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name')
          .eq('company_id', currentCompany.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const customer = customers?.[0];
        const oppName = customer
          ? `Oportunidad - ${customer.name}`
          : 'Mi primera oportunidad';

        const { data: newOpp, error } = await supabase
          .from('crm_opportunities')
          .insert({
            company_id: currentCompany.id,
            customer_id: customer?.id ?? null,
            name: oppName,
            stage: 'lead',
            status: 'open',
          })
          .select('id, name, stage, customer_id')
          .single();

        if (error) throw error;
        if (!cancelled) setOpportunity(newOpp as OpportunityRow);
      } catch (e) {
        console.error('[OnboardingStepMovePipeline] Init error:', e);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();

    return () => { cancelled = true; };
  }, [currentCompany]);

  const currentStage = opportunity?.stage || 'lead';
  const canSubmit = opportunity && newStage && newStage !== currentStage;

  const handleSubmit = async () => {
    if (!canSubmit || !currentCompany || !opportunity) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('crm_opportunities')
        .update({ stage: newStage })
        .eq('id', opportunity.id)
        .eq('company_id', currentCompany.id);

      if (error) throw error;

      toast.success('Etapa de oportunidad actualizada');
      emitEvent('lead.stage_changed');
    } catch (e: any) {
      toast.error(e.message || 'Error al cambiar etapa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
          <ArrowRight className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-white">Mové tu oportunidad en el pipeline</h2>
        <p className="text-slate-400 max-w-sm mx-auto">
          Cambiá la etapa de la oportunidad para reflejar en qué punto del proceso de venta se encuentra.
        </p>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-400">Preparando oportunidad...</span>
        </div>
      ) : !opportunity ? (
        <div className="text-center py-8 text-slate-400">
          No se pudo crear la oportunidad. Intentá de nuevo.
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-5 max-w-md mx-auto">
          <div className="space-y-1.5">
            <label className="text-sm text-slate-300 font-medium">Oportunidad</label>
            <p className="text-white font-semibold">{opportunity.name}</p>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg">
              {PIPELINE_STAGES.find((s) => s.value === currentStage)?.label || currentStage}
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <div className="flex-1">
              <Select value={newStage} onValueChange={setNewStage}>
                <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                  <SelectValue placeholder="Nueva etapa" />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.filter((s) => s.value !== currentStage).map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <Button
          size="lg"
          className="h-12 px-8 font-semibold"
          disabled={!canSubmit || saving}
          onClick={handleSubmit}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Actualizando...
            </>
          ) : (
            'Cambiar etapa y continuar'
          )}
        </Button>
      </div>
    </div>
  );
}
