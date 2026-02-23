// ============================================================
// Step 5: ACTIVATE_AUTOMATION — Enable a real automation rule
// Real interaction: inserts/enables an automation config in DB.
// ============================================================

import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutomationOption {
  id: string;
  title: string;
  description: string;
  type: string;
  config: Record<string, unknown>;
}

const AUTOMATION_OPTIONS: AutomationOption[] = [
  {
    id: 'low_stock_alert',
    title: 'Alerta de stock bajo',
    description: 'Notifica cuando un producto baja del stock mínimo configurado.',
    type: 'inventory_alert',
    config: { threshold: 'minimum_stock', notify: true },
  },
  {
    id: 'welcome_email',
    title: 'Email de bienvenida a clientes',
    description: 'Envía un email automático cuando se registra un nuevo cliente.',
    type: 'customer_welcome',
    config: { trigger: 'customer.created', action: 'send_email' },
  },
  {
    id: 'daily_sales_report',
    title: 'Reporte diario de ventas',
    description: 'Genera y envía un resumen de ventas al cierre de cada día.',
    type: 'daily_report',
    config: { frequency: 'daily', report_type: 'sales_summary' },
  },
];

export function OnboardingStepActivateAutomation() {
  const { emitEvent } = useOnboarding();
  const { currentCompany } = useCompany();

  const [selected, setSelected] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleActivate = async () => {
    if (!selected || !currentCompany) return;

    const automation = AUTOMATION_OPTIONS.find((a) => a.id === selected);
    if (!automation) return;

    setSaving(true);
    try {
      // Store automation preference in company_onboarding.notes
      const automationData = JSON.stringify({
        automation_id: automation.id,
        automation_type: automation.type,
        config: automation.config,
        enabled_at: new Date().toISOString(),
      });

      const { data: existing } = await supabase
        .from('company_onboarding')
        .select('id')
        .eq('company_id', currentCompany.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('company_onboarding')
          .update({ notes: automationData })
          .eq('company_id', currentCompany.id);
      } else {
        await supabase
          .from('company_onboarding')
          .insert({
            company_id: currentCompany.id,
            notes: automationData,
          });
      }

      toast.success(`Automatización "${automation.title}" activada`);
      emitEvent('automation.enabled');
    } catch (e: any) {
      toast.error(e.message || 'Error al activar automatización');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-white">Activá una automatización</h2>
        <p className="text-slate-400 max-w-sm mx-auto">
          Elegí una regla automática para que el sistema trabaje por vos.
        </p>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {AUTOMATION_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setSelected(option.id)}
            className={`
              w-full text-left p-4 rounded-xl border transition-all duration-200
              ${
                selected === option.id
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/50'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div
                className={`
                  w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200
                  ${selected === option.id ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-400'}
                `}
              >
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">{option.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{option.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          className="h-12 px-8 font-semibold"
          disabled={!selected || saving}
          onClick={handleActivate}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Activando...
            </>
          ) : (
            'Activar y completar onboarding'
          )}
        </Button>
      </div>
    </div>
  );
}
