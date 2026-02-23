// ============================================================
// Step 3: CREATE_FIRST_LEAD — Create a real customer/contact
// Real interaction: inserts a customer into the DB.
// ============================================================

import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function OnboardingStepCreateLead() {
  const { emitEvent } = useOnboarding();
  const { currentCompany } = useCompany();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = name.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit || !currentCompany) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('customers').insert({
        company_id: currentCompany.id,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
      });

      if (error) throw error;

      toast.success('Contacto creado correctamente');
      emitEvent('lead.created');
    } catch (e: any) {
      toast.error(e.message || 'Error al crear contacto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
          <UserPlus className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-white">Creá tu primer contacto</h2>
        <p className="text-slate-400 max-w-sm mx-auto">
          Registrá un cliente real. Este será tu punto de partida para vender.
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-5 max-w-md mx-auto">
        <div className="space-y-2">
          <Label className="text-slate-300">Nombre *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez"
            className="bg-slate-900/50 border-slate-600 text-white"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Email (opcional)</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan@email.com"
            className="bg-slate-900/50 border-slate-600 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Teléfono (opcional)</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+54 11 1234-5678"
            className="bg-slate-900/50 border-slate-600 text-white"
          />
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
              Creando contacto...
            </>
          ) : (
            'Crear contacto y continuar'
          )}
        </Button>
      </div>
    </div>
  );
}
