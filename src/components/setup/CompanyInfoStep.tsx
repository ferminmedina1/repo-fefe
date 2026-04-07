// ============================================================
// Setup Wizard - Company Info Step
// ============================================================

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { CompanySetupData } from '@/lib/setup/types';

interface CompanyInfoStepProps {
  data: Partial<CompanySetupData>;
  onUpdate: (data: Partial<CompanySetupData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  error?: string;
}

const INDUSTRIES = [
  'Retail',
  'Manufactura',
  'Servicios',
  'Mayorista',
  'Gastronomía',
  'Farmacia',
  'Electrónica',
  'Ropa y Accesorios',
  'Otros',
];

const COUNTRIES = ['Argentina', 'Uruguay', 'Paraguay', 'Chile', 'Bolivia', 'Otro'];

export function CompanyInfoStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  error,
}: CompanyInfoStepProps) {
  const isComplete = data.name && data.cuit && data.address && data.city;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Información de tu Empresa
        </h2>
        <p className="text-muted-foreground">
          Completa los datos básicos de tu negocio
        </p>
      </div>

      <Card className="shadow-soft">
        <CardContent className="pt-6 space-y-6">
          {error && (
            <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nombre de la Empresa *</Label>
              <Input
                id="name"
                placeholder="ej: Mi Tienda S.A."
                value={data.name || ''}
                onChange={(e) => onUpdate({ name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT *</Label>
              <Input
                id="cuit"
                placeholder="ej: 20-12345678-1"
                value={data.cuit || ''}
                onChange={(e) => onUpdate({ cuit: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Rubro / Industria</Label>
              <Select value={data.industry || ''} onValueChange={(value) => onUpdate({ industry: value })}>
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Selecciona un rubro" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                placeholder="ej: Calle Principal 123"
                value={data.address || ''}
                onChange={(e) => onUpdate({ address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                placeholder="ej: Buenos Aires"
                value={data.city || ''}
                onChange={(e) => onUpdate({ city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Select value={data.country || 'Argentina'} onValueChange={(value) => onUpdate({ country: value })}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Selecciona un país" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                placeholder="ej: +54 11 1234-5678"
                value={data.phone || ''}
                onChange={(e) => onUpdate({ phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ej: contacto@mitienda.com"
                value={data.email || ''}
                onChange={(e) => onUpdate({ email: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={onPrevious} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>
        <Button onClick={onNext} disabled={!isComplete} className="gap-2">
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
