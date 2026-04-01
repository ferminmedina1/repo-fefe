// ============================================================
// Setup Wizard - Payment Methods Step
// ============================================================

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Wallet, CreditCard, Banknote, Check, DollarSign } from 'lucide-react';
import { PaymentMethodSetup } from '@/lib/setup/types';

interface PaymentMethodsStepProps {
  data: Partial<PaymentMethodSetup>;
  onUpdate: (data: Partial<PaymentMethodSetup>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const PAYMENT_METHODS = [
  {
    key: 'cash' as const,
    label: 'Efectivo',
    icon: Wallet,
    description: 'Pagos en efectivo',
  },
  {
    key: 'card' as const,
    label: 'Tarjeta de Crédito/Débito',
    icon: CreditCard,
    description: 'Tarjetas de crédito y débito',
  },
  {
    key: 'transfer' as const,
    label: 'Transferencia Bancaria',
    icon: Banknote,
    description: 'Transferencias y depósitos',
  },
  {
    key: 'check' as const,
    label: 'Cheques',
    icon: Check,
    description: 'Cheques de terceros',
  },
  {
    key: 'credit' as const,
    label: 'Crédito a Cliente',
    icon: DollarSign,
    description: 'Venta a crédito',
  },
];

export function PaymentMethodsStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: PaymentMethodsStepProps) {
  const hasAtLeastOne = Object.values(data).some(v => v === true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Métodos de Pago
        </h2>
        <p className="text-muted-foreground">
          Selecciona los métodos de pago que aceptarás
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PAYMENT_METHODS.map(({ key, label, icon: Icon, description }) => (
          <Card
            key={key}
            className={`shadow-soft cursor-pointer transition-all ${
              data[key]
                ? 'border-primary border-2 bg-primary/5'
                : 'border hover:border-primary/50'
            }`}
            onClick={() => onUpdate({ [key]: !data[key] })}
          >
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg mt-1">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Checkbox checked={data[key] || false} readOnly className="mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Consejo:</strong> Puedes agregar o cambiar estos métodos después desde Configuración → Métodos de Pago
        </p>
      </div>

      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={onPrevious} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>
        <Button onClick={onNext} disabled={!hasAtLeastOne} className="gap-2">
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
