// ============================================================
// Setup Wizard - Initial Data Step
// ============================================================

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Upload, Package, Users, Zap } from 'lucide-react';
import { InitialDataSetup } from '@/lib/setup/types';

interface InitialDataStepProps {
  data: Partial<InitialDataSetup>;
  onUpdate: (data: Partial<InitialDataSetup>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function InitialDataStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: InitialDataStepProps) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpdate({ importFile: file });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Datos Iniciales
        </h2>
        <p className="text-muted-foreground">
          Carga productos y clientes (opcional - se puede hacer después)
        </p>
      </div>

      <div className="grid gap-4">
        {/* Importar Productos */}
        <Card
          className={`shadow-soft cursor-pointer transition-all ${
            data.importProducts
              ? 'border-primary border-2 bg-primary/5'
              : 'border hover:border-primary/50'
          }`}
          onClick={() => onUpdate({ importProducts: !data.importProducts })}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg mt-1">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Importar Productos</p>
                  <p className="text-sm text-muted-foreground">
                    Carga tu catálogo desde un archivo CSV
                  </p>
                </div>
              </div>
              <Checkbox checked={data.importProducts || false} readOnly className="mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Importar Clientes */}
        <Card
          className={`shadow-soft cursor-pointer transition-all ${
            data.importCustomers
              ? 'border-primary border-2 bg-primary/5'
              : 'border hover:border-primary/50'
          }`}
          onClick={() => onUpdate({ importCustomers: !data.importCustomers })}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg mt-1">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Importar Clientes</p>
                  <p className="text-sm text-muted-foreground">
                    Carga tu listado de clientes desde CSV
                  </p>
                </div>
              </div>
              <Checkbox checked={data.importCustomers || false} readOnly className="mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Cargar Datos de Ejemplo */}
        <Card
          className={`shadow-soft cursor-pointer transition-all ${
            data.importSampleData
              ? 'border-primary border-2 bg-primary/5'
              : 'border hover:border-primary/50'
          }`}
          onClick={() => onUpdate({ importSampleData: !data.importSampleData })}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg mt-1">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Datos de Ejemplo</p>
                  <p className="text-sm text-muted-foreground">
                    Carga productos y clientes de ejemplo para explorar
                  </p>
                </div>
              </div>
              <Checkbox checked={data.importSampleData || false} readOnly className="mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {(data.importProducts || data.importCustomers) && (
        <Card className="shadow-soft bg-blue-500/5 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Cargar Archivo CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-primary/10 file:text-primary
                hover:file:bg-primary/20"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {data.importFile ? `Archivo: ${data.importFile.name}` : 'Selecciona un archivo CSV'}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Consejo:</strong> Puedes saltarte esto y empezar con datos vacíos. Siempre podrás importar después desde cada módulo.
        </p>
      </div>

      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={onPrevious} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>
        <Button onClick={onNext} className="gap-2">
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
