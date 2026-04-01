import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, Eye } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAllianceMarketConsent, type DataConsentPreferences } from '@/hooks/useAllianceMarketConsent';

interface DataConsentCategory {
  key: keyof DataConsentPreferences;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
}

const DATA_CATEGORIES: DataConsentCategory[] = [
  {
    key: 'customerData',
    title: '👥 Datos de Clientes',
    description: 'Análisis de base de clientes y patrones de negocio',
    icon: <Eye className="h-5 w-5" />,
    details: [
      'Información de clientes activos y potenciales',
      'Historial de transacciones y frecuencia',
      'Segmentación de clientes por valor y actividad',
      'Identificación de patrones de comportamiento',
    ],
  },
  {
    key: 'productData',
    title: '📦 Análisis de Productos',
    description: 'Evaluación de línea de productos y rendimiento',
    icon: <Eye className="h-5 w-5" />,
    details: [
      'Catálogo de productos y características',
      'Volúmenes de venta por producto',
      'Márgenes de ganancia y rentabilidad',
      'Tendencias de demanda por categoría',
    ],
  },
  {
    key: 'geographicData',
    title: '🌍 Cobertura Geográfica',
    description: 'Análisis de distribución y alcance territorial',
    icon: <Eye className="h-5 w-5" />,
    details: [
      'Ubicaciones de operación y presencia',
      'Cobertura regional y expansión potencial',
      'Datos de clientes por zona geográfica',
      'Identificación de oportunidades territoriales',
    ],
  },
  {
    key: 'segmentationData',
    title: '📊 Segmentación de Mercado',
    description: 'Análisis de segmentos de mercado y nichos',
    icon: <Eye className="h-5 w-5" />,
    details: [
      'Identificación de segmentos de mercado',
      'Análisis competitivo por segmento',
      'Tendencias de mercado por industria',
      'Recomendaciones de segmentación',
    ],
  },
  {
    key: 'performanceMetrics',
    title: '📈 Métricas de Rendimiento',
    description: 'Análisis de KPIs y métricas de negocio',
    icon: <Eye className="h-5 w-5" />,
    details: [
      'Tasas de crecimiento y rentabilidad',
      'Métricas de eficiencia operacional',
      'Benchmarking contra industria',
      'Indicadores de salud del negocio',
    ],
  },
];

interface AllianceMarketDataConsentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllianceMarketDataConsent({ open, onOpenChange }: AllianceMarketDataConsentProps) {
  const { currentCompany } = useCompany();
  const { savePreferences } = useAllianceMarketConsent();
  
  const [tempPreferences, setTempPreferences] = useState<DataConsentPreferences>({
    customerData: true,
    productData: true,
    geographicData: true,
    segmentationData: true,
    performanceMetrics: true,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckboxChange = (key: keyof DataConsentPreferences) => {
    setTempPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(tempPreferences).every((v) => v === true);
    const newPreferences: DataConsentPreferences = {
      customerData: !allSelected,
      productData: !allSelected,
      geographicData: !allSelected,
      segmentationData: !allSelected,
      performanceMetrics: !allSelected,
    };
    setTempPreferences(newPreferences);
  };

  const handleSavePreferences = async () => {
    setIsSubmitting(true);
    try {
      await savePreferences(tempPreferences);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allSelected = Object.values(tempPreferences).every((v) => v === true);
  const selectedCount = Object.values(tempPreferences).filter((v) => v === true).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            <DialogTitle>Privacidad de Datos - Alliance Market IA</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed">
            Para que la inteligencia artificial del Mercado de Alianzas te brinde recomendaciones personalizadas y precisas,
            necesitamos analizar datos de tu negocio. Tu decides qué información permitir que utilicemos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Privacy Notice */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm text-blue-900">Tus datos están seguros</p>
                  <p className="text-sm text-blue-800">
                    Los datos se procesan de forma confidencial usando máquinas de tu empresa. 
                    No se comparten con terceros ni se usan para entrenar modelos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Select/Deselect All */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="font-semibold text-sm cursor-pointer">
                Permitir todos ({selectedCount}/5)
              </Label>
            </div>
          </div>

          {/* Data Categories */}
          <div className="space-y-3">
            {DATA_CATEGORIES.map((category) => (
              <Card key={category.key} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{category.icon}</div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{category.title}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {category.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Checkbox
                      checked={tempPreferences[category.key]}
                      onCheckedChange={() => handleCheckboxChange(category.key)}
                      className="flex-shrink-0"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {category.details.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Note */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">Nota:</span> Cuanto más datos permitas, mejores serán las recomendaciones de la IA. 
              Puedes cambiar estas preferencias en cualquier momento desde los ajustes de Alliance Market.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSavePreferences}
            disabled={isSubmitting || selectedCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? 'Guardando...' : `Guardar Preferencias (${selectedCount}/5)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
