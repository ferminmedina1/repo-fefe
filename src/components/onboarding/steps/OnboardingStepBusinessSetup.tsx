// ============================================================
// Step 2: BUSINESS_SETUP — Configure company basics
// Real interaction: updates company name/niche/currency in DB.
// ============================================================

import { useState, useEffect } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CURRENCY_OPTIONS = [
  { value: 'ARS', label: 'Peso Argentino (ARS)' },
  { value: 'USD', label: 'Dólar Estadounidense (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'BRL', label: 'Real Brasileño (BRL)' },
  { value: 'CLP', label: 'Peso Chileno (CLP)' },
  { value: 'UYU', label: 'Peso Uruguayo (UYU)' },
];

const NICHE_OPTIONS = [
  { value: 'retail', label: 'Retail / Comercio' },
  { value: 'gastro', label: 'Gastronomía' },
  { value: 'services', label: 'Servicios profesionales' },
  { value: 'distribution', label: 'Distribución / Mayorista' },
];

export function OnboardingStepBusinessSetup() {
  const { emitEvent } = useOnboarding();
  const { currentCompany, refreshCompanies } = useCompany();

  const [companyName, setCompanyName] = useState(currentCompany?.name ?? '');
  const [niche, setNiche] = useState('');
  const [currency, setCurrency] = useState(currentCompany?.currency ?? 'ARS');
  const [saving, setSaving] = useState(false);

  // Fetch business_niche from DB (not in the Company interface)
  useEffect(() => {
    if (!currentCompany) return;
    supabase
      .from('companies')
      .select('business_niche')
      .eq('id', currentCompany.id)
      .single()
      .then(({ data }) => {
        if (data?.business_niche) setNiche(data.business_niche);
      });
  }, [currentCompany]);

  const canSubmit = companyName.trim().length >= 2 && niche && currency;

  const handleSubmit = async () => {
    if (!canSubmit || !currentCompany) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyName.trim(),
          business_niche: niche,
          currency,
        })
        .eq('id', currentCompany.id);

      if (error) throw error;

      await refreshCompanies();
      toast.success('Datos de empresa actualizados');
      emitEvent('onboarding.business_configured');
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-white">Configurá tu negocio</h2>
        <p className="text-slate-400 max-w-sm mx-auto">
          Estos datos se usarán en facturas, reportes y todo el sistema.
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-5 max-w-md mx-auto">
        <div className="space-y-2">
          <Label className="text-slate-300">Nombre de la empresa</Label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Mi Empresa S.A."
            className="bg-slate-900/50 border-slate-600 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Rubro</Label>
          <Select value={niche} onValueChange={setNiche}>
            <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
              <SelectValue placeholder="Seleccioná tu rubro" />
            </SelectTrigger>
            <SelectContent>
              {NICHE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Moneda principal</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
              Guardando...
            </>
          ) : (
            'Guardar y continuar'
          )}
        </Button>
      </div>
    </div>
  );
}
